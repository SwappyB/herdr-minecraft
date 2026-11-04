// The HUD, laid over the cats' world as in the game:
//   top left    F3 debug lines: world (space, dimension, weather), biome
//               (branch), agents
//   bottom      the held item's name (the shown tab), hearts and hunger, the
//               XP bar and level, and the hotbar: one slot per tab
//   top right   Files / Changes (the side panel) and the command palette
// Hearts: two are lost per agent that needs you. Hunger: one drumstick is
// eaten per agent working. Level: agents finished (mc.level, set by the
// advancement toast); the bar fills as agents go idle.
// Hotbar: click selects, double-click renames, right-click is the tab menu,
// drag reorders, the scroll wheel cycles (as in the game), + adds a tab.

import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { spaces, panes, agents, run, openOverlay, shared, layout, keys, window } from "herdr";
import { C, ico, mcText, flat, programIcon, button, find, click } from "./kit.js";

const SLOT = 44;

export default class Hud {
  init() {
    this.pressed = null;
    this.panels = JSON.parse(localStorage.getItem("panels") ?? "{}");
    this.held = null;
    this.fade = false;
  }

  // The side panel is remembered per space (as the shipped tab bar does):
  // switching shows that space's choice, opening or closing records it.
  syncPanel(space, panel, body, enabled) {
    if (!space || !panel) return;
    const now = panel.hidden ? null : body?.active ?? null;
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id;
      this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null,
          want = enabled.includes(stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) {
            run("layout.select", { stack: "panel-body", child: want });
            run("layout.show", { id: "panel" });
          } else run("layout.hide", { id: "panel" });
          return;
        }
      }
    }
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("panels", JSON.stringify(this.panels));
  }

  paletteKey() {
    const mac = window()?.platform === "macos";
    const mod = { cmd: mac ? "⌘" : "Ctrl+", ctrl: mac ? "⌃" : "Ctrl+", shift: mac ? "⇧" : "Shift+", alt: mac ? "⌥" : "Alt+", option: mac ? "⌥" : "Alt+" };
    const b = keys().find((k) => k.section === "global" && k.action === "app.palette");
    const parts = b && b.keys.endsWith("--") ? [...b.keys.slice(0, -2).split("-"), "-"] : b?.keys.split("-");
    return parts ? parts.map((p) => mod[p.toLowerCase()] ?? p.toUpperCase()).join("") : null;
  }

  tabName(c) {
    const program = panes().find((p) => p.tab === c.id && p.program?.agent)?.program ?? panes().find((p) => p.tab === c.id)?.program;
    return { program, name: /^tb\d+$/.test(c.name) || !c.named ? program?.name ?? c.name : c.name };
  }

  slot(space, c, i) {
    const { program, name } = this.tabName(c);
    const on = c.active;
    const tint = c.status === "blocked" ? "#8b2a2a" : on ? "#00000030" : "#00000000";
    return div()
      .id(`slot-${c.id}`)
      .relative()
      .w(SLOT)
      .h(SLOT)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .bg(tint)
      .border(on ? 3 : 0)
      .border_color(on ? "#f0f0f0" : C.black)
      .hover((s) => s.bg("#ffffff28"))
      .tooltip(c.zoomed ? `${name} (zoomed)` : name)
      .when(this.pressed === i, (el) => el.opacity(0.5))
      .on_mouse_down("left", (e, cx) => {
        cx.stop_propagation();
        this.pressed = i;
        if (e.click_count === 2) run("tab.rename", { id: c.id });
      })
      .on_mouse_up("left", () => {
        const from = this.pressed;
        this.pressed = null;
        if (from !== null && from !== i) run("tab.move", { id: space.tabs[from].id, index: i + 1 });
        else if (!on) {
          click();
          run("tab.select", { id: c.id });
        }
      })
      .on_mouse_down("right", (_e, cx) => {
        cx.stop_propagation();
        openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } });
      })
      .child(programIcon(program, 26, "book"))
      .when(c.panes > 1, (el) => el.child(div().absolute().bottom(1).right(3).text_size(12).child(mcText(String(c.panes), C.white))))
      .when(c.status === "working", (el) => el.child(ico("pickaxe", 16).absolute().top(1).left(1).loop("opacity", { from: 0.3, to: 1, period: 700 })))
      .when(c.status === "done", (el) => el.child(ico("diamond", 16).absolute().top(1).left(1)))
      .when(c.status === "blocked", (el) => el.child(ico("tnt", 14).absolute().top(2).left(2).loop("opacity", { from: 0.4, to: 1, period: 500 })));
  }

  hotbar(space) {
    const tabs = space?.tabs ?? [];
    const plus = div()
      .id("slot-new")
      .w(SLOT)
      .h(SLOT)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .hover((s) => s.bg("#ffffff28"))
      .tooltip("New tab")
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(() => {
        click();
        openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 });
      })
      .child(ico("plus", 22).opacity(0.85));
    return h_flex()
      .id("hotbar")
      .flex_none()
      .p(2)
      .gap(2)
      .bg("#000000b0")
      .border(2)
      .border_color("#5a5a5a")
      .on_mouse_up("left", () => {
        this.pressed = null;
      })
      .on_scroll_wheel((e) => {
        if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next");
      })
      .children(tabs.map((c, i) => this.slot(space, c, i)))
      .child(plus);
  }

  icons(full, half, empty, filled, n = 10, flip = false) {
    const list = Array.from({ length: n }, (_, i) => {
      const v = filled - i * 2;
      return ico(v >= 2 ? full : v === 1 ? half : empty, 18);
    });
    return h_flex().gap(0).children(flip ? list.reverse() : list);
  }

  render(cx, place) {
    const space = spaces().find((s) => s.active);
    const list = agents();
    const blocked = list.filter((a) => a.status === "blocked").length;
    const working = list.filter((a) => a.status === "working").length;
    const calm = list.filter((a) => a.status === "idle" || a.status === "done").length;
    const level = Number(shared("mc.level") ?? 0);
    const xp = list.length ? calm / list.length : 0;

    // The held item's name shows, then fades, as in the game.
    const active = space?.tabs?.find((c) => c.active);
    const heldKey = active ? `${space.id}/${active.id}/${active.name}` : null;
    if (heldKey !== this.held) {
      this.held = heldKey;
      this.fade = false;
      const key = heldKey;
      cx.timer.after(2200, (cx) => {
        if (this.held === key) {
          this.fade = true;
          cx.notify();
        }
      });
    }
    const heldName = active ? this.tabName(active).name : "";

    const root = layout();
    const panel = find(root, "panel"),
      body = find(root, "panel-body");
    const enabled = shared("workspace.panels") ?? ["files", "changes"];
    this.syncPanel(space, panel, body, enabled);
    const panelButton = (id, label) => {
      const on = panel && !panel.hidden && body?.active === id;
      return button(
        `panel-${id}`,
        label,
        () => {
          if (on) run("layout.hide", { id: "panel" });
          else {
            run("layout.select", { stack: "panel-body", child: id });
            run("layout.show", { id: "panel" });
          }
        },
        { h: 30, on },
      );
    };

    const f3 = (text, color = C.white) => div().flex_none().px(4).py(1).bg("#000000b0").child(flat(text, color));
    const biome = space?.branch ?? (space?.machine ? `remote · ${space.machine}` : "Plains");
    const pk = this.paletteKey();
    const w = window();

    const center = v_flex()
      .flex_none()
      .min_w(404)
      .items_center()
      .child(
        div()
          .h(16)
          .text_size(13)
          .opacity(this.fade ? 0 : 1)
          .transition("opacity", { duration: 600 })
          .child(mcText(heldName, C.white)),
      )
      .child(
        h_flex()
          .w(404)
          .h(18)
          .justify_between()
          .child(
            this.icons("heart", "heart-half", "heart-empty", Math.max(0, 20 - blocked * 4))
              .when(blocked > 0, (el) => el.loop("opacity", { from: 0.45, to: 1, period: 600 })),
          )
          .child(this.icons("drumstick", "drumstick-empty", "drumstick-empty", Math.max(0, 20 - working * 2), 10, true)),
      )
      .child(
        div()
          .relative()
          .w(404)
          .h(14)
          .flex()
          .items_center()
          .child(
            div()
              .w_full()
              .h(7)
              .bg("#1d2b10")
              .border(1)
              .border_color(C.black)
              .child(div().h_full().w(Math.round(400 * xp)).bg(C.green).transition("width", { duration: 400 })),
          )
          .child(
            h_flex()
              .absolute()
              .top(-3)
              .left(0)
              .w_full()
              .justify_center()
              .text_size(13)
              .font_weight(700)
              .child(mcText(String(level), C.green, 1.5)),
          ),
      )
      .child(div().h(2))
      .child(this.hotbar(space));

    // Laid over the world scene: F3 top left, buttons top right, the HUD
    // proper bottom center (the cats walk behind the hotbar).
    return div()
      .id("hud")
      .absolute()
      .top(0)
      .left(0)
      .size_full()
      .text_size(12.5)
      .child(
        v_flex()
          .absolute()
          .top(6)
          .left(6)
          .items_start()
          .gap(1)
          .child(f3(`World: ${space?.name ?? "—"} · ${place ?? "Overworld"}`))
          .child(f3(`Biome: ${biome}`))
          .child(f3(`Agents: ${list.length}  working ${working}  idle ${calm}`, C.light))
          .when(blocked > 0, (el) => el.child(f3(`! ${blocked} hostile: needs you`, C.red))),
      )
      .child(
        h_flex()
          .absolute()
          .top(6)
          .right(6)
          .gap(6)
          .items_center()
          .text_size(13)
          .when(enabled.includes("files"), (el) => el.child(panelButton("files", "Files")))
          .when(enabled.includes("changes"), (el) => el.child(panelButton("changes", "Changes")))
          .child(button("palette", pk ? `${pk}` : "Commands", () => run("app.palette"), { h: 30, tooltip: "Commands" }))
          .when(Boolean(w?.buttons), (el) =>
            el
              .child(button("w-min", "_", () => run("window.minimize"), { h: 30, w: 30, px: 0 }))
              .child(button("w-max", "□", () => run("window.maximize"), { h: 30, w: 30, px: 0 }))
              .child(button("w-close", "x", () => run("window.close"), { h: 30, w: 30, px: 0 })),
          ),
      )
      .child(h_flex().absolute().bottom(4).left(0).w_full().justify_center().child(center));
  }
}
