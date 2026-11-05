// Herdr, Minecraft edition: every custom part of layouts/minecraft.json is
// this one mod, in roles. The layout gives each copy props { role }:
//   brand        the sidebar's title (window drag, splash text)
//   footer       the sidebar's Options / Add server buttons
//   pane         a pane's header: an oak plank sign
//   scene        the bottom of the window: the cats' world (pets.js) with
//                the HUD over it (hud.js: hearts, hunger, XP, hotbar = tabs)
//   advancement  the "Advancement made!" toast (a floating block)
// The sidebar lists are clones of the shipped spaces and agents mods
// (mc-worlds, mc-mobs), reskinned.

import { View, div } from "gpui-kit";
import { props } from "herdr";
import { MC } from "./kit.js";
import { Brand, Footer } from "./chrome.js";
import PaneSign from "./pane.js";
import Hud from "./hud.js";
import Advancement from "./advancement.js";
import Pets from "./pets.js";

// The world behind, the HUD in front: one block, one copy.
class Scene {
  init(p, cx) {
    this.world = new Pets();
    this.world.init(p, cx);
    this.hud = new Hud();
    this.hud.init(p, cx);
  }

  render(cx) {
    return div().relative().size_full().font_family(MC).child(this.world.render(cx)).child(this.hud.render(cx, this.world.describe()));
  }
}

const ROLES = { brand: Brand, footer: Footer, pane: PaneSign, scene: Scene, advancement: Advancement };

export default class Minecraft extends View {
  init(p, cx) {
    const pr = props() ?? p ?? {};
    const R = ROLES[pr.role];
    this.role = R ? new R() : null;
    this.role?.init?.(pr, cx);
  }

  render(cx) {
    if (!this.role) return div().child(`mc: no role "${props()?.role}"`);
    return this.role.render(cx);
  }
}
