import { MAX_TILES, TILE_SIZE } from "./drawing";

export const BYTES_PER_TILE = 2 * TILE_SIZE;

export function encodeTile(pixels: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(BYTES_PER_TILE);

  for (let y = 0; y < TILE_SIZE; y++) {
    let low = 0;
    let high = 0;

    for (let x = 0; x < TILE_SIZE; x++) {
      const p = pixels[y * TILE_SIZE + x];
      low |= (p & 1) << (7 - x);
      high |= ((p >> 1) & 1) << (7 - x);
    }

    out[2 * y] = low;
    out[2 * y + 1] = high;
  }

  return out;
}

/**
 * Encodes tiles into one block of 2bpp data: each tile's 16 bytes, one tile
 * after another, in list order. Tile N starts at byte N × 16, the same
 * layout the tiles will have in VRAM.
 */
export function encodeTiles(tiles: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(tiles.length * BYTES_PER_TILE);

  for (let i = 0; i < tiles.length; i++) {
    out.set(encodeTile(tiles[i]), i * BYTES_PER_TILE);
  }

  return out;
}

/** Width of the Game Boy's background map in tiles. The screen shows 20 of them. */
export const BG_MAP_WIDTH = 32;

/**
 * Turns a drawing's tilemap (`widthInTiles` tile numbers per row, row by row)
 * into the bytes of a Game Boy tilemap, one byte per tile.
 *
 * A drawing narrower than the background map (like a single screen) gets each
 * row padded with tile 0 up to BG_MAP_WIDTH, so the result can be copied
 * straight to $9800. A wider drawing (like a scrolling level) keeps its own
 * width, because the game copies only the part it needs.
 *
 * Throws if a tile number doesn't fit in a byte (0–255), or if the tilemap
 * isn't a whole number of rows of `widthInTiles`.
 */
export function encodeTilemap(
  tilemap: number[],
  widthInTiles: number,
): Uint8Array<ArrayBuffer> {
  if (tilemap.length % widthInTiles !== 0) {
    throw new RangeError(
      `A tilemap of ${tilemap.length} numbers can't be split into rows of ${widthInTiles}.`,
    );
  }

  const heightInTiles = tilemap.length / widthInTiles;
  const rowStride = Math.max(widthInTiles, BG_MAP_WIDTH);
  const out = new Uint8Array(heightInTiles * rowStride);

  for (let row = 0; row < heightInTiles; row++) {
    for (let col = 0; col < widthInTiles; col++) {
      const tileNumber = tilemap[row * widthInTiles + col];

      if (tileNumber > MAX_TILES - 1) {
        throw new RangeError(
          `Tile number ${tileNumber} at (${col}, ${row}) doesn't fit in a byte.`,
        );
      }

      out[row * rowStride + col] = tileNumber;
    }
  }

  return out;
}

/** One byte per tile number, in order, with no padding (for sprites). Throws if a number doesn't fit in a byte. */
export function encodeTileNumbers(
  tileNumbers: number[],
): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(tileNumbers.length);

  for (let i = 0; i < tileNumbers.length; i++) {
    const tileNumber = tileNumbers[i];
    if (tileNumber > MAX_TILES - 1) {
      throw new RangeError(
        `Tile number ${tileNumber} at index ${i} doesn't fit in a byte.`,
      );
    }

    out[i] = tileNumber;
  }

  return out;
}
