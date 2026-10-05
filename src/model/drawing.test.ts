import { describe, expect, test } from "vitest";
import {
  buildTileSet,
  createDrawing,
  type Drawing,
  getDrawingPixel,
  SCREEN_COLUMNS,
  SCREEN_HEIGHT,
  SCREEN_ROWS,
  SCREEN_WIDTH,
  setDrawingPixel,
} from "./drawing";
import { Shade } from "./shade";

const SCREEN_TILE_POSITIONS = SCREEN_COLUMNS * SCREEN_ROWS; // 360

function blankScreen(): Drawing {
  return createDrawing(SCREEN_COLUMNS, SCREEN_ROWS);
}

/** A drawing of varied pseudo-random pixels. The same seed gives the same drawing. */
function randomDrawing(
  widthInTiles: number,
  heightInTiles: number,
  seed = 1,
): Drawing {
  const drawing = createDrawing(widthInTiles, heightInTiles);

  for (let i = 0; i < drawing.pixels.length; i++) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    drawing.pixels[i] = (seed >>> 16) % 4;
  }

  return drawing;
}

/** Fills the whole 8×8 tile at (tileX, tileY) with one shade. */
function fillTile(
  drawing: Drawing,
  tileX: number,
  tileY: number,
  shade: Shade,
): void {
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      setDrawingPixel(drawing, { x: tileX * 8 + x, y: tileY * 8 + y }, shade);
    }
  }
}

/** buildTileSet for a single drawing: its tiles and its one tilemap. */
function buildOne(drawing: Drawing): {
  tiles: Uint8Array[];
  tilemap: number[];
} {
  const { tiles, tilemaps } = buildTileSet([drawing]);
  return { tiles, tilemap: tilemaps[0] };
}

/** Where a tile position's entry is in a tilemap that is `widthInTiles` wide. */
function mapIndex(
  tileX: number,
  tileY: number,
  widthInTiles = SCREEN_COLUMNS,
): number {
  return tileY * widthInTiles + tileX;
}

/**
 * Rebuilds a drawing's pixels from tiles and a tilemap, the way the Game Boy
 * draws its background: for each pixel, look up the tile number for the
 * pixel's tile position, then read the pixel from that tile.
 */
function rebuildPixels(
  tiles: Uint8Array[],
  tilemap: number[],
  width: number,
  height: number,
): Uint8Array {
  const pixels = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tileNumber =
        tilemap[mapIndex(Math.floor(x / 8), Math.floor(y / 8), width / 8)];
      pixels[y * width + x] = tiles[tileNumber][(y % 8) * 8 + (x % 8)];
    }
  }

  return pixels;
}

describe("createDrawing", () => {
  test("the size is given in tiles and stored in pixels", () => {
    const drawing = createDrawing(3, 2);

    expect(drawing.width).toBe(24);
    expect(drawing.height).toBe(16);
  });

  test("a new drawing is blank, with one shade per pixel", () => {
    const drawing = createDrawing(3, 2);

    expect(drawing.pixels).toHaveLength(24 * 16);
    expect(drawing.pixels.every((shade) => shade === Shade.BRIGHTEST)).toBe(
      true,
    );
  });

  test("a drawing of SCREEN_COLUMNS × SCREEN_ROWS tiles is screen-sized", () => {
    const drawing = blankScreen();

    expect(drawing.width).toBe(SCREEN_WIDTH);
    expect(drawing.height).toBe(SCREEN_HEIGHT);
  });
});

describe("getDrawingPixel and setDrawingPixel", () => {
  // 3 tiles wide means 24 pixels per row, so pixel (5, 1) is entry 1 × 24 + 5

  test("setDrawingPixel uses the drawing's own row width", () => {
    const drawing = createDrawing(3, 2);
    setDrawingPixel(drawing, { x: 5, y: 1 }, Shade.DARKEST);

    const expected = new Uint8Array(24 * 16);
    expected[1 * 24 + 5] = Shade.DARKEST;
    expect(drawing.pixels).toEqual(expected);
  });

  test("getDrawingPixel uses the drawing's own row width", () => {
    const drawing = createDrawing(3, 2);
    drawing.pixels[1 * 24 + 5] = Shade.DARK;

    expect(getDrawingPixel(drawing, { x: 5, y: 1 })).toBe(Shade.DARK);
    expect(getDrawingPixel(drawing, { x: 6, y: 1 })).toBe(Shade.BRIGHTEST);
  });
});

