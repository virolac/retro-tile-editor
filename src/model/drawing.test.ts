import { describe, expect, test } from "vitest";
import {
  copyTile,
  createDrawing,
  type Drawing,
  getDrawingPixel,
  pasteTile,
  SCREEN_COLUMNS,
  SCREEN_HEIGHT,
  SCREEN_ROWS,
  SCREEN_WIDTH,
  setDrawingPixel,
} from "./drawing";
import { Shade } from "./shade";

function blankScreen(): Drawing {
  return createDrawing(SCREEN_COLUMNS, SCREEN_ROWS);
}

/** A tile from 8 rows of 8 shade digits. */
function tileOf(rows: string[]): Uint8Array {
  return Uint8Array.from(rows.join(""), Number);
}

/** A tile with all four shades that looks different when flipped or turned, so a mixed-up copy shows. */
const TRIANGLE = tileOf([
  "30000000",
  "33000000",
  "32300000",
  "32230000",
  "32223000",
  "32222300",
  "32222230",
  "31111113",
]);

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

describe("copyTile and pasteTile", () => {
  // In a 3 × 2 tiles drawing, tile (2, 1) covers pixels (16–23, 8–15)

  test("copyTile gives a tile's shades row by row", () => {
    const drawing = createDrawing(3, 2);
    setDrawingPixel(drawing, { x: 19, y: 10 }, Shade.DARKEST); // tile (2, 1), column 3, row 2

    const expected = new Uint8Array(64);
    expected[2 * 8 + 3] = Shade.DARKEST;
    expect(copyTile(drawing, { x: 2, y: 1 })).toEqual(expected);
  });

  test("copyTile gives a copy, so painting the drawing afterwards doesn't change it", () => {
    const drawing = createDrawing(3, 2);
    const copied = copyTile(drawing, { x: 0, y: 0 });

    setDrawingPixel(drawing, { x: 3, y: 2 }, Shade.DARKEST);

    expect(copied).toEqual(new Uint8Array(64));
  });

  test("pasteTile changes only the tile it pastes over", () => {
    const drawing = createDrawing(3, 2);
    pasteTile(drawing, { x: 2, y: 1 }, new Uint8Array(64).fill(Shade.DARK));

    const expected = new Uint8Array(24 * 16);
    for (let y = 8; y < 16; y++) {
      for (let x = 16; x < 24; x++) {
        expected[y * 24 + x] = Shade.DARK;
      }
    }
    expect(drawing.pixels).toEqual(expected);
  });

  test("pasting what copyTile gave copies a tile to another spot, row by row", () => {
    const drawing = createDrawing(3, 2);
    pasteTile(drawing, { x: 0, y: 0 }, TRIANGLE);

    pasteTile(drawing, { x: 2, y: 1 }, copyTile(drawing, { x: 0, y: 0 }));

    expect(copyTile(drawing, { x: 2, y: 1 })).toEqual(TRIANGLE);
    expect(copyTile(drawing, { x: 0, y: 0 })).toEqual(TRIANGLE);
  });
});
