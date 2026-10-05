import { describe, expect, test } from "vitest";
import { SCREEN_COLUMNS, SCREEN_ROWS } from "./drawing";
import {
  BG_MAP_WIDTH,
  encodeTile,
  encodeTileNumbers,
  encodeTilemap,
  encodeTiles,
} from "./encode";
import { Shade } from "./shade";

/** Numbers the positions 0, 1, 2… (starting over after 255), so misplaced bytes show up. */
function numberedTilemap(
  widthInTiles: number,
  heightInTiles: number,
): number[] {
  return Array.from(
    { length: widthInTiles * heightInTiles },
    (_, i) => i % 256,
  );
}

test("encodes a row into low/high bit planes", () => {
  const px = new Uint8Array(64);
  px.set([0, 1, 2, 3, 0, 1, 2, 3], 0);
  const bytes = encodeTile(px);
  expect(bytes[0]).toBe(0x55);
  expect(bytes[1]).toBe(0x33);
});

describe("encodeTiles", () => {
  test("no tiles give no bytes", () => {
    expect(encodeTiles([])).toHaveLength(0);
  });

  test("tiles are encoded one after another, 16 bytes each", () => {
    const blank = new Uint8Array(64);
    const dot = new Uint8Array(64);
    dot[2 * 8 + 3] = Shade.DARKEST; // row 2, column 3

    const bytes = encodeTiles([blank, dot]);

    expect(bytes).toHaveLength(32);
    expect(bytes.subarray(0, 16)).toEqual(encodeTile(blank));
    expect(bytes.subarray(16, 32)).toEqual(encodeTile(dot));
  });

  test("tile N starts at byte N × 16", () => {
    const dot = new Uint8Array(64);
    dot[2 * 8 + 3] = Shade.DARKEST; // row 2, column 3

    const bytes = encodeTiles([new Uint8Array(64), dot]);

    // Row 2 of tile 1 is bytes 16 + 4 and 16 + 5. Column 3 is bit 4 ($10),
    // and DARKEST sets it in both bit planes.
    const expected = new Uint8Array(32);
    expected[20] = 0x10;
    expected[21] = 0x10;
    expect(bytes).toEqual(expected);
  });
});

describe("encodeTilemap: drawings narrower than the background map", () => {
  test("a screen has one 32-byte row per tile row", () => {
    const tilemap = new Array<number>(SCREEN_COLUMNS * SCREEN_ROWS).fill(0);

    expect(encodeTilemap(tilemap, SCREEN_COLUMNS)).toHaveLength(
      BG_MAP_WIDTH * SCREEN_ROWS,
    );
  });

  test("each row starts at a multiple of 32 and is padded with tile 0", () => {
    const tilemap = numberedTilemap(SCREEN_COLUMNS, SCREEN_ROWS);

    const bytes = encodeTilemap(tilemap, SCREEN_COLUMNS);

    for (let row = 0; row < SCREEN_ROWS; row++) {
      for (let col = 0; col < BG_MAP_WIDTH; col++) {
        const expected =
          col < SCREEN_COLUMNS ? tilemap[row * SCREEN_COLUMNS + col] : 0;
        expect(bytes[row * BG_MAP_WIDTH + col]).toBe(expected);
      }
    }
  });

  test("the tile at (2, 1) lands at row 1, column 2 of the map", () => {
    const tilemap = new Array<number>(SCREEN_COLUMNS * SCREEN_ROWS).fill(0);
    tilemap[1 * SCREEN_COLUMNS + 2] = 1;

    const bytes = encodeTilemap(tilemap, SCREEN_COLUMNS);

    expect(bytes[1 * BG_MAP_WIDTH + 2]).toBe(1);
    expect(bytes.filter((n) => n !== 0)).toHaveLength(1);
  });

  test("a 3 × 2 drawing is padded the same way", () => {
    const bytes = encodeTilemap([1, 2, 3, 4, 5, 6], 3);

    const expected = new Uint8Array(2 * BG_MAP_WIDTH);
    expected.set([1, 2, 3], 0);
    expected.set([4, 5, 6], BG_MAP_WIDTH);
    expect(bytes).toEqual(expected);
  });
});

describe("encodeTilemap: drawings as wide as the map or wider", () => {
  test("a 32 × 32 map needs no padding", () => {
    const tilemap = numberedTilemap(32, 32);

    expect(encodeTilemap(tilemap, 32)).toEqual(new Uint8Array(tilemap));
  });

  test("a level wider than the map keeps its own width", () => {
    // 40 × 18 tiles, like a short scrolling level
    const tilemap = numberedTilemap(40, SCREEN_ROWS);

    expect(encodeTilemap(tilemap, 40)).toEqual(new Uint8Array(tilemap));
  });
});

describe("encodeTilemap: bad input", () => {
  test("refuses tile numbers that don't fit in a byte", () => {
    const tilemap = new Array<number>(SCREEN_COLUMNS * SCREEN_ROWS).fill(0);
    tilemap[0] = 256;

    expect(() => encodeTilemap(tilemap, SCREEN_COLUMNS)).toThrow();
  });

  test("refuses a tilemap that isn't a whole number of rows", () => {
    // 6 numbers can't be split into rows of 4
    expect(() => encodeTilemap([0, 0, 0, 0, 0, 0], 4)).toThrow();
  });
});

describe("encodeTileNumbers", () => {
  test("no tile numbers give no bytes", () => {
    expect(encodeTileNumbers([])).toHaveLength(0);
  });

  test("each tile number becomes one byte, in order, without padding", () => {
    // A 3 × 2 sprite's tile numbers, row by row
    expect(encodeTileNumbers([1, 2, 3, 4, 5, 6])).toEqual(
      new Uint8Array([1, 2, 3, 4, 5, 6]),
    );
  });

  test("for a drawing exactly 32 tiles wide it gives the same bytes as encodeTilemap", () => {
    // At the background map's width there is no padding, so the two must agree
    const tilemap = numberedTilemap(BG_MAP_WIDTH, 2);

    expect(encodeTileNumbers(tilemap)).toEqual(
      encodeTilemap(tilemap, BG_MAP_WIDTH),
    );
  });

  test("255 is the largest tile number that fits", () => {
    expect(encodeTileNumbers([0, 255])).toEqual(new Uint8Array([0, 255]));
  });

  test("refuses tile numbers that don't fit in a byte", () => {
    // Without the check, the Uint8Array would quietly wrap 256 around to 0
    expect(() => encodeTileNumbers([0, 256])).toThrow();
  });
});
