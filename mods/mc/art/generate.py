#!/usr/bin/env python3
"""Draws every texture and icon the mc mod uses. Original pixel art, not Mojang's.

    python3 mods/mc/art/generate.py      (from ~/.config/herdr-app, needs Pillow)

Icons and tiles are SVGs of crisp-edged rects, so they stay sharp at any size.
The window background is a PNG, pre-scaled with nearest-neighbour.
"""
import os
import random
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
MOD = os.path.dirname(HERE)


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def shade(h, k):
    r, g, b = hexrgb(h)
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(c * k))) for c in (r, g, b))


def svg(path, grid):
    """grid: rows of colors (None = transparent). Merges horizontal runs."""
    h, w = len(grid), len(grid[0])
    rects = []
    for y, row in enumerate(grid):
        x = 0
        while x < w:
            c = row[x]
            if c is None:
                x += 1
                continue
            n = 1
            while x + n < w and row[x + n] == c:
                n += 1
            rects.append(f'<rect x="{x}" y="{y}" width="{n}" height="1" fill="{c}"/>')
            x += n
    body = "".join(rects)
    out = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w * 4}" height="{h * 4}" shape-rendering="crispEdges">{body}</svg>\n'
    with open(os.path.join(MOD, path), "w") as f:
        f.write(out)


def art(rows, pal):
    return [[pal.get(ch) for ch in row] for row in rows]


# ---- procedural blocks

def noise(seed, w, h, base, ks):
    rnd = random.Random(seed)
    return [[shade(base, rnd.choice(ks)) for _ in range(w)] for _ in range(h)]


def dirt(seed=1):
    rnd = random.Random(seed)
    cols = ["#866043", "#79553a", "#9b7653", "#6b4a30", "#593d29"]
    wts = [5, 4, 2, 2, 1]
    return [[rnd.choices(cols, wts)[0] for _ in range(16)] for _ in range(16)]


def grass_side(seed=3):
    g = dirt(seed)
    rnd = random.Random(seed + 7)
    greens = ["#5d9b34", "#6aaa3c", "#4f8a2b", "#78b84a"]
    for x in range(16):
        depth = rnd.choice([2, 3, 3, 4, 4, 5])
        for y in range(depth):
            g[y][x] = rnd.choice(greens)
        if depth < 5 and rnd.random() < 0.35:
            g[depth][x] = "#4f8a2b"
    return g


def planks(seed=5, base="#a2824e"):
    rnd = random.Random(seed)
    g = []
    for y in range(16):
        row = []
        board = y // 4
        for x in range(16):
            c = shade(base, rnd.choice([0.92, 0.97, 1.0, 1.0, 1.04]))
            if y % 4 == 3:
                c = shade(base, 0.62)
            seam = (4 + board * 7) % 16
            if x == seam and y % 4 != 3:
                c = shade(base, 0.7)
            row.append(c)
        g.append(row)
    return g