describe("buildTileSet: one drawing's tiles", () => {
  test("a blank drawing has a single unique tile", () => {
    expect(buildOne(blankScreen()).tiles).toHaveLength(1);
  });

  test("painting one pixel adds a second unique tile", () => {
    const screen = blankScreen();
    setDrawingPixel(screen, { x: 19, y: 10 }, Shade.DARKEST);

    expect(buildOne(screen).tiles).toHaveLength(2);
  });

  test("identical tiles are counted once", () => {
    const screen = blankScreen();
    // The same spot (column 3, row 2) inside tile (2, 1) and tile (5, 4)
    setDrawingPixel(screen, { x: 19, y: 10 }, Shade.DARKEST);
    setDrawingPixel(screen, { x: 43, y: 34 }, Shade.DARKEST);

    expect(buildOne(screen).tiles).toHaveLength(2);
  });

  test("a different spot in another tile adds a third unique tile", () => {
    const screen = blankScreen();
    setDrawingPixel(screen, { x: 19, y: 10 }, Shade.DARKEST);
    setDrawingPixel(screen, { x: 43, y: 34 }, Shade.DARKEST);
    setDrawingPixel(screen, { x: 80, y: 80 }, Shade.DARKEST);

    expect(buildOne(screen).tiles).toHaveLength(3);
  });

  test("tiles are cut out correctly and listed in order of first appearance", () => {
    const screen = blankScreen();
    // Tile (2, 1), at column 3, row 2 inside the tile
    setDrawingPixel(screen, { x: 19, y: 10 }, Shade.DARKEST);

    const [first, second] = buildOne(screen).tiles;

    // The top-left tile is blank, so the blank tile comes first
    expect(first.every((shade) => shade === Shade.BRIGHTEST)).toBe(true);

    // The painted tile has exactly one pixel set, at row 2, column 3
    const expected = new Uint8Array(64);
    expected[2 * 8 + 3] = Shade.DARKEST;
    expect(second).toEqual(expected);
  });
});

describe("buildTileSet: one drawing's tilemap", () => {
  test("a blank drawing uses tile 0 everywhere", () => {
    const { tilemap } = buildOne(blankScreen());

    expect(tilemap).toEqual(new Array<number>(SCREEN_TILE_POSITIONS).fill(0));
  });

  test("a painted tile gets its own number at its position", () => {
    const screen = blankScreen();
    setDrawingPixel(screen, { x: 19, y: 10 }, Shade.DARKEST); // tile (2, 1)

    const expected = new Array<number>(SCREEN_TILE_POSITIONS).fill(0);
    expected[mapIndex(2, 1)] = 1;

    expect(buildOne(screen).tilemap).toEqual(expected);
  });

  test("identical tiles share the same number", () => {
    const screen = blankScreen();
    setDrawingPixel(screen, { x: 19, y: 10 }, Shade.DARKEST); // tile (2, 1)
    setDrawingPixel(screen, { x: 43, y: 34 }, Shade.DARKEST); // tile (5, 4)

    const expected = new Array<number>(SCREEN_TILE_POSITIONS).fill(0);
    expected[mapIndex(2, 1)] = 1;
    expected[mapIndex(5, 4)] = 1;

    expect(buildOne(screen).tilemap).toEqual(expected);
  });

  test("tile numbers go past 255 without wrapping around", () => {
    // Every tile is different, so tile N is the tile at position N
    const { tiles, tilemap } = buildOne(
      randomDrawing(SCREEN_COLUMNS, SCREEN_ROWS),
    );

    expect(tiles).toHaveLength(SCREEN_TILE_POSITIONS);
    expect(tilemap).toEqual(
      Array.from({ length: SCREEN_TILE_POSITIONS }, (_, i) => i),
    );
  });

  test("the tiles and tilemap rebuild the original screen", () => {
    // The bottom half repeats the top half, so every tile is used twice
    const screen = randomDrawing(SCREEN_COLUMNS, SCREEN_ROWS);
    const half = screen.pixels.length / 2;
    screen.pixels.copyWithin(half, 0, half);

    const { tiles, tilemap } = buildOne(screen);

    expect(tiles).toHaveLength(SCREEN_TILE_POSITIONS / 2);
    expect(rebuildPixels(tiles, tilemap, screen.width, screen.height)).toEqual(
      screen.pixels,
    );
  });
});

