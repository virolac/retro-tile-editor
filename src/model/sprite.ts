import { TILE_SIZE, type Drawing } from "./drawing";

/** How many sprites the Game Boy can show at once: OAM has room for 40. */
export const MAX_SPRITES = 40;

/** How many sprites the Game Boy draws on one line of the screen. Past that, the rest on that line aren't drawn. */
export const MAX_SPRITES_PER_LINE = 10;

/** How many hardware sprites a sprite drawing needs: one per tile, as the export lays them out. */
export type SpriteUsage = {
  /** All of them. The Game Boy can show MAX_SPRITES at once. */
  total: number;
  /** The most on any one line of the screen. The Game Boy draws MAX_SPRITES_PER_LINE at most. */
  perLine: number;
};

/** The hardware sprites `drawing` needs when it's shown as a sprite. */
export function spriteUsage(drawing: Drawing): SpriteUsage {
  const widthInTiles = drawing.width / TILE_SIZE;
  const heightInTiles = drawing.height / TILE_SIZE;

  return { total: widthInTiles * heightInTiles, perLine: widthInTiles };
}