def planks_wide(seed, base):
    """128x16 texels: one image covers a whole pane header."""
    rnd = random.Random(seed)
    seams = [[rnd.randrange(128) for _ in range(5)] for _ in range(4)]
    rows = []
    for y in range(16):
        row = []
        for x in range(128):
            c = shade(base, rnd.choice([0.92, 0.97, 1.0, 1.0, 1.04]))
            if y % 4 == 3:
                c = shade(base, 0.62)
            elif x in seams[y // 4]:
                c = shade(base, 0.7)
            row.append(c)
        rows.append(row)
    return rows


def stone(seed=9):
    return noise(seed, 16, 16, "#7d7d7d", [0.86, 0.94, 1.0, 1.0, 1.06, 1.12])


def creeper(seed=11):
    g = noise(seed, 8, 8, "#5fae3f", [0.8, 0.9, 1.0, 1.08, 1.2])
    face = ["........",
            ".KK..KK.",
            ".KK..KK.",
            "...KK...",
            "..KKKK..",
            "..KKKK..",
            "..K..K..",
            "........"]
    for y, row in enumerate(face):
        for x, ch in enumerate(row):
            if ch == "K":
                g[y][x] = "#1c1c1c" if (x + y) % 3 else "#0c2a0c"
    return g


# ---- hand-drawn items

HEART = [".KKK.KKK.",
         "KRWRKRRRK",
         "KWRRRRRRK",
         "KRRRRRRDK",
         ".KRRRRDK.",
         "..KRRDK..",
         "...KDK...",
         "....K....",
         "........."]

DRUM = ["....KKK..",
        "...KBBBK.",
        "..KBbBBBK",
        "..KBBbBBK",
        "..KBBBbK.",
        ".KKKBBK..",
        "KWKKKK...",
        "KWWK.....",
        ".KK......"]

DIAMOND = ["................",
           "................",
           "....KKKKKKKK....",
           "...KaWWaaWWaK...",
           "..KaWaaccaaWaK..",
           ".KccccccccccccK.",
           ".KbcccWccccccbK.",
           "..KbccWcccccbK..",
           "...KbcccccccK...",
           "....KbcccccK....",
           ".....KbcccK.....",
           "......KbcK......",
           ".......KK.......",
           "................",
           "................",
           "................"]

PICK = ["................",
        "....KKKKKK......",
        "...KWWWWWWK.....",
        "....KKKKsWWK....",
        "........KsWWK...",
        ".......KbKKsWK..",
        "......KbK..KsWK.",
        ".....KbK....KsK.",
        "....KbK......K..",
        "...KbK..........",
        "..KbK...........",
        ".KbK............",
        "KbK.............",
        "KK..............",
        "................",
        "................"]

TORCH = ["................",
         "................",
         "......YYYY......",
         ".....YWWWWY.....",
         ".....YWOOWY.....",
         ".....YOOOOY.....",
         "......bBBb......",
         "......bBBb......",
         "......bBBb......",
         "......bBBb......",
         "......bBBb......",
         "......bBBb......",
         "......bBBb......",
         "......bbbb......",
         "................",
         "................"]

TNT = ["KKKKKKKKKKKKKKKK",
       "KRRrRRrRRrRRrRRK",
       "KRRrRRrRRrRRrRRK",
       "KRRrRRrRRrRRrRRK",
       "KWWWWWWWWWWWWWWK",
       "KWKKKWKWWKWKKKWK",
       "KWWKWWKKWKWWKWWK",
       "KWWKWWKWKKWWKWWK",
       "KWWKWWKWWKWWKWWK",
       "KWWWWWWWWWWWWWWK",
       "KRRrRRrRRrRRrRRK",
       "KRRrRRrRRrRRrRRK",
       "KRRrRRrRRrRRrRRK",
       "KRRrRRrRRrRRrRRK",
       "KRRrRRrRRrRRrRRK",
       "KKKKKKKKKKKKKKKK"]

PLUS = ["................",
        "................",
        "......KKKK......",
        "......KWWK......",
        "......KWWK......",
        "......KWWK......",
        "..KKKKKWWKKKKK..",
        "..KWWWWWWWWWWK..",
        "..KWWWWWWWWWWK..",
        "..KKKKKWWKKKKK..",
        "......KWWK......",
        "......KWWK......",
        "......KWWK......",
        "......KKKK......",
        "................",
        "................"]

BOOK = ["................",
        "..KKKKKKKKKKK...",
        "..KBBBBBBBBBWK..",
        "..KBbbbbbbbBWK..",
        "..KBBBBBBBBBWK..",
        "..KBBBGGBBBBWK..",
        "..KBBGYYGBBBWK..",
        "..KBBBGGBBBBWK..",
        "..KBBBBBBBBBWK..",
        "..KBBBBBBBBBWK..",
        "..KBBBBBBBBBWK..",
        "..KBbbbbbbbBWK..",
        "..KBBBBBBBBBWK..",
        "..KKKKKKKKKKKK..",
        "................",
        "................"]

CHEST = ["................",
         ".KKKKKKKKKKKKKK.",
         ".KOOOOOOOOOOOOK.",
         ".KOooooooooooOK.",
         ".KOooooooooooOK.",
         ".KOooooooooooOK.",
         ".KKKKKKGGKKKKKK.",
         ".KOOOOOGGOOOOOK.",
         ".KOooooYYooooOK.",
         ".KOooooooooooOK.",
         ".KOooooooooooOK.",
         ".KOooooooooooOK.",
         ".KOooooooooooOK.",
         ".KOOOOOOOOOOOOK.",
         ".KKKKKKKKKKKKKK.",
         "................"]


def main():
    svg("icons/grass.svg", grass_side())
    svg("icons/dirt.svg", dirt())
    svg("icons/stone.svg", stone())
    svg("icons/planks.svg", planks())
    svg("icons/planks-dark.svg", planks(base="#6e5533"))
    svg("icons/planks-wide.svg", planks_wide(5, "#a2824e"))
    svg("icons/planks-wide-dark.svg", planks_wide(6, "#5e4a2e"))
    svg("icons/creeper.svg", creeper())

    red = {"K": "#1a0000", "R": "#e81919", "W": "#ffb4b4", "D": "#a00f0f"}
    svg("icons/heart.svg", art(HEART, red))
    empty = {"K": "#1a0000", "R": "#3a3a3a", "W": "#4a4a4a", "D": "#2e2e2e"}
    svg("icons/heart-empty.svg", art(HEART, empty))
    half = [[(red if x < 5 else empty).get(ch) for x, ch in enumerate(row)] for row in HEART]
    svg("icons/heart-half.svg", half)
    meat = {"K": "#2a1405", "B": "#c0702e", "b": "#8a4d1f", "W": "#ece4d2"}
    svg("icons/drumstick.svg", art(DRUM, meat))
    svg("icons/drumstick-empty.svg", art(DRUM, {"K": "#2a1405", "B": "#3a3a3a", "b": "#303030", "W": "#4a4a4a"}))
    svg("icons/diamond.svg", art(DIAMOND, {"K": "#0e3f3a", "a": "#a1fbe8", "W": "#ffffff", "c": "#4aedd9", "b": "#2cb3a8"}))
    svg("icons/pickaxe.svg", art(PICK, {"K": "#1c1c1c", "W": "#e4e4e4", "s": "#9a9a9a", "b": "#8a5a2b"}))
    svg("icons/torch.svg", art(TORCH, {"Y": "#ffd53a", "W": "#fff7c2", "O": "#ff9a1f", "b": "#5a3d1e", "B": "#8a5a2b"}))
    svg("icons/tnt.svg", art(TNT, {"K": "#2a0a0a", "R": "#db2f1f", "r": "#a81f12", "W": "#efefef"}))
    svg("icons/plus.svg", art(PLUS, {"K": "#202020", "W": "#ffffff"}))
    svg("icons/book.svg", art(BOOK, {"K": "#2a1405", "B": "#7a4a22", "b": "#5a3416", "W": "#efe6cc", "G": "#e3b400", "Y": "#fff07a"}))
    svg("icons/chest.svg", art(CHEST, {"K": "#2a1405", "O": "#8a5a2b", "o": "#a8763a", "G": "#5a5a5a", "Y": "#d8d8d8"}))

    # The window background: dirt, darkened like the game's menu screens.
    tile = dirt(21)
    img = Image.new("RGB", (16, 16))
    for y in range(16):
        for x in range(16):
            r, g, b = hexrgb(tile[y][x])
            img.putpixel((x, y), (int(r * 0.32), int(g * 0.32), int(b * 0.32)))
    big = img.resize((16 * 8, 16 * 8), Image.NEAREST)  # 8 device px per texel
    W, H = 3840, 2400
    bg = Image.new("RGB", (W, H))
    for y in range(0, H, big.height):
        for x in range(0, W, big.width):
            bg.paste(big, (x, y))
    bg.save(os.path.join(MOD, "img/dirt-bg.png"), optimize=True)


if __name__ == "__main__":
    main()


# ---- pets: Poplu (tuxedo, mostly black) and Lizzy (white). 22x14, facing right.

CAT_WALK_A = ["......................",
              "......................",
              "..............B...B...",
              "..............BP.PB...",
              "..............BBBBBB..",
              "T.............BBBBEBB.",
              "T.............BBBBBBMN",
              "TT..SSSSSSSSSSBBBBBMM.",
              ".TBBBBBBBBBBBBBBBBC...",
              "..BBBBBBBBBBBBBBBBC...",
              "..BBBBBBBBBBBBBBBCC...",
              "..BB.BB.......BB.BB...",
              "..BB.BB.......BB.BB...",
              "..WW.WW.......WW.WW..."]
CAT_WALK_B = CAT_WALK_A[:11] + [
              "...BB.BB.....BB.BB....",
              "...BB.BB.....BB.BB....",
              "...WW.WW.....WW.WW...."]
CAT_SIT = ["......................",
           "..............B...B...",
           "..............BP.PB...",
           "..............BBBBBB..",
           "..............BBBBEBB.",
           "..............BBBBBBMN",
           "............SBBBBBBMM.",
           "...........BBBBBBBCC..",
           "..........BBBBBBBBCC..",
           "......T..BBBBBBBBBCC..",
           "......T..BBBBBBBBBBB..",
           "......TT.BBBBBBBBBBB..",
           ".......TTBBBBBBBBBBB..",
           "........TBBBBBBWW.WW.."]
CAT_SLEEP = ["......................",
             "......................",
             "......................",
             "......................",
             "......................",
             "......................",
             "..............B...B...",
             "..............BP.PB...",
             "....SSSSSSSSSSBBBBBB..",
             "...BBBBBBBBBBBBBBkkBB.",
             "..BBBBBBBBBBBBBBBBBBMN",
             ".BBBBBBBBBBBBBBBBBBBMM",
             "TBBBBBBBBBBBBBBBBBBBC.",
             "TTTTTTTTTTWWBBBBBBWW.."]

CATS = {
    "poplu": {"B": "#1e1e24", "S": "#2c2c34", "T": "#1e1e24", "P": "#3a2a30", "M": "#f2f2f2",
              "C": "#f2f2f2", "W": "#f2f2f2", "N": "#d88a9a", "E": "#7ddc4a", "k": "#55555c"},
    "lizzy": {"B": "#f4f4f4", "S": "#e2e2e6", "T": "#e6e6ea", "P": "#ffb6c8", "M": "#ffffff",
              "C": "#ffffff", "W": "#e4e4e8", "N": "#ff8fab", "E": "#5aa0ff", "k": "#8a8a90"},
}


def outline(g, color):
    h, w = len(g), len(g[0])
    out = [row[:] for row in g]
    for y in range(h):
        for x in range(w):
            if g[y][x] is not None:
                continue
            if any(0 <= y + dy < h and 0 <= x + dx < w and g[y + dy][x + dx] is not None
                   for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1))):
                out[y][x] = color
    return out


