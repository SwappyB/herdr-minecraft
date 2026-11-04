// A pane's header: an oak plank sign. Light oak when the pane has the
// keyboard, dark oak otherwise. The program sits in a slot; the agent's
// status is an item: a pickaxe while working, a creeper when it needs you,
// a diamond when it finished. Hover for split / zoom / close.

import { div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, home } from "herdr";
import { C, ico, mcText, flat, programIcon, strip } from "./kit.js";

function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

export default class PaneSign {
  init() {
    this.hovered = false;
  }

  tool(id, icon, command, args, tip) {
    return div()
      .id(id)
      .size(22)
      .flex()
      .items_center()
      .justify_center()
      .bg("#00000040")
      .border(1)
      .border_color("#00000080")
      .text_color(C.white)
      .hover((s) => s.bg("#ffffff40"))
      .tooltip(tip)
      .on_click((_e, cx) => {
        cx.stop_propagation();
        run(command, args);
      })
      .child(svg(`mods/pane/${icon}.svg`).size(13));
  }

  render() {
    const p = panes().find((x) => x.pane === props()?.pane);
    if (!p) return div();
    const pane = p.pane;
    const name = p.mod ? p.title || p.mod : ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const st = p.status;
    return h_flex()
      .id(`sign-${pane}`)
      .size_full()
      .relative()
      .overflow_hidden()
      .border_b(2)
      .border_color(C.black)
      .text_size(13)
      .on_hover((h, cx) => {
        this.hovered = h;
        cx.notify();
      })
      .on_click(() => run("pane.focus", { pane }))
      .child(strip(p.focused ? "planks-wide" : "planks-wide-dark", 30))
      .child(div().absolute().top(0).left(0).size_full().bg(p.focused ? "#00000020" : "#00000050"))
      .child(
        h_flex()
          .relative()
          .size_full()
          .px(8)
          .gap(8)
          .items_center()
          .child(div().size(22).flex_none().flex().items_center().justify_center().bg("#00000055").border(1).border_color("#00000099").child(programIcon(p.program, 16)))
          .child(
            h_flex()
              .flex_1()
              .min_w(0)
              .h(22)
              .px(8)
              .gap(10)
              .items_center()
              .bg("#000000b0")
              .overflow_hidden()
              .child(div().flex_none().max_w(260).overflow_hidden().child(mcText(name, C.white, 1)))
              .child(div().flex_1().min_w(0).truncate().text_color(p.focused ? C.yellow : C.light).child(folder(p.cwd))),
          )
          .when(st === "working", (el) => el.child(ico("pickaxe", 18).loop("opacity", { from: 0.35, to: 1, period: 700 })))
          .when(st === "blocked", (el) =>
            el.child(h_flex().gap(5).items_center().px(6).h(22).bg("#000000c0").child(ico("creeper", 14)).child(flat("Needs you!", C.red))),
          )
          .when(st === "done", (el) => el.child(ico("diamond", 18)))
          .when(this.hovered, (el) =>
            el
              .child(this.tool(`s-r-${pane}`, "split-right", "pane.split", { direction: "right", pane }, "Split right"))
              .child(this.tool(`s-d-${pane}`, "split-down", "pane.split", { direction: "down", pane }, "Split down"))
              .child(this.tool(`s-z-${pane}`, p.zoomed ? "unzoom" : "zoom", "pane.zoom", { pane }, p.zoomed ? "Unzoom" : "Zoom"))
              .child(this.tool(`s-x-${pane}`, "close", "pane.close", { pane }, "Close")),
          ),
      );
  }
}
