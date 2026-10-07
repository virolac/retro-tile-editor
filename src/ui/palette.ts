export type Rgba = readonly [number, number, number, number];

/** For pixels the Game Boy doesn't draw: a sprite's shade 0. */
export const TRANSPARENT: Rgba = [0, 0, 0, 0];

export type Palette = readonly [Rgba, Rgba, Rgba, Rgba];

export const GREEN: Palette = [
  [0x9b, 0xbc, 0x0f, 0xff],
  [0x8b, 0xac, 0x0f, 0xff],
  [0x30, 0x62, 0x30, 0xff],
  [0x0f, 0x38, 0x0f, 0xff],
];

export const GRAY: Palette = [
  [0xff, 0xff, 0xff, 0xff],
  [0xaa, 0xaa, 0xaa, 0xff],
  [0x55, 0x55, 0x55, 0xff],
  [0x00, 0x00, 0x00, 0xff],
];

/**
 * A palette color as a CSS color string, like "rgb(155 188 15 / 1)", for coloring elements from code.
 *
 * CSS writes alpha from 0 to 1, while `Rgba` stores it from 0 to 255.
 */
export function cssColor(color: Rgba): string {
  return `rgb(${color[0]} ${color[1]} ${color[2]} / ${color[3] / 255})`;
}
