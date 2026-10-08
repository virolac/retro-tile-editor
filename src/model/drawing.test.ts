import { describe, expect, test } from "vitest";
import {
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

function blankScreen(): Drawing {
  return createDrawing(SCREEN_COLUMNS, SCREEN_ROWS);
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
