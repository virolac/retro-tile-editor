import { encodeTilemap, encodeTileNumbers, encodeTiles } from "../model/encode";
import {
  buildTileSet,
  createDrawing,
  getDrawingPixel,
  MAX_TILES,
  pixelToTile,
  setDrawingPixel,
  TILE_SIZE,
  tileToPixel,
  type Point,
} from "../model/drawing";
import { Shade } from "../model/shade";
import { downloadBinary, downloadJson } from "./download";
import { GRAY, GREEN, TRANSPARENT, type Palette, type Rgba } from "./palette";
import {
  projectToJson,
  type DrawingEntry,
  type DrawingKind,
} from "../model/project";
import { showError } from "./dialogs";
import { defaultDrawingName, fileNameFor, isNameTaken } from "../model/names";
import {
  createHistory,
  forgetEdits,
  recordEdit,
  redoEdit,
  undoEdit,
  type Edit,
  type History,
} from "../model/history";

const TARGET_CANVAS_SIZE = 832;
const MIN_PIXEL_SIZE = 3;
const PIXEL_LINE_THRESHOLD = 12;
const PIXEL_LINE_COLOR = "rgba(128, 128, 128, 0.4)";
const TILE_LINE_COLOR = "rgba(128, 128, 128)";

/** A paint stroke in progress: the drawing it paints, and its pixels from before the stroke. */
type Stroke = {
  entry: DrawingEntry;
  before: Uint8Array;
};

type EditorState = {
  canvas: HTMLCanvasElement;
  pixelCanvas: HTMLCanvasElement;
  drawings: DrawingEntry[];
  currentEntry: DrawingEntry | null;
  currentPalette: Palette;
  currentShade: Shade;
  zoomedTile: Point | null;
  renderRequested: boolean;
  changedSinceSave: boolean;
  /** The paint stroke in progress, or null between strokes. */
  stroke: Stroke | null;
  /** The paint strokes that can be undone and redone. */
  history: History;
  onChange: () => void;
};

type View = {
  topLeft: Point;
  width: number;
  height: number;
  pixelSize: number;
};

let state: EditorState;

/**
 * Sets up the editor on `canvas`.
 *
 * `onChange` is called whenever the editor's state changes in a way the rest of the page shows
 * (the drawings, the current drawing, the shade or the palette), and once at the end of `init`,
 * so the page starts out in sync.
 */
export function init(canvas: HTMLCanvasElement, onChange: () => void): void {
  state = {
    canvas: canvas,
    pixelCanvas: document.createElement("canvas"),
    drawings: [],
    currentEntry: null,
    currentPalette: GREEN,
    currentShade: Shade.DARKEST,
    zoomedTile: null,
    renderRequested: false,
    changedSinceSave: false,
    stroke: null,
    history: createHistory(),
    onChange: onChange,
  };

  state.canvas.hidden = true;

  onChange();
}

/** How many different tiles all the drawings use together. */
export function tileCount(): number {
  const allDrawings = state.drawings.map((e) => e.drawing);
  const tileSet = buildTileSet(allDrawings);

  return tileSet.tiles.length;
}

/** Adds a blank drawing with a name that isn't taken, and makes it the current one. */
export function newDrawing(
  widthInTiles: number,
  heightInTiles: number,
  kind: DrawingKind,
): void {
  const newEntry: DrawingEntry = {
    kind: kind,
    name: defaultDrawingName(state.drawings),
    drawing: createDrawing(widthInTiles, heightInTiles),
  };

  state.drawings.push(newEntry);
  state.canvas.hidden = false;

  selectDrawing(newEntry);
  setChangedSinceSave(true);

  state.onChange();
}

/**
 * The drawings in list order.
 *
 * The array is read-only, so drawings are only added or removed through the editor,
 * which keeps the canvas and the unsaved-changes warning up to date.
 */
export function drawingEntries(): readonly DrawingEntry[] {
  return state.drawings;
}

/** The drawing shown on the canvas, or null when there are no drawings. */
export function currentEntry(): DrawingEntry | null {
  return state.currentEntry;
}

export function selectDrawing(entry: DrawingEntry): void {
  // Don't do anything if the drawing is already selected
  if (entry === state.currentEntry) return;

  state.currentEntry = entry;

  // Leave tile mode because the zoomed tile might not exist in the new current drawing
  state.zoomedTile = null;

  resizeCanvas();
  requestRender();

  state.onChange();
}

/**
 * Renames a drawing, unless another drawing would export to the same file name.
 *
 * Returns whether it was renamed.
 */
export function renameDrawing(entry: DrawingEntry, name: string): boolean {
  if (isNameTaken(name, state.drawings, entry)) return false;

  entry.name = name;

  setChangedSinceSave(true);

  state.onChange();

  return true;
}

/**
 * Removes a drawing.
 *
 * If it was the current one, the drawing that takes its place in the list
 * (or the one before it, if it was last) becomes current.
 */
export function deleteDrawing(entry: DrawingEntry): void {
  const index = state.drawings.indexOf(entry);

  // Not in the list. Without this, splice(-1, 1) would remove the last drawing.
  if (index === -1) return;

  if (entry === state.currentEntry) {
    state.currentEntry = null;
    state.zoomedTile = null;

    if (index < state.drawings.length - 1)
      selectDrawing(state.drawings[index + 1]);
    else if (index > 0) selectDrawing(state.drawings[index - 1]);
  }

  state.drawings.splice(index, 1);
  state.canvas.hidden = state.drawings.length === 0;

  setChangedSinceSave(true);
  forgetEdits(state.history, entry);

  state.onChange();
}

