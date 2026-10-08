import { describe, expect, test } from "vitest";
import {
  createDrawing,
  getDrawingPixel,
  setDrawingPixel,
  type Drawing,
} from "./drawing";
import { floodFill } from "./fill";
import { Shade } from "./shade";

/** A 1 × 1 tile drawing with these 8 rows of shade digits. */
function drawingFrom(rows: string[]): Drawing {
  const drawing = createDrawing(1, 1);

  rows.forEach((row, y) => {
    [...row].forEach((digit, x) => {
      setDrawingPixel(drawing, { x, y }, Number(digit) as Shade);
    });
  });

  return drawing;
}

/** The drawing's pixels as rows of shade digits, so a test can compare whole pictures. */
function rowsOf(drawing: Drawing): string[] {
  const rows: string[] = [];

  for (let y = 0; y < drawing.height; y++) {
    let row = "";
    for (let x = 0; x < drawing.width; x++) {
      row += getDrawingPixel(drawing, { x, y });
    }
    rows.push(row);
  }

  return rows;
}

describe("floodFill", () => {
  test("filling a blank drawing fills all of it", () => {
    const drawing = createDrawing(1, 1);

    floodFill(drawing, { x: 3, y: 4 }, Shade.DARK);

    expect(rowsOf(drawing)).toEqual(new Array(8).fill("22222222"));
  });

  test("the fill stays inside an outline of another shade", () => {
    const drawing = drawingFrom([
      "00000000",
      "03333300",
      "03000300",
      "03000300",
      "03333300",
      "00000000",
      "00000000",
      "00000000",
    ]);

    floodFill(drawing, { x: 2, y: 2 }, Shade.LIGHT);

    expect(rowsOf(drawing)).toEqual([
      "00000000",
      "03333300",
      "03111300",
      "03111300",
      "03333300",
      "00000000",
      "00000000",
      "00000000",
    ]);
  });

  test("filling outside an outline leaves the inside alone", () => {
    const drawing = drawingFrom([
      "00000000",
      "03333300",
      "03000300",
      "03000300",
      "03333300",
      "00000000",
      "00000000",
      "00000000",
    ]);

    floodFill(drawing, { x: 7, y: 7 }, Shade.LIGHT);

    expect(rowsOf(drawing)).toEqual([
      "11111111",
      "13333311",
      "13000311",
      "13000311",
      "13333311",
      "11111111",
      "11111111",
      "11111111",
    ]);
  });

  test("the fill doesn't go diagonally, so a staircase outline holds it", () => {
    const drawing = drawingFrom([
      "00030000",
      "00300000",
      "03000000",
      "30000000",
      "00000000",
      "00000000",
      "00000000",
      "00000000",
    ]);

    floodFill(drawing, { x: 0, y: 0 }, Shade.DARK);

    expect(rowsOf(drawing)).toEqual([
      "22230000",
      "22300000",
      "23000000",
      "30000000",
      "00000000",
      "00000000",
      "00000000",
      "00000000",
    ]);
  });

  test("pixels of the same shade that aren't connected keep their shade", () => {
    const drawing = drawingFrom([
      "00300000",
      "00300000",
      "00300000",
      "00300000",
      "00300000",
      "00300000",
      "00300000",
      "00300000",
    ]);

    floodFill(drawing, { x: 0, y: 0 }, Shade.DARK);

    expect(rowsOf(drawing)).toEqual(new Array(8).fill("22300000"));
  });

  test("filling with the shade the pixel already has changes nothing", () => {
    const drawing = drawingFrom([
      "11111111",
      "10000001",
      "10000001",
      "11111111",
      "00000000",
      "00000000",
      "00000000",
      "00000000",
    ]);
    const before = rowsOf(drawing);

    floodFill(drawing, { x: 0, y: 0 }, Shade.LIGHT);

    expect(rowsOf(drawing)).toEqual(before);
  });

  test("a fill of a 64 × 64 tile drawing finishes", () => {
    // 512 × 512 pixels: calling a function per pixel, one inside the other, would overflow the call stack
    const drawing = createDrawing(64, 64);

    floodFill(drawing, { x: 0, y: 0 }, Shade.DARKEST);

    expect(drawing.pixels.every((shade) => shade === Shade.DARKEST)).toBe(true);
  });
});