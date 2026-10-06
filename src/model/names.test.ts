import { describe, expect, test } from "vitest";
import { createDrawing } from "./drawing";
import { defaultDrawingName, fileNameFor, isNameTaken } from "./names";
import type { DrawingEntry } from "./project";

/** A 1 × 1 background with this name. Only the name matters in these tests. */
function entry(name: string): DrawingEntry {
  return { kind: "background", name, drawing: createDrawing(1, 1) };
}

/** Drawings with these names, in this order. */
function entries(...names: string[]): DrawingEntry[] {
  return names.map(entry);
}

describe("fileNameFor", () => {
  test("lowercases the name", () => {
    expect(fileNameFor("Paddle")).toBe("paddle");
  });

  test("turns every space into a dash", () => {
    expect(fileNameFor("Level 1 boss")).toBe("level-1-boss");
  });

  test("leaves a name that's already a file name as it is", () => {
    expect(fileNameFor("big-brick")).toBe("big-brick");
  });
});

describe("isNameTaken", () => {
  test("nothing is taken when there are no drawings", () => {
    expect(isNameTaken("Paddle", [])).toBe(false);
  });

  test("a name another drawing has is taken", () => {
    expect(isNameTaken("Paddle", entries("Ball", "Paddle"))).toBe(true);
  });

  test("a name no drawing has is free", () => {
    expect(isNameTaken("Brick", entries("Ball", "Paddle"))).toBe(false);
  });

  test("upper and lower case don't make names different", () => {
    expect(isNameTaken("PADDLE", entries("Paddle"))).toBe(true);
  });

  test("a space and a dash don't make names different", () => {
    expect(isNameTaken("big-brick", entries("Big brick"))).toBe(true);
  });

  test("the drawing passed as except doesn't count", () => {
    const paddle = entry("Paddle");

    expect(isNameTaken("PADDLE", [entry("Ball"), paddle], paddle)).toBe(false);
  });

  test("the other drawings still count when except is passed", () => {
    const paddle = entry("Paddle");

    expect(isNameTaken("Ball", [entry("Ball"), paddle], paddle)).toBe(true);
  });
});

describe("defaultDrawingName", () => {
  test("the first drawing is Drawing 1", () => {
    expect(defaultDrawingName([])).toBe("Drawing 1");
  });

  test("names that aren't numbered drawings don't use up numbers", () => {
    expect(defaultDrawingName(entries("Paddle", "Ball"))).toBe("Drawing 1");
  });

  test("the next number comes after the ones in use", () => {
    expect(defaultDrawingName(entries("Drawing 1", "Drawing 2"))).toBe(
      "Drawing 3",
    );
  });

  test("a number freed by a delete is used again", () => {
    expect(defaultDrawingName(entries("Drawing 1", "Drawing 3"))).toBe(
      "Drawing 2",
    );
  });

  test("names that would export to the same file count as taken", () => {
    expect(defaultDrawingName(entries("drawing-1", "DRAWING 2"))).toBe(
      "Drawing 3",
    );
  });

  test("adding and deleting never gives two drawings the same file name", () => {
    const list: DrawingEntry[] = [];
    const add = (): void => {
      list.push(entry(defaultDrawingName(list)));
    };

    for (let i = 0; i < 5; i++) add();
    list.splice(1, 1); // Drawing 2
    list.splice(2, 1); // Drawing 4
    for (let i = 0; i < 4; i++) add();

    const fileNames = list.map((e) => fileNameFor(e.name));
    expect(new Set(fileNames).size).toBe(list.length);
  });
});
