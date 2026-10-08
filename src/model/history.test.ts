import { describe, expect, test } from "vitest";
import { createDrawing, getDrawingPixel, setDrawingPixel } from "./drawing";
import {
  createHistory,
  forgetEdits,
  MAX_EDITS,
  recordEdit,
  redoEdit,
  undoEdit,
  type Edit,
} from "./history";
import type { DrawingEntry } from "./project";
import { Shade } from "./shade";

/** A blank 1 × 1 background with this name. */
function entry(name: string): DrawingEntry {
  return { kind: "background", name, drawing: createDrawing(1, 1) };
}

/** Paints pixel (x, 0) of `entry` like a one-pixel stroke, and returns the edit that records it. */
function paint(entry: DrawingEntry, x: number, shade: Shade): Edit {
  const before = entry.drawing.pixels.slice();
  setDrawingPixel(entry.drawing, { x, y: 0 }, shade);

  return { entry, before, after: entry.drawing.pixels.slice() };
}

/** The shade of pixel (x, 0) of `entry`. */
function shadeAt(entry: DrawingEntry, x: number): Shade {
  return getDrawingPixel(entry.drawing, { x, y: 0 });
}

describe("undoEdit and redoEdit", () => {
  test("a new history has nothing to undo or redo", () => {
    const history = createHistory();

    expect(undoEdit(history)).toBe(null);
    expect(redoEdit(history)).toBe(null);
  });

  test("undo puts back the pixels from before the edit, and returns its drawing", () => {
    const history = createHistory();
    const ball = entry("Ball");
    recordEdit(history, paint(ball, 3, Shade.DARKEST));

    expect(undoEdit(history)).toBe(ball);
    expect(shadeAt(ball, 3)).toBe(Shade.BRIGHTEST);
  });

  test("redo puts back the pixels from after the edit, and returns its drawing", () => {
    const history = createHistory();
    const ball = entry("Ball");
    recordEdit(history, paint(ball, 3, Shade.DARKEST));
    undoEdit(history);

    expect(redoEdit(history)).toBe(ball);
    expect(shadeAt(ball, 3)).toBe(Shade.DARKEST);
  });

  test("a redone edit can be undone again", () => {
    const history = createHistory();
    const ball = entry("Ball");
    recordEdit(history, paint(ball, 3, Shade.DARKEST));
    undoEdit(history);
    redoEdit(history);

    expect(undoEdit(history)).toBe(ball);
    expect(shadeAt(ball, 3)).toBe(Shade.BRIGHTEST);
  });

  test("edits are undone newest first, and redone in the order they were made", () => {
    const history = createHistory();
    const ball = entry("Ball");
    recordEdit(history, paint(ball, 0, Shade.LIGHT));
    recordEdit(history, paint(ball, 1, Shade.DARK));

    undoEdit(history); // the newest edit goes first
    expect(shadeAt(ball, 1)).toBe(Shade.BRIGHTEST);
    expect(shadeAt(ball, 0)).toBe(Shade.LIGHT);

    undoEdit(history);
    expect(shadeAt(ball, 0)).toBe(Shade.BRIGHTEST);

    redoEdit(history); // the oldest edit comes back first
    expect(shadeAt(ball, 0)).toBe(Shade.LIGHT);
    expect(shadeAt(ball, 1)).toBe(Shade.BRIGHTEST);

    redoEdit(history);
    expect(shadeAt(ball, 1)).toBe(Shade.DARK);
  });

  test("edits in different drawings are undone in the order they were made", () => {
    const history = createHistory();
    const ball = entry("Ball");
    const paddle = entry("Paddle");
    recordEdit(history, paint(ball, 0, Shade.DARK));
    recordEdit(history, paint(paddle, 0, Shade.DARK));

    expect(undoEdit(history)).toBe(paddle);
    expect(undoEdit(history)).toBe(ball);
  });
});

describe("recordEdit", () => {
  test("an edit that changed nothing isn't recorded", () => {
    const history = createHistory();
    const ball = entry("Ball");
    recordEdit(history, paint(ball, 0, Shade.BRIGHTEST)); // shade 0 over shade 0

    expect(undoEdit(history)).toBe(null);
  });

  test("a new edit drops what could be redone", () => {
    const history = createHistory();
    const ball = entry("Ball");
    recordEdit(history, paint(ball, 0, Shade.LIGHT));
    undoEdit(history);
    recordEdit(history, paint(ball, 1, Shade.DARK));

    expect(redoEdit(history)).toBe(null);
  });

  test(`only the newest ${MAX_EDITS} edits are kept`, () => {
    const history = createHistory();
    const ball = entry("Ball");
    for (let i = 0; i < MAX_EDITS + 5; i++) {
      const shade = i % 2 === 0 ? Shade.DARK : Shade.LIGHT;
      recordEdit(history, paint(ball, 0, shade));
    }

    let undone = 0;
    while (undoEdit(history) !== null) undone++;

    expect(undone).toBe(MAX_EDITS);
  });
});

describe("forgetEdits", () => {
  test("drops a deleted drawing's edits and keeps the others", () => {
    const history = createHistory();
    const ball = entry("Ball");
    const paddle = entry("Paddle");
    recordEdit(history, paint(ball, 0, Shade.DARK));
    recordEdit(history, paint(paddle, 0, Shade.DARK));
    recordEdit(history, paint(ball, 1, Shade.DARK));
    undoEdit(history); // ball's second edit can now be redone

    forgetEdits(history, ball);

    expect(redoEdit(history)).toBe(null);
    expect(undoEdit(history)).toBe(paddle);
    expect(undoEdit(history)).toBe(null);
  });
});
