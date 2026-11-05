// The sidebar's top (title, splash, search, fold) and bottom (Options, Add server).

import { div, svg } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { run, window, shared, setShared, updates, layout, theme } from "herdr";
import { C, ico, mcText, button, strip, find, narrow } from "./kit.js";

const SPLASHES = [
  "Now with agents!", "Also try tmux!", "100% pixels!", "Craft your code!",
  "Herobrine not included!", "Ctrl+Shift+L to leave!", "Punch trees, ship code!",
  "Mine all the diffs!", "Creeper-free terminals!", "git push --force-fun!",
];

function toggleSidebar() {
  const width = find(layout(), "sidebar")?.size?.px;
  if (!narrow()) setShared("sidebar.width", width);
  setShared("sidebar.collapsed", !narrow());
  run("layout.resize", { id: "sidebar", px: narrow() ? (shared("sidebar.width") ?? 272) : window()?.platform === "macos" ? 76 : 44 });
}

const tool = (id, name, action, tip) =>
  div()
    .id(id)
    .size(22)
    .flex_none()
    .flex()
    .items_center()
    .justify_center()
    .text_color(C.white)
    .hover((s) => s.bg("#ffffff30"))
    .tooltip(tip)
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
    .on_click(action)
    .child(svg(`mods/workspace-chrome/${name}.svg`).size(15));

export class Brand {
  init() {
    this.splash = SPLASHES[Math.floor(Math.random() * SPLASHES.length)];
  }

  render() {
    const w = window();
    const collapsed = narrow();
    const lights = w?.platform === "macos" && !w?.fullscreen;
    return h_flex()
      .size_full()
      .relative()
      .overflow_hidden()
      .border_b(2)
      .border_color(C.black)
      .child(strip("planks-wide-dark", 50))
      .child(
        v_flex()
          .relative()
          .size_full()
          .pr(8)
          .pl(collapsed ? 6 : lights ? 78 : 12)
          .justify_center()
          .gap(2)
          .child(
            h_flex()
              .gap(6)
              .items_center()
              .when(!collapsed, (el) =>
                el.child(h_flex().flex_1().min_w(0).gap(6).items_center().text_size(15).font_weight(700).child(ico("grass", 16)).child(mcText("HERDR", C.white, 2))),
              )
              .when(!collapsed, (el) => el.child(tool("search", "search", () => run("mod.open", { name: "picker" }), "Search")))
              .when(!(collapsed && lights), (el) => el.child(tool("sidebar-toggle", "sidebar", toggleSidebar, "Fold the inventory"))),
          )
          .when(!collapsed, (el) =>
            el.child(div().min_w(0).overflow_hidden().text_size(12).loop("opacity", { from: 0.6, to: 1, period: 900 }).child(mcText(this.splash, C.yellow, 1))),
          ),
      );
  }
}

export class Footer {
  render() {
    const collapsed = narrow();
    const ready = Boolean(updates()?.app?.ready);
    return h_flex()
      .size_full()
      .px(6)
      .gap(6)
      .items_center()
      .bg(theme().chrome)
      .border_t(2)
      .border_color(theme().border)
      .text_size(13)
      .child(button("options", collapsed ? "⚙" : ready ? "Options… ●" : "Options…", () => run("app.settings"), { h: 30, flex: true, tooltip: ready ? "Settings · an update is ready" : "Settings" }))
      .when(!collapsed, (el) => el.child(button("servers", "Add server", () => run("mod.open", { name: "machine-add" }), { h: 30, flex: true, tooltip: "Add a machine" })));
  }
}
