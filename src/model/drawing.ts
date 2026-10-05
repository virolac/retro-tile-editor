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

function copyTile(drawing: Drawing, tilePos: Point): Uint8Array {
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

/** The tiles of several drawings, with each distinct tile stored once. */
export type TileSet = {
  /** Each distinct tile once, in order of first appearance: drawing by drawing, each read row by row. A tile's index here is its tile number. */
  tiles: Uint8Array[];
  /** One tilemap per drawing, in the same order as the drawings. Each has one tile number per tile position of its drawing, row by row. */
  tilemaps: number[][];
};

/**
 * Splits drawings into the 8×8 tiles they share. A tile that appears more
 * than once, in one drawing or across several, is stored once, and every
 * tilemap refers to it by the same number.
 */
export function buildTileSet(drawings: Drawing[]): TileSet {
  const tileSet: TileSet = {
    tiles: [],
    tilemaps: new Array(drawings.length),
  };
  const tileNumbers: Map<string, number> = new Map();

  for (let i = 0; i < drawings.length; i++) {
    const drawing = drawings[i];
    const tileRows = drawing.height / TILE_SIZE;
    const tileColumns = drawing.width / TILE_SIZE;

    tileSet.tilemaps[i] = new Array(tileRows * tileColumns);

    for (let row = 0; row < tileRows; row++) {
      for (let col = 0; col < tileColumns; col++) {
        const tile = copyTile(drawing, { x: col, y: row });
        const key = tile.join("");

        let tileNumber = tileNumbers.get(key);
        if (tileNumber === undefined) {
          tileNumber = tileSet.tiles.length;
          tileSet.tiles.push(tile);
          tileNumbers.set(key, tileNumber);
        }

        tileSet.tilemaps[i][row * tileColumns + col] = tileNumber;
      }
    }
  }

  return tileSet;
}
