// The "Advancement made!" toast, a floating block at the panes' top right.
// An agent that finishes gives one (and a level: shared "mc.level"); one that
// needs you gives a creeper warning. Click goes to the agent. Hidden (renders
// nothing) between toasts.
// Sounds: Herdr itself plays settings.json's done/blocked sounds when you
// aren't looking; an agent finishing while you look gets the XP orb here.

import { div } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { agents, run, shared, setShared, playSound } from "herdr";
import { A, C, ico, mcText, flat } from "./kit.js";

const SHOW = 5000;

export default class Advancement {
  init() {
    this.prev = null;
    this.queue = [];
  }

  watch(cx) {
    const now = new Map(agents().map((a) => [a.address, a]));
    if (this.prev === null) {
      this.prev = new Map([...now].map(([k, a]) => [k, a.status]));
      return;
    }
    const events = [];
    for (const [addr, a] of now) {
      const was = this.prev.get(addr);
      if (was === a.status) continue;
      if (was === "working" && (a.status === "done" || a.status === "idle")) events.push({ kind: "done", a, quiet: a.status === "done" });
      else if (a.status === "blocked" && was !== undefined) events.push({ kind: "blocked", a });
    }
    this.prev = new Map([...now].map(([k, a]) => [k, a.status]));
    if (!events.length) return;
    const done = events.filter((e) => e.kind === "done");
    // Side effects after this render.
    cx.timer.after(0, () => {
      if (done.length) setShared("mc.level", Number(shared("mc.level") ?? 0) + done.length);
      // "done" already rang Herdr's sound; idle (finished while looked at) didn't.
      if (done.some((e) => !e.quiet)) playSound(`${A}/sounds/xp.mp3`);
    });
    for (const e of events) {
      const key = `${e.kind}-${e.a.address}-${Date.now()}`;
      this.queue.push({ ...e, key });
      cx.timer.after(SHOW, (cx) => {
        this.queue = this.queue.filter((q) => q.key !== key);
        cx.notify();
      });
    }
    this.queue = this.queue.slice(-3);
  }

  card(e) {
    const a = e.a;
    const who = a.program?.name ?? a.app ?? "Agent";
    const where = a.tab_name && !/^\d+$/.test(a.tab_name) ? `${a.space_name} · ${a.tab_name}` : a.space_name;
    const done = e.kind === "done";
    return h_flex()
      .id(`adv-${e.key}`)
      .w(300)
      .h(56)
      .px(10)
      .gap(10)
      .items_center()
      .bg("#212121")
      .border(2)
      .border_color("#000000")
      .cursor_pointer()
      .hover((s) => s.bg("#2c2c2c"))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => {
        run("pane.focus", { pane: a.pane });
        this.queue = this.queue.filter((q) => q.key !== e.key);
        cx.notify();
      })
      .child(div().size(36).flex_none().flex().items_center().justify_center().bg("#00000060").border(1).border_color(C.black).child(ico(done ? "diamond" : "creeper", done ? 28 : 24)))
      .child(
        v_flex()
          .flex_1()
          .min_w(0)
          .gap(3)
          .text_size(13)
          .child(mcText(done ? "Advancement Made!" : "Creeper? Aw man!", done ? C.yellow : C.red, 1))
          .child(div().truncate().text_color(C.white).child(done ? `${who} finished · ${where}` : `${who} needs you · ${where}`)),
      );
  }

  render(cx) {
    this.watch(cx);
    if (!this.queue.length) return div();
    return v_flex().gap(4).bg("#000000").children(this.queue.map((e) => this.card(e)));
  }
}