def pets():
    poses = {"walk-a": CAT_WALK_A, "walk-b": CAT_WALK_B, "sit": CAT_SIT, "sleep": CAT_SLEEP}
    for name, pal in CATS.items():
        for pose, rows in poses.items():
            g = art(rows, pal)
            svg(f"icons/cat-{name}-{pose}-r.svg", g)
            svg(f"icons/cat-{name}-{pose}-l.svg", [list(reversed(r)) for r in g])
            if name == "poplu":
                # An outlined Poplu for dark skies (night, the Nether, the End).
                rim = outline(g, "#77778a")
                svg(f"icons/cat-{name}-{pose}-r-rim.svg", rim)
                svg(f"icons/cat-{name}-{pose}-l-rim.svg", [list(reversed(r)) for r in rim])
    # The pets' ground: grass on top, dirt below (128x4 texels).
    rnd = random.Random(31)
    rows = [[rnd.choice(["#5d9b34", "#6aaa3c", "#4f8a2b"]) for _ in range(128)],
            [rnd.choice(["#4f8a2b", "#5d9b34", "#866043"]) for _ in range(128)],
            [rnd.choice(["#866043", "#79553a", "#6b4a30"]) for _ in range(128)],
            [rnd.choice(["#79553a", "#6b4a30", "#593d29"]) for _ in range(128)]]
    svg("icons/ground-wide.svg", rows)


