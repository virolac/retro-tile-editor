import { describe, expect, test } from "vitest";
import {
  createDrawing,
  getDrawingPixel,
  setDrawingPixel,
  type Drawing,
} from "./drawing";
import {
  projectFromJson,
  projectToJson,
  type DrawingEntry,
  type ProjectFile,
} from "./project";
import { Shade } from "./shade";

/**
 * Saves the drawings and reads the file back, so the tests can look inside it.
 * JSON.parse returns `any`, so TypeScript takes the return type on trust here.
 * The tests themselves check what is really in the file.
 */
function saved(entries: DrawingEntry[]): ProjectFile {
  return JSON.parse(projectToJson(entries));
}

/** A 1 × 1 tile whose row 2 has DARKEST, DARK and LIGHT at columns 3, 4 and 5. */
function tileWithThreeShades(): Drawing {
  const tile = createDrawing(1, 1);
  setDrawingPixel(tile, { x: 3, y: 2 }, Shade.DARKEST);
  setDrawingPixel(tile, { x: 4, y: 2 }, Shade.DARK);
  setDrawingPixel(tile, { x: 5, y: 2 }, Shade.LIGHT);

  return tile;
}

/** The text of a version 1 project file with these drawings, which may be broken on purpose. */
function fileWith(...drawings: unknown[]): string {
  return JSON.stringify({ version: 1, drawings });
}

/** The rows of a blank drawing that is the given number of tiles wide and tall. */
function blankRows(widthInTiles: number, heightInTiles: number): string[] {
  return new Array<string>(heightInTiles * 8).fill(
    "0".repeat(widthInTiles * 8),
  );
}

describe("projectToJson", () => {
  test("a project without drawings is version 1 with no drawings", () => {
    expect(saved([])).toEqual({ version: 1, drawings: [] });
  });

  test("a drawing is saved as its name, kind and rows of shade digits, and nothing else", () => {
    // The Uint8Array itself must not end up in the file: in JSON it would
    // turn into {"0":0,"1":0,…}, one entry per pixel.
    const [tile] = saved([
      { name: "Tile", kind: "background", drawing: tileWithThreeShades() },
    ]).drawings;

    expect(tile).toEqual({
      name: "Tile",
      kind: "background",
      rows: [
        "00000000",
        "00000000",
        "00032100",
        "00000000",
        "00000000",
        "00000000",
        "00000000",
        "00000000",
      ],
    });
  });

  test("there is one row per pixel row, each as long as the drawing is wide", () => {
    // 3 × 2 tiles is 24 × 16 pixels
    const [paddle] = saved([
      { name: "Paddle", kind: "sprite", drawing: createDrawing(3, 2) },
    ]).drawings;

    expect(paddle.rows).toHaveLength(16);
    expect(paddle.rows.every((row) => row.length === 24)).toBe(true);
  });

  test("drawings are saved in the order of the list", () => {
    const { drawings } = saved([
      { name: "Level", kind: "background", drawing: createDrawing(20, 18) },
      { name: "Paddle", kind: "sprite", drawing: createDrawing(3, 2) },
      { name: "Ball", kind: "sprite", drawing: createDrawing(1, 1) },
    ]);

    expect(drawings.map((d) => d.name)).toEqual(["Level", "Paddle", "Ball"]);
    expect(drawings.map((d) => d.kind)).toEqual([
      "background",
      "sprite",
      "sprite",
    ]);
  });

  test("each row is on its own line, so you can see the drawing in a text editor", () => {
    const json = projectToJson([
      { name: "Tile", kind: "background", drawing: tileWithThreeShades() },
    ]);
    const lines = json.split("\n").map((line) => line.trim());

    expect(lines).toContain('"00032100",');
  });
});

