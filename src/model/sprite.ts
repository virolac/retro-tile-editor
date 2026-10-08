import { TILE_SIZE, type Drawing } from "./drawing";

/** How many sprites the Game Boy can show at once: OAM has room for 40. */
export const MAX_SPRITES = 40;

/** How many sprites the Game Boy draws on one line of the screen. Past that, the rest on that line aren't drawn. */
export const MAX_SPRITES_PER_LINE = 10;

/** How tall the Game Boy's hardware sprites are, in pixels. LCDC bit 2 picks it for all sprites at once. */
export type SpriteHeight = 8 | 16;

/** How many hardware sprites a sprite drawing needs, as the export lays them out. */
export type SpriteUsage = {
  /** All of them. The Game Boy can show MAX_SPRITES at once. */
  total: number;
  /** The most on any one line of the screen. The Game Boy draws MAX_SPRITES_PER_LINE at most. */
  perLine: number;
};

/**
 * The hardware sprites `drawing` needs when it's shown as a sprite.
 *
 * With 8 × 8 sprites, every tile is one. With 8 × 16 sprites, every two tiles
 * on top of each other are one, and an odd last row of tiles still takes a
 * whole one per column.
 */
export function spriteUsage(
  drawing: Drawing,
  spriteHeight: SpriteHeight,
): SpriteUsage {
  const widthInTiles = drawing.width / TILE_SIZE;
  const spriteRows = Math.ceil(drawing.height / spriteHeight);

  return { total: widthInTiles * spriteRows, perLine: widthInTiles };
}
