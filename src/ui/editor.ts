import {
  createDrawing,
  getDrawingPixel,
  pixelToTile,
  setDrawingPixel,
  TILE_SIZE,
  tileToPixel,
  type Point,
} from "../model/drawing";
import { Shade } from "../model/shade";
import { GRAY, GREEN, TRANSPARENT, type Palette, type Rgba } from "./palette";
import { type DrawingEntry, type DrawingKind } from "../model/project";

const TARGET_CANVAS_SIZE = 832;
const MIN_PIXEL_SIZE = 3;
const PIXEL_LINE_THRESHOLD = 12;
const PIXEL_LINE_COLOR = "rgba(128, 128, 128, 0.4)";
const TILE_LINE_COLOR = "rgba(128, 128, 128)";

type EditorState = {
  canvas: HTMLCanvasElement;
  pixelCanvas: HTMLCanvasElement;
  drawings: DrawingEntry[];
  currentEntry: DrawingEntry | null;
  currentPalette: Palette;
  currentShade: Shade;
  zoomedTile: Point | null;
  renderRequested: boolean;
};

type View = {
  topLeft: Point;
  width: number;
  height: number;
  pixelSize: number;
};

let state: EditorState;

export function init(canvas: HTMLCanvasElement): void {
  state = {
    canvas: canvas,
    pixelCanvas: document.createElement("canvas"),
    drawings: [],
    currentEntry: null,
    currentPalette: GREEN,
    currentShade: Shade.BRIGHTEST,
    zoomedTile: null,
    renderRequested: false,
  };

  state.canvas.hidden = true;
}

export function newDrawing(
  widthInTiles: number,
  heightInTiles: number,
  kind: DrawingKind,
): number {
  const index = state.drawings.length;

  state.drawings.push({
    kind: kind,
    name: `Drawing ${index + 1}`,
    drawing: createDrawing(widthInTiles, heightInTiles),
  });

  state.canvas.hidden = false;

  return index;
}

export function drawingEntry(index: number): Readonly<DrawingEntry> {
  return state.drawings[index];
}

export function renameDrawing(index: number, name: string): void {
  state.drawings[index].name = name;
}

export function selectDrawing(index: number): void {
  // Don't do anything if the drawing is already selected
  if (state.drawings[index] === state.currentEntry) return;

  state.currentEntry = state.drawings[index];

  // Leave tile mode because the zoomed tile might not exist in the new current drawing
  state.zoomedTile = null;

  resizeCanvas();
  requestRender();
}

export function setPaletteForVersion(version: string): void {
  if (version === "original") state.currentPalette = GREEN;
  else state.currentPalette = GRAY;

  if (state.currentEntry !== null) requestRender();
}

function pixelSizeFor(width: number, height: number): number {
  const pixelSize = Math.floor(TARGET_CANVAS_SIZE / Math.max(width, height));

  return Math.max(MIN_PIXEL_SIZE, pixelSize);
}

function getView(): View {
  if (state.zoomedTile === null) {
    /* Whole drawing mode */
    const drawing = state.currentEntry!.drawing;

    return {
      topLeft: { x: 0, y: 0 },
      width: drawing.width,
      height: drawing.height,
      pixelSize: pixelSizeFor(drawing.width, drawing.height),
    };
  } else {
    /* Tile mode */
    return {
      topLeft: tileToPixel(state.zoomedTile),
      width: TILE_SIZE,
      height: TILE_SIZE,
      pixelSize: pixelSizeFor(TILE_SIZE, TILE_SIZE),
    };
  }
}

function resizeCanvas(): void {
  const view = getView();

  state.canvas.width = view.pixelSize * view.width;
  state.canvas.height = view.pixelSize * view.height;

  state.pixelCanvas.width = view.width;
  state.pixelCanvas.height = view.height;
}

/** The color to show for a shade: a sprite's shade 0 is transparent, like on the Game Boy. */
function colorFor(shade: Shade, kind: DrawingKind): Rgba {
  const color = state.currentPalette[shade];

  return kind === "sprite" && shade === Shade.BRIGHTEST ? TRANSPARENT : color;
}