describe("projectFromJson: files it reads", () => {
  test("a saved project loads back as the same drawings", () => {
    const level = createDrawing(20, 18);
    setDrawingPixel(level, { x: 19, y: 10 }, Shade.DARKEST);
    const paddle = createDrawing(3, 2);
    setDrawingPixel(paddle, { x: 5, y: 4 }, Shade.DARK);
    setDrawingPixel(paddle, { x: 23, y: 15 }, Shade.LIGHT);

    const entries: DrawingEntry[] = [
      { name: "Level", kind: "background", drawing: level },
      { name: "Paddle", kind: "sprite", drawing: paddle },
    ];

    expect(projectFromJson(projectToJson(entries))).toEqual(entries);
  });

  test("a project without drawings loads as no drawings", () => {
    expect(projectFromJson(projectToJson([]))).toEqual([]);
  });

  test("the number of rows is the height and their length is the width", () => {
    // 16 rows of 24 digits is 3 × 2 tiles
    const [paddle] = projectFromJson(
      fileWith({ name: "Paddle", kind: "sprite", rows: blankRows(3, 2) }),
    );

    expect(paddle.drawing.width).toBe(24);
    expect(paddle.drawing.height).toBe(16);
  });

  test("each digit becomes its pixel's shade", () => {
    const rows = blankRows(1, 1);
    rows[2] = "00032100";

    const [tile] = projectFromJson(
      fileWith({ name: "Tile", kind: "background", rows }),
    );

    expect(getDrawingPixel(tile.drawing, { x: 3, y: 2 })).toBe(Shade.DARKEST);
    expect(getDrawingPixel(tile.drawing, { x: 4, y: 2 })).toBe(Shade.DARK);
    expect(getDrawingPixel(tile.drawing, { x: 5, y: 2 })).toBe(Shade.LIGHT);
    expect(getDrawingPixel(tile.drawing, { x: 6, y: 2 })).toBe(Shade.BRIGHTEST);
  });
});

describe("projectFromJson: files it refuses", () => {
  test("text that isn't JSON", () => {
    expect(() => projectFromJson("this is not JSON")).toThrow();
  });

  test("JSON that isn't a project file", () => {
    expect(() => projectFromJson("null")).toThrow();
    expect(() => projectFromJson("[]")).toThrow();
    expect(() => projectFromJson('"project"')).toThrow();
    expect(() => projectFromJson('{ "drawings": [] }')).toThrow(); // no version
  });

  test("a version this editor doesn't know", () => {
    expect(() => projectFromJson('{ "version": 2, "drawings": [] }')).toThrow();
  });

  test("drawings that aren't a list", () => {
    expect(() => projectFromJson('{ "version": 1, "drawings": {} }')).toThrow();
  });

  test("a drawing with a missing or wrong field", () => {
    const rows = blankRows(1, 1);

    expect(() => projectFromJson(fileWith(null))).toThrow();
    expect(() => projectFromJson(fileWith({ kind: "sprite", rows }))).toThrow();
    expect(() =>
      projectFromJson(fileWith({ name: 7, kind: "sprite", rows })),
    ).toThrow();
    expect(() =>
      projectFromJson(fileWith({ name: "Ball", kind: "window", rows })),
    ).toThrow();
    expect(() =>
      projectFromJson(fileWith({ name: "Ball", kind: "sprite" })),
    ).toThrow();
    expect(() =>
      projectFromJson(fileWith({ name: "Ball", kind: "sprite", rows: [1, 2] })),
    ).toThrow();
  });

  test("a drawing without pixels", () => {
    const emptyRows = new Array<string>(8).fill("");

    expect(() =>
      projectFromJson(fileWith({ name: "Ball", kind: "sprite", rows: [] })),
    ).toThrow();
    expect(() =>
      projectFromJson(
        fileWith({ name: "Ball", kind: "sprite", rows: emptyRows }),
      ),
    ).toThrow();
  });

  test("rows that aren't all as long", () => {
    const rows = blankRows(2, 1);
    rows[5] = "0".repeat(15);

    expect(() =>
      projectFromJson(fileWith({ name: "Ball", kind: "sprite", rows })),
    ).toThrow();
  });

  test("a size that isn't a whole number of tiles", () => {
    const sevenRows = blankRows(1, 1).slice(1);
    const nineWide = blankRows(1, 1).map((row) => row + "0");

    expect(() =>
      projectFromJson(
        fileWith({ name: "Ball", kind: "sprite", rows: sevenRows }),
      ),
    ).toThrow();
    expect(() =>
      projectFromJson(
        fileWith({ name: "Ball", kind: "sprite", rows: nineWide }),
      ),
    ).toThrow();
  });

  test("a pixel that isn't a digit from 0 to 3", () => {
    for (const badRow of ["00040000", "0000000a", "000 0000", "-1000000"]) {
      const rows = blankRows(1, 1);
      rows[2] = badRow;

      expect(() =>
        projectFromJson(fileWith({ name: "Tile", kind: "background", rows })),
      ).toThrow();
    }
  });
});