export function setPaletteForVersion(version: string): void {
  if (version === "original") state.currentPalette = GREEN;
  else state.currentPalette = GRAY;

  if (state.currentEntry !== null) requestRender();

  state.onChange();
}

/** The shade that painting uses. */
export function currentShade(): Shade {
  return state.currentShade;
}

/** Makes `shade` the one that painting uses, and reports the change. */
export function selectShade(shade: Shade): void {
  state.currentShade = shade;
  state.onChange();
}

/** The color `shade` shows as on the canvas: the current palette's color, or transparent for shade 0 of a sprite. */
export function shadeColor(shade: Shade): Rgba {
  return colorFor(shade, state.currentEntry?.kind ?? "background");
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

  const modKey = navigator.userAgent.includes("Mac") ? e.metaKey : e.ctrlKey;

  if (modKey && e.key.toLowerCase() === "z") {
    e.preventDefault();

    if (e.shiftKey) redo();
    else undo();

    return;
  }

  switch (Number(e.key)) {
    case 1:
      selectShade(Shade.BRIGHTEST);
      break;
    case 2:
      selectShade(Shade.LIGHT);
      break;
    case 3:
      selectShade(Shade.DARK);
      break;
    case 4:
      selectShade(Shade.DARKEST);
      break;
  }
}

/**
 * Ends a paint stroke, and reports the change if the stroke painted anything.
 *
 * Listen for it on the whole window, so letting go of the button outside the canvas still ends the stroke.
 */
export function handlePointerUp(): void {
  if (state.stroke === null) return;

  const entry = state.stroke.entry;
  const edit: Edit = {
    entry,
    before: state.stroke.before,
    after: entry.drawing.pixels.slice(),
  };

  recordEdit(state.history, edit);

  state.stroke = null;
  state.onChange();
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
    const entry = state.currentEntry!;

    state.stroke = { entry, before: entry.drawing.pixels.slice() };
    setDrawingPixel(entry.drawing, point, state.currentShade);
    setChangedSinceSave(true);
  } else if (e.buttons === 2) {
    if (state.zoomedTile === null) state.zoomedTile = pixelToTile(point);
    else state.zoomedTile = null;

    resizeCanvas();
  }

  requestRender();
}

export function handlePointerMove(e: PointerEvent): void {
  if ((e.buttons & 1) !== 1) return;
  if (state.stroke === null) return;

  const point = pixelUnderPointer(e);

  if (point === null) return;

  setDrawingPixel(state.currentEntry!.drawing, point, state.currentShade);
  requestRender();
  setChangedSinceSave(true);
}

export function saveProject(): void {
  if (state.drawings.length === 0) return;

  downloadJson(projectToJson(state.drawings), "project.json");

  setChangedSinceSave(false);
}

/** Replaces all drawings, for example with the ones from an opened project file, and makes the first one current. */
export function replaceDrawings(entries: DrawingEntry[]): void {
  state.drawings = entries;
  state.currentEntry = null;
  state.zoomedTile = null;
  state.canvas.hidden = entries.length === 0;
  state.history = createHistory();

  // Select the first drawing, if it exists
  if (entries.length > 0) selectDrawing(state.drawings[0]);

  setChangedSinceSave(false);

  state.onChange();
}

export function exportDrawings(): void {
  if (state.drawings.length === 0) return;

  const allDrawings = state.drawings.map((e) => e.drawing);
  const tileSet = buildTileSet(allDrawings);
  const numTiles = tileSet.tiles.length;

  if (numTiles > MAX_TILES) {
    showError(
      "Can't export",
      `These drawings use ${numTiles} unique tiles; the Game Boy can only use ${MAX_TILES}.`,
    );
    return;
  }

  const tileData = encodeTiles(tileSet.tiles);
  downloadBinary(tileData, "tiles.2bpp");

  for (let i = 0; i < state.drawings.length; i++) {
    const entry = state.drawings[i];

    let tilemapData: Uint8Array<ArrayBuffer>;
    if (entry.kind === "background") {
      tilemapData = encodeTilemap(
        tileSet.tilemaps[i],
        entry.drawing.width / TILE_SIZE,
      );
    } else {
      tilemapData = encodeTileNumbers(tileSet.tilemaps[i]);
    }

    downloadBinary(tilemapData, `${fileNameFor(entry.name)}.tlm`);
  }
}

function warnBeforeLeaving(e: BeforeUnloadEvent): void {
  e.preventDefault();
}

export function hasUnsavedChanges(): boolean {
  return state.changedSinceSave;
}

/** Records whether the drawings changed since the last Save or Open, and warns before leaving the page only while they have. */
function setChangedSinceSave(changed: boolean): void {
  state.changedSinceSave = changed;

  if (changed) window.addEventListener("beforeunload", warnBeforeLeaving);
  else window.removeEventListener("beforeunload", warnBeforeLeaving);
}

/**
 * Undoes the newest paint stroke and shows the drawing it was in.
 *
 * Does nothing during a stroke, or when there's nothing to undo.
 */
function undo(): void {
  if (state.stroke !== null) return;

  const entry = undoEdit(state.history);

  if (entry !== null) showEdit(entry);
}

/**
 * Redoes the most recently undone paint stroke and shows the drawing it was in.
 *
 * Does nothing during a stroke, or when there's nothing to redo.
 */
function redo(): void {
  if (state.stroke !== null) return;

  const entry = redoEdit(state.history);

  if (entry !== null) showEdit(entry);
}

/** Shows an undone or redone edit: makes its drawing current, redraws it, marks unsaved changes and reports the change. */
function showEdit(entry: DrawingEntry): void {
  selectDrawing(entry);
  requestRender();
  setChangedSinceSave(true);

  state.onChange();
}