pets()


# ---- the cats' world: ground strips (128x7 texels) and their hut.

def ground(seed, top, below, top_rows=2):
    rnd = random.Random(seed)
    rows = []
    for y in range(7):
        pal = top if y < top_rows else below
        rows.append([rnd.choice(pal) for _ in range(128)])
    # a ragged edge where the top layer meets the one below
    for x in range(128):
        if rnd.random() < 0.4:
            rows[top_rows][x] = rnd.choice(top)
    return rows


HUT = ["..........RRRR..........",
       ".........RrrrrR..CC.....",
       "........RrrrrrrR.CC.....",
       ".......RrrrrrrrrRCC.....",
       "......RrrrrrrrrrrRC.....",
       ".....RrrrrrrrrrrrrR.....",
       "....RrrrrrrrrrrrrrrR....",
       "...RRRRRRRRRRRRRRRRRR...",
       "...LPPPPPPPPPPPPPPPPL...",
       "...LPPPPPPPPPPPPPPPPL...",
       "...LPPGGGGPPPPDDDDPPL...",
       "...LPPGggGPPPPDddDPPL...",
       "...LPPGggGPPPPDddDPPL...",
       "...LPPGGGGPPPPDddDPPL...",
       "...LPPPPPPPPPPDdkDPPL...",
       "...LPPPPPPPPPPDddDPPL...",
       "...LPPPPPPPPPPDddDPPL...",
       "...SSSSSSSSSSSSSSSSSS...",
       "...SsSsSSsSSsSsSSsSsS...",
       "........................"]


