import {
  getDrawingPixel,
  setDrawingPixel,
  type Drawing,
  type Point,
} from "./drawing";
import type { Shade } from "./shade";

/**
 * Gives `shade` to the pixel at `start` and to every pixel connected to it through
 * pixels of the same shade, going up, down, left and right (not diagonally).
 */
export function floodFill(drawing: Drawing, start: Point, shade: Shade): void {
  const startShade = getDrawingPixel(drawing, start);

  if (startShade === shade) return;

  const remainingPixels = [start];
  while (remainingPixels.length > 0) {
    const pos = remainingPixels.pop();

    if (!pos) continue;

    if (getDrawingPixel(drawing, pos) !== startShade) continue;

    setDrawingPixel(drawing, pos, shade);

    if (pos.x - 1 >= 0) remainingPixels.push({ x: pos.x - 1, y: pos.y });
    if (pos.x + 1 < drawing.width)
      remainingPixels.push({ x: pos.x + 1, y: pos.y });

    if (pos.y - 1 >= 0) remainingPixels.push({ x: pos.x, y: pos.y - 1 });
    if (pos.y + 1 < drawing.height)
      remainingPixels.push({ x: pos.x, y: pos.y + 1 });
  }
}
