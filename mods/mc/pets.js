// The cats' world: the scene behind the HUD. Poplu (tuxedo, mostly black)
// and Lizzy (white) live here with their hut.
//   time        night while the system is in dark mode, day otherwise
//   weather     clear / rain / thunder / snow, a new roll every ~5 minutes
//               (thunder: the cats run into the hut)
//   dimension   the Overworld, with a five-minute trip to the Nether or the
//               End about once an hour. A nether portal stands in the
//               Overworld and the Nether (the cats walk through it; click it
//               to travel yourself); the End has an exit portal home.
//   mobs        a few, spawning and despawning (mobs.js)
// The cats wander, sit and nap; a script decision every few seconds, the
// walking is a native `left` transition. Hover: name tag; click: meow and
// hearts. They react to agents: "!" while one needs you, hearts when one
// finishes (mc.level goes up). Rain, snow and ash are `frames` of text, so
// every animation here runs natively.
// Keys or `herdr-app do`: mc.weather (next weather), mc.dimension (travel).

import { div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { agents, shared, settings, playSound, nextCommand } from "herdr";
import { A, C, ico, strip } from "./kit.js";
import Mobs from "./mobs.js";

const W = 44; // cat sprite: 22x14 texels at 2 px
const H = 28;
const GROUND = 14;
const SPEED = 38; // px per second
const HUT_W = 72;
const HUT_H = 60;
const MIN = 60 * 1000;
const PORTAL_W = 36; // 18x26 texels at 2 px
const PORTAL_H = 52;

const CATS = [
  { key: "poplu", name: "Poplu" },
  { key: "lizzy", name: "Lizzy" },
];

const WEATHER = [
  ["clear", 0.45],
  ["rain", 0.25],
  ["thunder", 0.15],
  ["snow", 0.15],
];
const DIM_NAME = { overworld: "Overworld", nether: "The Nether", end: "The End" };

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (table) => {
  let r = Math.random();
  for (const [v, w] of table) if ((r -= w) < 0) return v;
  return table[0][0];
};

// Falling text: `frames` of rows where each column's drop moves down one row
// per frame. Built once per kind.
const PRECIP = {};
function precip(kind) {
  if (PRECIP[kind]) return PRECIP[kind];
  const spec = {
    rain: { ch: "╷", cols: 420, rows: 11, density: 0.22, period: 4 },
    snow: { ch: "*", cols: 420, rows: 11, density: 0.12, period: 6 },
    ash: { ch: "·", cols: 420, rows: 11, density: 0.08, period: 8 },
    end: { ch: "·", cols: 420, rows: 11, density: 0.05, period: 8 },
  }[kind];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const drops = Array.from({ length: spec.cols }, () => (rnd() < spec.density ? Math.floor(rnd() * spec.period) : -1));
  const frames = [];
  for (let k = 0; k < spec.period; k++) {
    const rows = [];
    for (let r = 0; r < spec.rows; r++) {
      let line = "";
      for (let c = 0; c < spec.cols; c++) {
        const p = drops[c];
        line += p >= 0 && (((r - k - p) % spec.period) + spec.period) % spec.period === 0 ? spec.ch : " ";
      }
      rows.push(line);
    }
    frames.push(rows.join("\n"));
  }
  return (PRECIP[kind] = frames);
}

export default class Pets {
  init(_props, cx) {
    this.width = 900;
    this.height = 128;
    this.level = Number(shared("mc.level") ?? 0);
    this.flash = false;
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem("world") ?? "{}");
    } catch {}
    const now = Date.now();
    this.weather = saved.weatherUntil > now ? saved.weather : "clear";
    this.weatherUntil = saved.weatherUntil > now ? saved.weatherUntil : now + rand(4, 6) * MIN;
    this.dim = saved.dimUntil > now ? saved.dim : "overworld";
    this.dimUntil = saved.dimUntil > now ? saved.dimUntil : 0;
    this.nextTrip = saved.nextTrip > now ? saved.nextTrip : now + rand(50, 70) * MIN;
    this.cats = CATS.map((c, i) => ({ ...c, x: 120 + i * 90, dir: i ? -1 : 1, pose: "sit", ms: 0, hearts: 0, hover: false, inside: false }));
    for (const cat of this.cats) cx.timer.after(rand(800, 2500), (cx) => this.decide(cat, cx));
    this.mobs = new Mobs(this);
    this.mobs.start(cx);
    // The world's clock: weather and trips, checked every 20 s (no redraw unless something changes).
    cx.timer.every(20000, (cx) => this.tick(cx));
    cx.spawn(async (cx) => {
      for (;;) {
        const c = await nextCommand();
        if (c === "weather") this.setWeather(cx, WEATHER[(WEATHER.findIndex(([w]) => w === this.weather) + 1) % WEATHER.length][0]);
        if (c === "dimension") this.trip(cx, { overworld: "nether", nether: "end", end: "overworld" }[this.dim]);
        cx.notify();
      }
    });
  }

  save() {
    const { weather, weatherUntil, dim, dimUntil, nextTrip } = this;
    try {
      localStorage.setItem("world", JSON.stringify({ weather, weatherUntil, dim, dimUntil, nextTrip }));
    } catch {}
  }

  tick(cx) {
    const now = Date.now();
    if (this.walking) return;
    if (this.dim === "overworld" && now >= this.nextTrip) {
      this.trip(cx, Math.random() < 0.5 ? "nether" : "end");
    } else if (this.dim !== "overworld" && now >= this.dimUntil) {
      this.trip(cx, "overworld");
    } else if (now >= this.weatherUntil) {
      this.setWeather(cx, pick(WEATHER));
    }
  }

  setWeather(cx, w) {
    this.weatherUntil = Date.now() + rand(4, 6) * MIN;
    this.save();
    if (w === this.weather) return;
    this.weather = w;
    if (w !== "thunder") this.letOut();
    else for (const c of this.cats) if (!c.inside) this.decide(c, cx);
    cx.notify();
  }

  // A scheduled trip: through the nether portal the cats walk there first.
  trip(cx, dim) {
    const portal = dim === "nether" || this.dim === "nether";
    if (!portal) return this.travel(cx, dim);
    this.letOut();
    let ms = 0;
    for (const c of this.cats) {
      c.gen = (c.gen ?? 0) + 1; // their own plans wait
      ms = Math.max(ms, this.walk(c, this.portalX()));
    }
    this.walking = true;
    cx.notify();
    cx.timer.after(ms + 300, (cx) => {
      this.walking = false;
      this.travel(cx, dim);
    });
  }

  // A portal flash, then the other dimension; the cats arrive by its portal.
  travel(cx, dim) {
    this.flash = true;
    cx.notify();
    cx.timer.after(700, (cx) => {
      const now = Date.now();
      this.dim = dim;
      this.dimUntil = dim === "overworld" ? 0 : now + 5 * MIN;
      if (dim === "overworld") this.nextTrip = now + rand(50, 70) * MIN;
      this.letOut();
      this.mobs.clear();
      this.cats.forEach((c, i) => {
        c.x = Math.min(this.max(), this.portalX() + PORTAL_W + 10 + i * 54);
        c.ms = 0;
        c.dir = 1;
        c.pose = "sit";
        c.gen = (c.gen ?? 0) + 1;
        cx.timer.after(rand(1500, 3000), (cx) => this.decide(c, cx));
      });
      this.flash = false;
      this.save();
      cx.notify();
    });
  }

  letOut() {
    for (const c of this.cats) {
      if (!c.inside) continue;
      c.inside = false;
      c.x = this.door();
      c.ms = 0;
      c.pose = "sit";
    }
  }

  max() {
    return Math.max(0, this.width - W);
  }
  hutX() {
    return Math.max(0, this.width - 190);
  }
  door() {
    return Math.min(this.max(), this.hutX() + 20);
  }
  portalX() {
    return Math.round(Math.max(40, this.width * 0.22));
  }
  hostile() {
    return this.dim === "overworld" && (Boolean(settings()?.dark) || this.weather === "thunder");
  }
  storm() {
    return this.dim === "overworld" && this.weather === "thunder";
  }

  walk(cat, to) {
    to = Math.round(Math.min(this.max(), Math.max(0, to)));
    const dist = Math.abs(to - cat.x);
    if (dist < 8) return 0;
    cat.dir = to > cat.x ? 1 : -1;
    cat.ms = Math.round((dist / SPEED) * 1000);
    cat.x = to;
    cat.pose = "walk";
    return cat.ms;
  }

  decide(cat, cx) {
    // A newer decision (a storm breaking out) cancels the pending ones.
    const gen = (cat.gen = (cat.gen ?? 0) + 1);
    const next = (ms, then) =>
      cx.timer.after(ms, (cx) => {
        if (cat.gen !== gen) return;
        if (then) then(cx);
        else this.decide(cat, cx);
      });
    if (cat.inside) {
      if (!this.storm() && Math.random() < 0.3) {
        cat.inside = false;
        cat.x = this.door();
        cat.ms = 0;
        cat.pose = "sit";
        cx.notify();
      }
      return next(rand(4000, 9000));
    }
    // Thunder: run home, then in.
    if (this.storm()) {
      const ms = this.walk(cat, this.door());
      cx.notify();
      return next(ms + 200, (cx) => {
        if (this.storm()) {
          cat.inside = true;
          cat.pose = "sit";
          cx.notify();
        }
        this.decide(cat, cx);
      });
    }
    const alert = agents().some((a) => a.status === "blocked");
    const night = Boolean(settings()?.dark);
    const r = Math.random();
    const nap = night ? 0.5 : this.weather === "rain" || this.weather === "snow" ? 0.25 : 0.15;
    if (alert) {
      cat.pose = "sit";
      cat.ms = 0;
      cx.notify();
      return next(3000);
    }
    if (night && this.dim === "overworld" && r < 0.12) {
      // Some nights they sleep in.
      const ms = this.walk(cat, this.door());
      cx.notify();
      return next(ms + 200, (cx) => {
        cat.inside = true;
        cat.pose = "sit";
        cx.notify();
        this.decide(cat, cx);
      });
    }
    if (r < nap) {
      cat.pose = "sleep";
      cat.ms = 0;
      cx.notify();
      return next(rand(8000, 20000));
    }
    if (r < nap + 0.35) {
      cat.pose = "sit";
      cat.ms = 0;
      cx.notify();
      return next(rand(2500, 7000));
    }
    const other = this.cats.find((c) => c !== cat && !c.inside);
    const to = other && Math.random() < 0.35 ? other.x + rand(-90, 90) : rand(0, this.max());
    const ms = this.walk(cat, to);
    cx.notify();
    if (!ms) return next(2000);
    next(ms, (cx) => {
      cat.pose = "sit";
      cx.notify();
      next(rand(1200, 3500));
    });
  }

  love(cat, cx, ms = 2500) {
    const t = Date.now() + ms;
    cat.hearts = t;
    if (cat.pose === "sleep") cat.pose = "sit";
    cx.notify();
    cx.timer.after(ms, (cx) => {
      if (cat.hearts === t) {
        cat.hearts = 0;
        cx.notify();
      }
    });
  }

  sprite(cat, dark) {
    // Poplu is outlined where the sky is dark, or she'd vanish.
    const dir = cat.dir > 0 ? "r" : "l";
    const rim = dark && cat.key === "poplu" ? "-rim" : "";
    const img = (pose) => ico(`cat-${cat.key}-${pose}-${dir}${rim}`, W).h(H).absolute().top(0).left(0);
    if (cat.pose !== "walk") return div().relative().w(W).h(H).child(img(cat.pose));
    // Two leg poses swapping (opacity past 0..1 clamps, so the swap is a snap).
    return div()
      .relative()
      .w(W)
      .h(H)
      .child(img("walk-a").loop("opacity", { from: -3, to: 4, period: 360, easing: "linear" }))
      .child(img("walk-b").loop("opacity", { from: 4, to: -3, period: 360, easing: "linear" }));
  }

  cat(cat, alert, dark) {
    const above = (el) => el.absolute().bottom(H + 2);
    const tag = div()
      .absolute()
      .bottom(H + 4)
      .left(-12)
      .w(W + 24)
      .flex()
      .justify_center()
      .child(div().px(5).py(1).bg("#00000090").text_size(13).text_color(C.white).whitespace_nowrap().child(cat.name));
    return div()
      .id(`cat-${cat.key}`)
      .absolute()
      .bottom(GROUND - 2)
      .left(cat.x)
      .w(W)
      .h(H)
      .transition("left", { duration: Math.max(1, cat.ms), easing: "linear" })
      .cursor_pointer()
      .on_hover((h, cx) => {
        cat.hover = h;
        cx.notify();
      })
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => {
        playSound(`${A}/sounds/meow-${cat.key}.mp3`);
        this.love(cat, cx);
      })
      .child(this.sprite(cat, dark))
      .when(cat.hover, (el) => el.child(tag))
      .when(!cat.hover && cat.pose === "sleep", (el) =>
        el.child(above(div()).left(cat.dir > 0 ? W - 14 : 2).text_size(13).text_color(C.white).frames(["z", "zZ", "zZz", ""], 650)),
      )
      .when(!cat.hover && alert && cat.pose !== "sleep", (el) =>
        el.child(above(div()).left(cat.dir > 0 ? W - 8 : 4).text_size(15).font_weight(700).text_color(C.red).frames(["!", ""], 400)),
      )
      .when(Boolean(cat.hearts), (el) =>
        el
          .child(ico("heart", 10).absolute().left(8).top(-4).loop("top", { from: -2, to: -14, period: 1200 }))
          .child(ico("heart", 12).absolute().left(W - 18).top(-6).loop("top", { from: -4, to: -18, period: 1500 })),
      );
  }

  falling(kind, color, ms) {
    return div()
      .absolute()
      .top(0)
      .left(0)
      .size_full()
      .overflow_hidden()
      .child(div().whitespace_nowrap().text_size(12).line_height("12px").text_color(color).frames(precip(kind), ms));
  }

  hut(night) {
    const inside = this.cats.filter((c) => c.inside);
    return div()
      .id("hut")
      .absolute()
      .bottom(GROUND - 2)
      .left(this.hutX())
      .w(HUT_W)
      .h(HUT_H)
      .tooltip(inside.length ? `${inside.map((c) => c.name).join(" and ")} ${inside.length > 1 ? "are" : "is"} inside` : "Poplu and Lizzy's hut")
      .child(ico(night || inside.length ? "hut-night" : "hut-day", HUT_W).h(HUT_H))
      .when(inside.length > 0, (el) =>
        el.child(div().absolute().top(-10).left(HUT_W - 14).text_size(12).text_color("#d0d0d0").frames(["~", " ~", "  ~", ""], 500)),
      );
  }

  portal(dim) {
    const go = (_e, cx) => this.travel(cx, dim === "overworld" ? "nether" : "overworld");
    const base = div()
      .id("portal")
      .absolute()
      .left(this.portalX())
      .cursor_pointer()
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(go);
    if (dim === "end")
      // The End's exit portal: bedrock rim, starry black inside.
      return base
        .bottom(GROUND - 4)
        .w(64)
        .h(12)
        .bg("#2b2b2b")
        .border(2)
        .border_color("#555555")
        .tooltip("Exit portal: back to the Overworld")
        .child(div().size_full().bg("#05030a").text_size(10).text_color("#c48cff").frames(["· ˙ ·", "˙ · ˙"], 700));
    const fill = (n) => ico(`portal-fill-${n}`, 24).h(40).absolute().top(6).left(6);
    return base
      .bottom(GROUND - 2)
      .w(PORTAL_W)
      .h(PORTAL_H)
      .tooltip(dim === "overworld" ? "Nether portal: to the Nether" : "Nether portal: back to the Overworld")
      .child(fill("a"))
      .child(fill("b").loop("opacity", { from: 0, to: 1, period: 1600 }))
      .child(ico("portal-frame", PORTAL_W).h(PORTAL_H).absolute().top(0).left(0))
      .child(div().absolute().top(-12).left(4).text_size(12).text_color("#b07cff").frames(["·", " ·", "  ·", " ·"], 300));
  }

  sky(dim, weather, night) {
    if (dim === "nether") return "#3b0b0b";
    if (dim === "end") return "#0b0712";
    const day = { clear: "#79a6ff", rain: "#7d8fa8", thunder: "#56627a", snow: "#a9bdd6" };
    const dark = { clear: "#0e1636", rain: "#0b1226", thunder: "#070b18", snow: "#1a2440" };
    return (night ? dark : day)[weather] ?? day.clear;
  }

  render(cx) {
    // An agent finished: both cats are happy.
    const level = Number(shared("mc.level") ?? 0);
    if (level > this.level) cx.timer.after(0, (cx) => this.cats.filter((c) => !c.inside).forEach((c) => this.love(c, cx, 3500)));
    this.level = level;
    const alert = agents().some((a) => a.status === "blocked");
    const night = Boolean(settings()?.dark);
    const dim = this.dim;
    const w = dim === "overworld" ? this.weather : "clear";
    const over = dim === "overworld";
    const dark = !over || night || w === "thunder";
    const cloudColor = !over ? null : w === "thunder" ? "#3a4252" : w === "rain" ? "#8a96a8" : night ? "#ffffff26" : "#ffffffd0";
    const cloud = (id, x, cw, period) => div().id(id).absolute().top(8).h(10).w(cw).bg(cloudColor).loop("left", { from: x, to: x + 300, period, easing: "linear" });
    const ground = { nether: "ground-nether", end: "ground-end" }[dim] ?? (w === "snow" ? "ground-snow" : "ground-grass");

    let scene = div()
      .id("world")
      .relative()
      .size_full()
      .overflow_hidden()
      .bg(this.sky(dim, w, night))
      .on_size_change((size, cx) => {
        this.height = size.height;
        if (Math.abs(size.width - this.width) < 1) return;
        this.width = size.width;
        for (const c of this.cats) c.x = Math.min(c.x, this.max());
        cx.notify();
      });

    if (over) {
      scene = scene
        .when(night && (w === "clear" || w === "snow"), (el) =>
          el.children(
            [70, 160, 300, 430, 560, 700, 820, 980, 1120, 1260, 1400, 1550].map((x, i) =>
              div().absolute().top(6 + (i % 4) * 7).left(x).size(2).bg("#ffffff").loop("opacity", { from: 0.3, to: 1, period: 1800 + (i % 5) * 400 }),
            ),
          ),
        )
        .when(w === "clear" || w === "snow", (el) =>
          el.child(night ? div().absolute().top(8).right(330).size(14).bg("#e8e8f0") : div().absolute().top(6).right(330).size(18).bg("#fff6a0").border(2).border_color("#ffe14d")),
        )
        .child(cloud("cloud-1", 40, 110, 140000))
        .child(cloud("cloud-2", this.width * 0.45, 150, 180000))
        .child(cloud("cloud-3", this.width * 0.75, 90, 120000))
        .when(w === "rain" || w === "thunder", (el) => el.child(this.falling("rain", night ? "#7f9fd8" : "#dbe8ff", w === "thunder" ? 70 : 90)))
        .when(w === "snow", (el) => el.child(this.falling("snow", "#ffffff", 260)))
        .when(w === "thunder", (el) => el.child(div().absolute().top(0).left(0).size_full().bg("#ffffff").loop("opacity", { from: -14, to: 0.85, period: 6200, easing: "linear" })))
        .child(this.hut(night));
    } else if (dim === "nether") {
      scene = scene
        .children([0.1, 0.32, 0.58, 0.83].map((f, i) => div().absolute().top(0).left(this.width * f).w(18 + (i % 2) * 10).h(10 + (i % 3) * 6).bg("#d9a441").border_b(2).border_color("#ffe08a")))
        .child(this.falling("ash", "#b86a6a", 180));
    } else {
      scene = scene
        .child(this.falling("end", "#c48cff", 220))
        .children(
          [0.08, 0.27, 0.5, 0.71, 0.9].map((f, i) =>
            div()
              .absolute()
              .bottom(GROUND)
              .left(this.width * f)
              .w(16)
              .h(44 + ((i * 17) % 40))
              .bg("#1b1024")
              .border(1)
              .border_color("#2c1a3a")
              .child(div().absolute().top(-10).left(3).size(10).bg("#e070ff").loop("opacity", { from: 0.4, to: 1, period: 1100 + i * 230 })),
          ),
        );
    }

    return scene
      .child(h_flex().absolute().bottom(0).left(0).w_full().h(GROUND).overflow_hidden().child(strip(ground, GROUND, 3200, 128 / 7)))
      .when(dim === "nether", (el) =>
        el.children([0.42, 0.74].map((f, i) => div().absolute().bottom(GROUND - 6).left(this.width * f).w(90 + i * 40).h(8).bg("#ff7a00").border_t(2).border_color("#ffc04a").loop("opacity", { from: 0.75, to: 1, period: 1400 + i * 500 }))),
      )
      .child(this.portal(dim))
      .children(this.mobs.render(GROUND))
      .children(this.cats.filter((c) => !c.inside).map((c) => this.cat(c, alert, dark)))
      .child(div().absolute().top(0).left(0).size_full().bg("#7a2bd6").opacity(this.flash ? 0.85 : 0).transition("opacity", { duration: 600 }));
  }

  /** For the F3 lines. */
  describe() {
    const w = this.dim === "overworld" ? { clear: "Clear", rain: "Rain", thunder: "Thunder", snow: "Snow" }[this.weather] : null;
    return w ? `${DIM_NAME[this.dim]} · ${w}` : DIM_NAME[this.dim];
  }
}