function drawPixels(ctx: CanvasRenderingContext2D): void {
  const view = getView();
  const pixelCtx = state.pixelCanvas.getContext("2d")!;
  const pixelBuffer = pixelCtx.createImageData(
    state.pixelCanvas.width,
    state.pixelCanvas.height,
  );

  for (let cellY = 0; cellY < view.height; cellY++) {
    for (let cellX = 0; cellX < view.width; cellX++) {
      const shade = getDrawingPixel(state.currentEntry!.drawing, {
        x: view.topLeft.x + cellX,
        y: view.topLeft.y + cellY,
      });

      const color = colorFor(shade, state.currentEntry!.kind);
      const index = cellY * view.width + cellX;
      pixelBuffer.data.set(color, 4 * index);
    }
  }

  pixelCtx.putImageData(pixelBuffer, 0, 0);
  ctx.drawImage(
    state.pixelCanvas,
    0,
    0,
    state.canvas.width,
    state.canvas.height,
  );
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  view: View,
  spacing: number,
  color: string,
  lineWidth: number,
): void {
  const gridRows = view.height / spacing;
  const gridColumns = view.width / spacing;

  ctx.fillStyle = color;

  for (let x = 1; x < gridColumns; x++) {
    ctx.fillRect(
      x * spacing * view.pixelSize,
      0,
      lineWidth,
      state.canvas.height,
    );
  }

  for (let y = 1; y < gridRows; y++) {
    ctx.fillRect(
      0,
      y * spacing * view.pixelSize,
      state.canvas.width,
      lineWidth,
    );
  }
}

function drawGrid(ctx: CanvasRenderingContext2D): void {
  const view = getView();

  let tileLineWidth = 1;

  // Draw pixel lines for pixel sizes above a threshold
  if (view.pixelSize > PIXEL_LINE_THRESHOLD) {
    drawLines(ctx, view, 1, PIXEL_LINE_COLOR, 1);
    tileLineWidth = 2;
  }

  // Draw tile lines
  drawLines(ctx, view, TILE_SIZE, TILE_LINE_COLOR, tileLineWidth);
}

function requestRender(): void {
  if (state.renderRequested) return;

  requestAnimationFrame(render);
  state.renderRequested = true;
}

function render(): void {
  state.renderRequested = false;

  const ctx = state.canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;

  ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);

  drawPixels(ctx);
  drawGrid(ctx);
}

export function handleKey(e: KeyboardEvent): void {
  // Prevent inputs from changing the shade
  if (e.target instanceof HTMLInputElement) return;

  switch (Number(e.key)) {
    case 1:
      state.currentShade = Shade.BRIGHTEST;
      break;
    case 2:
      state.currentShade = Shade.LIGHT;
      break;
    case 3:
      state.currentShade = Shade.DARK;
      break;
    case 4:
      state.currentShade = Shade.DARKEST;
      break;
  }
}

function pixelUnderPointer(e: PointerEvent): Point | null {
  const view = getView();
  const rect = state.canvas.getBoundingClientRect();
  const x = Math.floor(((e.clientX - rect.left) / rect.width) * view.width);
  const y = Math.floor(((e.clientY - rect.top) / rect.height) * view.height);

  if (x >= 0 && x < view.width && y >= 0 && y < view.height) {
    return { x: view.topLeft.x + x, y: view.topLeft.y + y };
  }

  return null;
}

export function handlePointerDown(e: PointerEvent): void {
  const point = pixelUnderPointer(e);

  if (point === null) return;

  if (e.buttons === 1) {
    setDrawingPixel(state.currentEntry!.drawing, point, state.currentShade);
  } else if (e.buttons === 2) {
    if (state.zoomedTile === null) state.zoomedTile = pixelToTile(point);
    else state.zoomedTile = null;

    resizeCanvas();
  }

  requestRender();
}

export function handlePointerMove(e: PointerEvent): void {
  if ((e.buttons & 1) !== 1) return;

  const point = pixelUnderPointer(e);

  if (point === null) return;

  setDrawingPixel(state.currentEntry!.drawing, point, state.currentShade);
  requestRender();
}
