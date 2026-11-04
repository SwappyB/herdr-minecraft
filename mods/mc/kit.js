// The mc mod's drawing kit: Minecraft-style GUI colors, bevels, slots,
// buttons, drop-shadowed text and the pixel-art icons in icons/.

import { div, image, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { layout, playSound } from "herdr";

export const A = "mods/mc";

export const C = {
  panel: "#c6c6c6",
  hi: "#ffffff",
  shadow: "#555555",
  black: "#000000",
  slot: "#8b8b8b",
  slotDark: "#373737",
  label: "#3f3f3f",
  white: "#ffffff",
  light: "#e0e0e0",
  gray: "#a8a8a8",
  yellow: "#ffff55",
  gold: "#ffaa00",
  green: "#80ff20",
  red: "#ff5555",
  aqua: "#55ffff",
  button: "#727272",
  buttonHi: "#a9a9a9",
  buttonLo: "#3c3c3c",
  hover: "#7f89c4",
  hud: "#000000a0",
};

/** One of icons/<name>.svg, full color. */
export const ico = (name, size) => image(`${A}/icons/${name}.svg`).w(size).h(size).flex_none();

/** A program's icon (programs.json), or a fallback icon. */
export function programIcon(program, size, fallback = "book") {
  if (!program?.icon) return ico(fallback, size);
  return program.tint ? svg(program.icon).size(size).flex_none().text_color(C.white) : image(program.icon).w(size).h(size).flex_none();
}

const shadowOf = (hex) => {
  const h = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => Math.floor(parseInt(h.slice(i, i + 2), 16) / 4).toString(16).padStart(2, "0"));
  return `#${c.join("")}`;
};

/** Plain text for small sizes: shadows blur them. */
export const flat = (text, color = C.white) => div().flex_none().whitespace_nowrap().text_color(color).child(String(text ?? ""));

/** Text with Minecraft's drop shadow (a quarter-brightness copy, one pixel down-right). */
export function mcText(text, color = C.white, d = 1.5) {
  const s = String(text ?? "");
  return div()
    .relative()
    .flex_none()
    .child(div().absolute().top(d).left(d).whitespace_nowrap().text_color(shadowOf(color)).child(s))
    .child(div().relative().whitespace_nowrap().text_color(color).child(s));
}

/** Two-tone bevel around `content`: tl on top/left, br on bottom/right. */
export function bevel(content, tl, br, w = 2) {
  const inner = div().flex().flex_col().flex_1().min_w(0).min_h(0).border_t(w).border_l(w).border_color(tl).child(content);
  return div().flex().flex_col().min_w(0).min_h(0).border_r(w).border_b(w).border_color(br).child(inner);
}

/** An inventory slot: sunken gray square. */
export function slot(content, size, o = {}) {
  const face = div().flex().flex_1().items_center().justify_center().bg(o.bg ?? C.slot).child(content);
  return bevel(face, C.slotDark, C.hi, 2).w(size).h(size).flex_none();
}

/** A stone menu button with a black outline ("Options...", "Done"). */
export function button(id, content, onClick, o = {}) {
  const text = typeof content === "string" ? mcText(content, o.disabled ? C.gray : C.white) : content;
  const face = h_flex()
    .id(`${id}~face`)
    .flex_1()
    .gap(6)
    .px(o.px ?? 8)
    .items_center()
    .justify_center()
    .bg(o.on ? C.hover : C.button)
    .hover((s) => s.bg(C.hover))
    .child(text);
  let b = div()
    .id(id)
    .flex()
    .flex_col()
    .flex_none()
    .border(2)
    .border_color(C.black)
    .child(bevel(face, C.buttonHi, C.buttonLo, 2).flex_1())
    .on_mouse_down("left", (_e, cx) => cx.stop_propagation());
  if (o.h) b = b.h(o.h);
  if (o.w) b = b.w(o.w);
  if (o.flex) b = b.flex_1();
  if (o.tooltip) b = b.tooltip(o.tooltip);
  if (!o.disabled && onClick)
    b = b.on_click((e, cx) => {
      click();
      onClick(e, cx);
    });
  return b;
}

/** The UI click. */
export function click() {
  playSound(`${A}/sounds/click.mp3`);
}

/** A strip of a wide texture (icons/<name>.svg, `ratio` wide per tall; 128x16 texels: 8) repeated to `width`. */
export function strip(name, height, width = 2600, ratio = 8) {
  const tw = height * ratio;
  const n = Math.ceil(width / tw);
  return h_flex()
    .absolute()
    .top(0)
    .left(0)
    .h(height)
    .children(Array.from({ length: n }, () => image(`${A}/icons/${name}.svg`).w(tw).h(height).flex_none()));
}

export function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

/** The sidebar draws a compact rail below 160 px. */
export const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;
