export const Shade = {
  BRIGHTEST: 0, // %00
  LIGHT: 1, // %01
  DARK: 2, // %10
  DARKEST: 3, // %11
} as const;

export type Shade = (typeof Shade)[keyof typeof Shade]; // 0 | 1 | 2 | 3