describe("buildTileSet: sizes other than the screen", () => {
  test("a 1 × 1 drawing is a single tile", () => {
    const drawing = createDrawing(1, 1);
    setDrawingPixel(drawing, { x: 3, y: 2 }, Shade.DARKEST);

    const { tiles, tilemap } = buildOne(drawing);

    const expected = new Uint8Array(64);
    expected[2 * 8 + 3] = Shade.DARKEST;
    expect(tiles).toHaveLength(1);
    expect(tiles[0]).toEqual(expected);
    expect(tilemap).toEqual([0]);
  });

  test("the tilemap rows are as wide as the drawing", () => {
    // 3 × 2 tiles. Tile (2, 1) is the last of the 6 positions.
    const drawing = createDrawing(3, 2);
    setDrawingPixel(drawing, { x: 19, y: 10 }, Shade.DARKEST);

    expect(buildOne(drawing).tilemap).toEqual([0, 0, 0, 0, 0, 1]);
  });

  test("a drawing wider than the background map is cut up completely", () => {
    // 40 × 18 tiles, like a short scrolling level
    const level = randomDrawing(40, SCREEN_ROWS);

    const { tiles, tilemap } = buildOne(level);

    expect(tilemap).toHaveLength(40 * SCREEN_ROWS);
    expect(rebuildPixels(tiles, tilemap, level.width, level.height)).toEqual(
      level.pixels,
    );
  });

  test("a drawing taller than it is wide is cut up completely", () => {
    // 2 × 3 tiles, like a 16 × 24 character
    const character = randomDrawing(2, 3);

    const { tiles, tilemap } = buildOne(character);

    expect(tilemap).toHaveLength(6);
    expect(
      rebuildPixels(tiles, tilemap, character.width, character.height),
    ).toEqual(character.pixels);
  });
});

describe("buildTileSet: several drawings", () => {
  test("no drawings give no tiles and no tilemaps", () => {
    const { tiles, tilemaps } = buildTileSet([]);

    expect(tiles).toHaveLength(0);
    expect(tilemaps).toHaveLength(0);
  });

  test("there is one tilemap per drawing, as big as that drawing", () => {
    const { tilemaps } = buildTileSet([
      createDrawing(3, 2),
      createDrawing(1, 1),
      blankScreen(),
    ]);

    expect(tilemaps.map((tilemap) => tilemap.length)).toEqual([
      6,
      1,
      SCREEN_TILE_POSITIONS,
    ]);
  });

  test("a tile used by two drawings is stored once and has one number", () => {
    // A 2×1 background with a blank tile and a dot tile,
    // and a 1×1 sprite that is the same dot tile
    const background = createDrawing(2, 1);
    setDrawingPixel(background, { x: 8 + 3, y: 2 }, Shade.DARKEST);
    const sprite = createDrawing(1, 1);
    setDrawingPixel(sprite, { x: 3, y: 2 }, Shade.DARKEST);

    const { tiles, tilemaps } = buildTileSet([background, sprite]);

    expect(tiles).toHaveLength(2);
    expect(tilemaps).toEqual([[0, 1], [1]]);
  });

  test("tiles are numbered in order of first appearance, drawing by drawing", () => {
    // First drawing: tile A. Second drawing: tiles B, A, C.
    const first = createDrawing(1, 1);
    fillTile(first, 0, 0, Shade.DARKEST); // A
    const second = createDrawing(3, 1);
    fillTile(second, 0, 0, Shade.LIGHT); // B
    fillTile(second, 1, 0, Shade.DARKEST); // A again
    fillTile(second, 2, 0, Shade.DARK); // C

    const { tiles, tilemaps } = buildTileSet([first, second]);

    expect(tiles.map((tile) => tile[0])).toEqual([
      Shade.DARKEST,
      Shade.LIGHT,
      Shade.DARK,
    ]);
    expect(tilemaps).toEqual([[0], [1, 0, 2]]);
  });

  test("every drawing can be rebuilt from the shared tiles and its own tilemap", () => {
    // The first two drawings are identical, so they share every tile
    const drawings = [
      randomDrawing(4, 3, 1),
      randomDrawing(4, 3, 1),
      randomDrawing(2, 2, 7),
    ];

    const { tiles, tilemaps } = buildTileSet(drawings);

    expect(tiles).toHaveLength(12 + 4);
    expect(tilemaps[1]).toEqual(tilemaps[0]);
    drawings.forEach((drawing, i) => {
      expect(
        rebuildPixels(tiles, tilemaps[i], drawing.width, drawing.height),
      ).toEqual(drawing.pixels);
    });
  });

  test("tile numbers keep counting across drawings, past 255", () => {
    // Two different random screens: 360 distinct tiles each
    const { tiles, tilemaps } = buildTileSet([
      randomDrawing(SCREEN_COLUMNS, SCREEN_ROWS, 1),
      randomDrawing(SCREEN_COLUMNS, SCREEN_ROWS, 2),
    ]);

    expect(tiles).toHaveLength(2 * SCREEN_TILE_POSITIONS);
    expect(tilemaps[1][0]).toBe(SCREEN_TILE_POSITIONS);
    expect(Math.max(...tilemaps[1])).toBe(2 * SCREEN_TILE_POSITIONS - 1);
  });
});