def world():
    svg("icons/ground-grass.svg", ground(41, ["#5d9b34", "#6aaa3c", "#4f8a2b"], ["#866043", "#79553a", "#6b4a30", "#593d29"]))
    svg("icons/ground-snow.svg", ground(42, ["#f4f8ff", "#e6eef8", "#ffffff"], ["#866043", "#79553a", "#6b4a30", "#593d29"], 3))
    svg("icons/ground-nether.svg", ground(43, ["#7a2a2a", "#6b2020", "#8c3434"], ["#5c1a1a", "#6b2020", "#4a1414", "#7a2a2a"]))
    svg("icons/ground-end.svg", ground(44, ["#e3e3a8", "#d6d69a", "#ededb8"], ["#cfcf92", "#dbdba0", "#c4c486"]))
    base = {"R": "#5a4128", "r": "#6e5233", "C": "#7d7d7d", "L": "#5a4128", "P": "#a2824e",
            "D": "#5a4128", "d": "#7a5a34", "k": "#c8a000", "S": "#7d7d7d", "s": "#5e5e5e"}
    svg("icons/hut-day.svg", art(HUT, {**base, "G": "#3b2a1a", "g": "#9fd3ff"}))
    svg("icons/hut-night.svg", art(HUT, {**base, "G": "#3b2a1a", "g": "#ffd45a"}))


world()


# ---- mobs (side views facing right, mirrored for left) and the nether portal.

CHICKEN = ["........WW..",
           ".......WWWO.",
           ".......WKWOO",
           ".......WWWR.",
           "..W....WWWR.",
           ".WWWWWWWWW..",
           "WWWWWWWWWW..",
           ".WWWwwwWWW..",
           "..WWWWWWW...",
           "....Y..Y....",
           "...YY.YY...."]

PIG = ["............PPPPP...",
       "...........PPPPPPP..",
       "..PPPPPPPPPPPPKPPPss",
       ".pPPPPPPPPPPPPPPPPss",
       ".PPPPPPPPPPPPPPPPP..",
       ".PPPPPPPPPPPPPPPPP..",
       "..PPPPPPPPPPPPPPP...",
       "..PP.PP......PP.PP..",
       "..PP.PP......PP.PP.."]

SHEEP = ["..............ff....",
         ".WWWWWWWWWWWWWffff..",
         "WWWWWWWWWWWWWWfKff..",
         "WWWWWWWWWWWWWWffff..",
         "WWWWWWWWWWWWWWWff...",
         "WWWWWWWWWWWWWWW.....",
         ".WWWWWWWWWWWWW......",
         "..ff.ff.....ff.ff...",
         "..ff.ff.....ff.ff..."]

ZOMBIE = ["..GGGGGG......",
          "..GGGGGGG.....",
          "..GGGGKGG.....",
          "..GgGGGGG.....",
          "..GGGGGG......",
          "...TTTTTGGGGGG",
          "...TTTTTGGGGGG",
          "...TTTTT......",
          "...TTTTT......",
          "...TTTTT......",
          "...TTTTT......",
          "...BBBBB......",
          "...BBBBB......",
          "...BB.BB......",
          "...BB.BB......",
          "...BB.BB......",
          "...SS.SS......"]

