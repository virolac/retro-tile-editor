import type { Shade } from "./shade";

export const SCREEN_WIDTH = 160;
export const SCREEN_HEIGHT = 144;
export const TILE_SIZE = 8;
export const SCREEN_ROWS = SCREEN_HEIGHT / TILE_SIZE;
export const SCREEN_COLUMNS = SCREEN_WIDTH / TILE_SIZE;
export const MAX_TILES = 256;

/** A picture made of whole 8×8 tiles: a screen, a level, a sprite… */
export type Drawing = {
  /** Width in pixels (a multiple of TILE_SIZE). */
  width: number;
  /** Height in pixels (a multiple of TILE_SIZE). */
  height: number;
  /** One shade per pixel, row by row: width × height entries. */
  pixels: Uint8Array;
};

/** Creates a blank drawing that is the given number of tiles wide and tall. */
export function createDrawing(
  widthInTiles: number,
  heightInTiles: number,
): Drawing {
  const width = widthInTiles * TILE_SIZE;
  const height = heightInTiles * TILE_SIZE;
  const pixels = new Uint8Array(width * height);

  return { width, height, pixels };
}

export type Point = { x: number; y: number };

export function getDrawingPixel(drawing: Drawing, point: Point): Shade {
  return drawing.pixels[point.y * drawing.width + point.x] as Shade;
}

export function setDrawingPixel(
  drawing: Drawing,
  point: Point,
  value: Shade,
): void {
  drawing.pixels[point.y * drawing.width + point.x] = value;
}

export function getTilePixel(tile: Uint8Array, point: Point): Shade {
  return tile[point.y * TILE_SIZE + point.x] as Shade;
}

export function setTilePixel(
  tile: Uint8Array,
  point: Point,
  value: Shade,
): void {
  tile[point.y * TILE_SIZE + point.x] = value;
}

export function pixelToTile(pixel: Point): Point {
  return {
    x: Math.floor(pixel.x / TILE_SIZE),
    y: Math.floor(pixel.y / TILE_SIZE),
  };
}

export function tileToPixel(tile: Point): Point {
  return { x: tile.x * TILE_SIZE, y: tile.y * TILE_SIZE };
}

/** A copy of the 8×8 tile at tile position `tilePos` (in tiles, not pixels), as TILE_SIZE × TILE_SIZE shades, row by row. */
export function copyTile(drawing: Drawing, tilePos: Point): Uint8Array {
  const tileStart = tileToPixel(tilePos);
  const tile = new Uint8Array(TILE_SIZE * TILE_SIZE);

  for (let cellY = 0; cellY < TILE_SIZE; cellY++) {
    for (let cellX = 0; cellX < TILE_SIZE; cellX++) {
      const pixel = getDrawingPixel(drawing, {
        x: tileStart.x + cellX,
        y: tileStart.y + cellY,
      });

      setTilePixel(tile, { x: cellX, y: cellY }, pixel);
    }
  }

  return tile;
}