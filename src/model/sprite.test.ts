import { describe, expect, test } from "vitest";
import { createDrawing } from "./drawing";
import { MAX_SPRITES, MAX_SPRITES_PER_LINE, spriteUsage } from "./sprite";

describe("spriteUsage", () => {
  test("a single tile is one sprite", () => {
    expect(spriteUsage(createDrawing(1, 1))).toEqual({ total: 1, perLine: 1 });
  });

  test("every tile is its own sprite, and a row of tiles shares the same lines", () => {
    // 3 × 2 tiles: 6 sprites, 3 side by side on every line
    expect(spriteUsage(createDrawing(3, 2))).toEqual({ total: 6, perLine: 3 });
  });

  test("a tall drawing doesn't put more sprites on a line", () => {
    expect(spriteUsage(createDrawing(2, 8))).toEqual({ total: 16, perLine: 2 });
  });

  test("10 × 4 tiles uses exactly what the Game Boy can show", () => {
    const usage = spriteUsage(createDrawing(10, 4));

    expect(usage.total).toBe(MAX_SPRITES);
    expect(usage.perLine).toBe(MAX_SPRITES_PER_LINE);
  });

  test("11 tiles wide is one sprite too many on each line", () => {
    expect(spriteUsage(createDrawing(11, 1)).perLine).toBe(
      MAX_SPRITES_PER_LINE + 1,
    );
  });
});
