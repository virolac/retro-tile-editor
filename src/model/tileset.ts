import { copyTile, TILE_SIZE, type Drawing } from "./drawing";
import type { DrawingEntry } from "./project";

/** The tiles of several drawings, and one tilemap per drawing that refers to them by number. */
export type TileSet = {
  /** The tiles, in the order the export writes them. A tile's index here is its tile number. */
  tiles: Uint8Array[];
  /** One tilemap per drawing, in the same order as the drawings: tile numbers, row by row. */
  tilemaps: number[][];
};

/**
 * Adds `tile` as the next tile number and returns that number.
 *
 * Also remembers it in `tileNumbers`, unless that tile is already there.
 */
function addTile(
  tileSet: TileSet,
  tileNumbers: Map<string, number>,
  tile: Uint8Array,
): number {
  const nextTileNum = tileSet.tiles.length;
  const key = tile.join("");

  if (tileNumbers.get(key) === undefined) tileNumbers.set(key, nextTileNum);

  tileSet.tiles.push(tile);

  return nextTileNum;
}

/** The number of `tile` if it's already stored, otherwise the number it gets when it's added. */
function findOrAddTile(
  tileSet: TileSet,
  tileNumbers: Map<string, number>,
  tile: Uint8Array,
): number {
  const key = tile.join("");

  let tileNumber = tileNumbers.get(key);
  if (tileNumber === undefined)
    tileNumber = addTile(tileSet, tileNumbers, tile);

  return tileNumber;
}

/**
 * Splits drawings into the 8×8 tiles they share.
 *
 * A tile that appears more than once, in one drawing or across several,
 * is stored once, and every tilemap refers to it by the same number.
 * Tiles are numbered in order of first appearance: drawing by drawing, each
 * read row by row. A tilemap has one number per tile of its drawing.
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
        const tileNumber = findOrAddTile(tileSet, tileNumbers, tile);

        tileSet.tilemaps[i][row * tileColumns + col] = tileNumber;
      }
    }
  }

  return tileSet;
}

/**
 * Splits drawings into tiles for 8 × 16 sprites.
 *
 * Every sprite is cut into 8 × 16 hardware sprites, each two tiles on top of
 * each other. Those two tiles get neighboring numbers, the top one even, as
 * the Game Boy needs, and identical hardware sprites are stored once. A
 * sprite with an odd height gets a transparent tile under its last row. A
 * sprite's tilemap has one number per hardware sprite (its top tile's), row
 * by row.
 *
 * Sprites go first, so their pairs line up from tile 0. Backgrounds follow,
 * as in `buildTileSet`: one number per tile, sharing any tile that's already
 * stored. Tilemaps are in the same order as `entries`.
 */
export function buildTallSpriteTileSet(
  entries: readonly DrawingEntry[],
): TileSet {
  const tileSet: TileSet = {
    tiles: [],
    tilemaps: new Array(entries.length),
  };
  const tileNumbers: Map<string, number> = new Map();
  const pairNumbers: Map<string, number> = new Map();
  const blankTile = new Uint8Array(TILE_SIZE * TILE_SIZE);

  // Sprites pass
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].kind === "background") continue;

    const sprite = entries[i].drawing;
    const tileRows = sprite.height / TILE_SIZE;
    const tileColumns = sprite.width / TILE_SIZE;

    tileSet.tilemaps[i] = [];

    for (let row = 0; row < tileRows; row += 2) {
      for (let col = 0; col < tileColumns; col++) {
        const topTile = copyTile(sprite, { x: col, y: row });
        const topTileKey = topTile.join("");

        const bottomTile =
          row + 1 < tileRows
            ? copyTile(sprite, { x: col, y: row + 1 })
            : blankTile;
        const bottomTileKey = bottomTile.join("");
        const pairKey = `${topTileKey}/${bottomTileKey}`;

        let tileNumber = pairNumbers.get(pairKey);
        if (tileNumber === undefined) {
          tileNumber = addTile(tileSet, tileNumbers, topTile);
          addTile(tileSet, tileNumbers, bottomTile);
          pairNumbers.set(pairKey, tileNumber);
        }

        tileSet.tilemaps[i].push(tileNumber);
      }
    }
  }

  // Backgrounds pass
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].kind === "sprite") continue;

    const background = entries[i].drawing;
    const tileRows = background.height / TILE_SIZE;
    const tileColumns = background.width / TILE_SIZE;

    tileSet.tilemaps[i] = [];

    for (let row = 0; row < tileRows; row++) {
      for (let col = 0; col < tileColumns; col++) {
        const tile = copyTile(background, { x: col, y: row });
        const tileNumber = findOrAddTile(tileSet, tileNumbers, tile);

        tileSet.tilemaps[i].push(tileNumber);
      }
    }
  }

  return tileSet;
}