PIGLIN = ["..PPPPPP......",
          "..PPPPKPP.....",
          "..PgPPPPnn....",
          "..PPPPPPnn....",
          "..PPPPPPw.....",
          "...LLLLLPP.Y..",
          "...LLLLLPPPYY.",
          "...LLLLL...Y..",
          "...LLLLL...Y..",
          "...LLLLL......",
          "...LLLLL......",
          "...DDDDD......",
          "...DDDDD......",
          "...DD.DD......",
          "...DD.DD......",
          "...DD.DD......",
          "...KK.KK......"]


def creeper_body(seed=13):
    face = creeper(seed)
    rnd = random.Random(seed + 1)
    green = lambda: shade("#5fae3f", rnd.choice([0.8, 0.9, 1.0, 1.08, 1.2]))
    rows = [r[:] for r in face]
    for _ in range(6):
        rows.append([None, None] + [green() for _ in range(4)] + [None, None])
    for _ in range(2):
        rows.append([green() for _ in range(8)])
    rows.append([green(), green(), None, green(), green(), None, green(), green()])
    return rows


def enderman():
    K, k, P = "#141414", "#1e1e1e", "#d36cff"
    rows = []
    for y in range(6):
        rows.append([K] * 8)
    rows[3] = [K, P, P, K, K, P, P, K]
    for y in range(6, 14):
        rows.append([k, None, K, K, K, K, None, k])
    for y in range(14, 20):
        rows.append([k, None, K if y < 15 else None, k if y >= 15 else K, k if y >= 15 else K, K if y < 15 else None, None, k])
    for y in range(20, 30):
        rows.append([None, None, k, None, None, k, None, None])
    return rows


def ghast():
    W, w, K = "#f2f2f2", "#d8d8d8", "#5a5a5a"
    rows = [[W if (x + y) % 5 else w for x in range(16)] for y in range(12)]
    for x in (3, 4, 5, 10, 11, 12):
        rows[5][x] = K
    for y in (8, 9):
        for x in range(6, 10):
            rows[y][x] = K
    lens = {1: 6, 4: 4, 7: 6, 10: 3, 13: 5}
    for y in range(12, 18):
        row = [None] * 16
        for x, n in lens.items():
            if y - 12 < n:
                row[x] = row[x + 1] = W if (y % 2) else w
        rows.append(row)
    return rows


def portal_fill(seed):
    rnd = random.Random(seed)
    return [[rnd.choice(["#5a1fa8", "#6b2bd0", "#7d3ff0", "#8a52ff", "#4a1890"]) for _ in range(12)] for _ in range(20)]


def portal_frame():
    rnd = random.Random(51)
    ob = lambda: rnd.choice(["#120a1a", "#1a0f26", "#24143a", "#160c20"])
    rows = []
    for y in range(26):
        row = []
        for x in range(18):
            edge = y < 3 or y >= 23 or x < 3 or x >= 15
            row.append(ob() if edge else None)
        rows.append(row)
    return rows


def mobs():
    def both(name, g):
        svg(f"icons/mob-{name}-r.svg", g)
        svg(f"icons/mob-{name}-l.svg", [list(reversed(r)) for r in g])
    both("chicken", art(CHICKEN, {"W": "#f4f4f4", "w": "#d4d4d4", "O": "#f2a23a", "R": "#d83a2e", "K": "#141414", "Y": "#e8c23a"}))
    both("pig", art(PIG, {"P": "#f0a5a2", "p": "#e08a88", "s": "#d4787a", "K": "#141414"}))
    both("sheep", art(SHEEP, {"W": "#ececec", "f": "#c9ae8c", "K": "#141414"}))
    both("zombie", art(ZOMBIE, {"G": "#5a8a3a", "g": "#3f6a26", "K": "#141414", "T": "#2aa3a3", "B": "#3b3ba0", "S": "#555555"}))
    both("piglin", art(PIGLIN, {"P": "#e3a0a0", "g": "#6aa05a", "K": "#141414", "n": "#c47a7a", "w": "#f4f4e0",
                                "L": "#7a5a2a", "D": "#5a3d1e", "Y": "#f0c840"}))
    both("creeper", creeper_body())
    both("enderman", outline(enderman(), "#4a3a5e"))
    both("ghast", ghast())
    svg("icons/portal-frame.svg", portal_frame())
    svg("icons/portal-fill-a.svg", portal_fill(61))
    svg("icons/portal-fill-b.svg", portal_fill(62))


mobs()
