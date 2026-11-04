// A few mobs in the cats' world, never more than two at once. One may spawn
// every 15 s and stays one to two minutes, then fades out.
//   Overworld   chicken, pig, sheep by day; zombie, creeper at night or in
//               thunder (and they leave when that ends)
//   Nether      zombified piglin, ghast (floats)
//   End         enderman (teleports now and then)
// Creepers keep away from the cats, as in the game. Hover: the mob's name;
// click: a poof and an XP orb.

import { div } from "gpui-kit";
import { playSound } from "herdr";
import { A, C, ico } from "./kit.js";

const KINDS = {
  chicken: { name: "Chicken", w: 12, h: 11, s: 2, speed: 22 },
  pig: { name: "Pig", w: 20, h: 9, s: 2, speed: 18 },
  sheep: { name: "Sheep", w: 20, h: 9, s: 2, speed: 16 },
  zombie: { name: "Zombie", w: 14, h: 17, s: 2, speed: 16 },
  creeper: { name: "Creeper", w: 8, h: 18, s: 2, speed: 20, flees: true },
  piglin: { name: "Zombified Piglin", w: 14, h: 17, s: 2, speed: 16 },
  ghast: { name: "Ghast", w: 16, h: 18, s: 3, speed: 14, fly: true },
  enderman: { name: "Enderman", w: 8, h: 30, s: 2, speed: 20, teleports: true },
};

const MAX = 2;
const rand = (a, b) => a + Math.random() * (b - a);
const any = (list) => list[Math.floor(Math.random() * list.length)];

export default class Mobs {
  /** world: the scene (pets.js): its width, dimension, weather, cats and ground. */
  constructor(world) {
    this.world = world;
    this.list = [];
    this.seq = 0;
  }

  start(cx) {
    cx.timer.after(6000, (cx) => this.tick(cx));
    cx.timer.every(15000, (cx) => this.tick(cx));
  }

  pool() {
    const w = this.world;
    if (w.dim === "nether") return ["piglin", "ghast"];
    if (w.dim === "end") return ["enderman"];
    return w.hostile() ? ["zombie", "creeper"] : ["chicken", "pig", "sheep"];
  }

  size(m) {
    const K = KINDS[m.kind];
    return { w: K.w * K.s, h: K.h * K.s };
  }

  tick(cx) {
    const pool = this.pool();
    const now = Date.now();
    for (const m of this.list) if (!m.gone && (now > m.until || !pool.includes(m.kind))) this.despawn(m, cx);
    if (this.list.filter((m) => !m.gone).length < MAX && Math.random() < 0.5) this.spawn(cx, any(pool));
  }

  /** Everyone leaves at once (a trip through a portal). */
  clear() {
    this.list = [];
  }

  spawn(cx, kind) {
    const K = KINDS[kind];
    const max = Math.max(0, this.world.width - K.w * K.s);
    // Not on top of a cat.
    let x = rand(0, max);
    for (let i = 0; i < 6 && this.world.cats.some((c) => Math.abs(c.x - x) < 70); i++) x = rand(0, max);
    const m = { id: ++this.seq, kind, x: Math.round(x), dir: Math.random() < 0.5 ? 1 : -1, ms: 0, walking: false, shown: false, gone: false, until: Date.now() + rand(60, 120) * 1000, gen: 0 };
    this.list.push(m);
    cx.notify();
    // Fade in: drawn hidden once, then shown.
    cx.timer.after(50, (cx) => {
      m.shown = true;
      cx.notify();
    });
    cx.timer.after(rand(1500, 3500), (cx) => this.decide(m, cx));
  }

  despawn(m, cx, poof = false) {
    if (m.gone) return;
    m.gone = true;
    m.poof = poof;
    m.gen++;
    cx.notify();
    cx.timer.after(700, (cx) => {
      this.list = this.list.filter((x) => x !== m);
      cx.notify();
    });
  }

  walk(m, to, speed) {
    const { w } = this.size(m);
    to = Math.round(Math.min(Math.max(0, this.world.width - w), Math.max(0, to)));
    const dist = Math.abs(to - m.x);
    if (dist < 8) return 0;
    m.dir = to > m.x ? 1 : -1;
    m.ms = Math.round((dist / speed) * 1000);
    m.x = to;
    m.walking = true;
    return m.ms;
  }

  decide(m, cx) {
    if (m.gone) return;
    const gen = ++m.gen;
    const next = (ms, then) =>
      cx.timer.after(ms, (cx) => {
        if (m.gen !== gen || m.gone) return;
        if (then) then(cx);
        else this.decide(m, cx);
      });
    const K = KINDS[m.kind];
    const stop = (cx) => {
      m.walking = false;
      cx.notify();
      next(rand(2000, 6000));
    };
    // Creepers don't like cats.
    if (K.flees) {
      const cat = this.world.cats.filter((c) => !c.inside).sort((a, b) => Math.abs(a.x - m.x) - Math.abs(b.x - m.x))[0];
      if (cat && Math.abs(cat.x - m.x) < 120) {
        const ms = this.walk(m, m.x + (m.x >= cat.x ? 1 : -1) * 180, K.speed * 2.5);
        cx.notify();
        return next(ms || 1500, stop);
      }
    }
    if (K.teleports && Math.random() < 0.25) {
      m.shown = false;
      cx.notify();
      return next(300, (cx) => {
        const { w } = this.size(m);
        m.ms = 0;
        m.walking = false;
        m.x = Math.round(rand(0, Math.max(0, this.world.width - w)));
        m.dir = Math.random() < 0.5 ? 1 : -1;
        m.shown = true;
        cx.notify();
        next(rand(3000, 7000));
      });
    }
    if (Math.random() < 0.55) {
      const ms = this.walk(m, m.x + rand(-180, 180), K.speed);
      cx.notify();
      if (ms) return next(ms, stop);
    }
    m.walking = false;
    cx.notify();
    next(rand(2500, 7000));
  }

  mob(m, ground) {
    const K = KINDS[m.kind];
    const { w, h } = this.size(m);
    const img = ico(`mob-${m.kind}-${m.dir > 0 ? "r" : "l"}`, w).h(h).absolute().top(0).left(0);
    let el = div()
      .id(`mob-${m.id}`)
      .absolute()
      .left(m.x)
      .w(w)
      .h(h)
      .transition("left", { duration: Math.max(1, m.ms), easing: "linear" })
      .tooltip(K.name)
      .cursor_pointer()
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => {
        playSound(`${A}/sounds/xp.mp3`);
        this.despawn(m, cx, true);
      })
      .child(
        // Fades the mob, not its poof.
        div()
          .absolute()
          .top(0)
          .left(0)
          .size_full()
          .opacity(m.shown && !m.gone ? 1 : 0)
          .transition("opacity", { duration: m.kind === "enderman" ? 200 : 500 })
          .child(m.walking ? img.loop("top", { from: 0, to: -2, period: 380 }) : img),
      );
    el = K.fly ? el.top(18).loop("top", { from: 14, to: 24, period: 3000 }) : el.bottom(ground - 2);
    if (m.gone && m.poof)
      el = el.child(div().absolute().top(h / 2 - 10).left(w / 2 - 8).text_size(18).text_color(C.white).frames(["✶", "*", "·", ""], 140));
    return el;
  }

  render(ground) {
    return this.list.map((m) => this.mob(m, ground));
  }
}
