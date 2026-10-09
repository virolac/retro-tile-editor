import { MAX_TILES, TILE_SIZE } from "./model/drawing";
import { fileNameFor } from "./model/names";
import {
  isDrawingKind,
  projectFromJson,
  type DrawingEntry,
} from "./model/project";
import { Shade } from "./model/shade";
import { MAX_SPRITES, MAX_SPRITES_PER_LINE, spriteUsage } from "./model/sprite";
import { askToConfirm, showError } from "./ui/dialogs";
import * as editor from "./ui/editor";
import { cssColor } from "./ui/palette";

window.addEventListener("keydown", editor.handleKey);
window.addEventListener("pointerup", editor.handlePointerUp);

const versionSelect =
  document.querySelector<HTMLSelectElement>("#versionSelect")!;
versionSelect.addEventListener("change", () =>
  editor.setPaletteForVersion(versionSelect.value),
);

const spriteHeightSelect = document.querySelector<HTMLSelectElement>(
  "#spriteHeightSelect",
)!;
spriteHeightSelect.addEventListener("change", () => {
  const spriteHeight = spriteHeightSelect.value === "8" ? 8 : 16;

  editor.setSpriteHeight(spriteHeight);
});

const widthInput = document.querySelector<HTMLInputElement>("#widthInput")!;
const heightInput = document.querySelector<HTMLInputElement>("#heightInput")!;
const drawingList = document.querySelector<HTMLUListElement>("#drawingList")!;
const placeholder = document.querySelector<HTMLDivElement>("#placeholder")!;

const openInput = document.querySelector<HTMLInputElement>("#openInput")!;
openInput.addEventListener("change", async () => {
  const projectFile = openInput.files?.[0];

  if (!projectFile) return;

  try {
    const json = await projectFile.text();
    const entries = projectFromJson(json);

    if (editor.hasUnsavedChanges()) {
      const confirmTitle = "Replace your drawings?";
      const confirmMessage = `Opening ${projectFile.name} replaces your drawings, and the changes since your last save will be lost.`;

      const shouldReplace = await askToConfirm(confirmTitle, confirmMessage);

      if (!shouldReplace) return;
    }

    editor.replaceDrawings(entries);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    showError(`Couldn't open ${projectFile.name}`, errorMessage);
  } finally {
    // Ensure that the same file can be opened multiple times
    openInput.value = "";
  }
});

const saveBtn = document.querySelector<HTMLButtonElement>("#saveBtn")!;
saveBtn.addEventListener("click", editor.saveProject);

const exportBtn = document.querySelector<HTMLButtonElement>("#exportBtn")!;
exportBtn.addEventListener("click", editor.exportDrawings);

const pencilBtn = document.querySelector<HTMLButtonElement>("#pencilBtn")!;
pencilBtn.addEventListener("click", () => editor.selectTool("pencil"));

const fillBtn = document.querySelector<HTMLButtonElement>("#fillBtn")!;
fillBtn.addEventListener("click", () => editor.selectTool("fill"));

const shadePicker = document.querySelector<HTMLDivElement>("#shadePicker")!;

const gridCheckbox = document.querySelector<HTMLInputElement>("#gridCheckbox")!;
gridCheckbox.addEventListener("change", () =>
  editor.setGridVisible(gridCheckbox.checked),
);

const newDrawingForm =
  document.querySelector<HTMLFormElement>("#newDrawingForm")!;
newDrawingForm.addEventListener("submit", newDrawingFormSubmitted);

const kindSelect = document.querySelector<HTMLSelectElement>("#kindSelect")!;
const tileCountText =
  document.querySelector<HTMLParagraphElement>("#tileCount")!;
const spriteUsageText =
  document.querySelector<HTMLParagraphElement>("#spriteUsage")!;

/**
 * A button that shows `shade` in the color it has on the canvas.
 *
 * Clicking it makes `shade` the one painting uses.
 */
function createSwatch(shade: Shade): HTMLButtonElement {
  const shadeColor = editor.shadeColor(shade);

  const swatch = document.createElement("button");
  swatch.style.backgroundColor = cssColor(shadeColor);
  swatch.classList.add("swatch");
  swatch.classList.toggle("checkerboard", shadeColor[3] === 0);
  swatch.classList.toggle("uk-margin-small-left", shade > 0);
  swatch.setAttribute("type", "button");
  swatch.setAttribute("title", `Shade ${shade} (key ${shade + 1})`);
  swatch.setAttribute(
    "aria-pressed",
    shade === editor.currentShade() ? "true" : "false",
  );
  swatch.addEventListener("click", () => editor.selectShade(shade));

  return swatch;
}

/** Shows which tool is current: its button is blue and pressed. */
function renderToolPicker(): void {
  const currentTool = editor.currentTool();

  pencilBtn.classList.toggle("uk-button-primary", currentTool === "pencil");
  pencilBtn.classList.toggle("uk-button-default", currentTool !== "pencil");
  pencilBtn.setAttribute(
    "aria-pressed",
    currentTool === "pencil" ? "true" : "false",
  );

  fillBtn.classList.toggle("uk-button-primary", currentTool === "fill");
  fillBtn.classList.toggle("uk-button-default", currentTool !== "fill");
  fillBtn.setAttribute(
    "aria-pressed",
    currentTool === "fill" ? "true" : "false",
  );
}

/** Rebuilds the shade picker: one swatch per shade, in the color it has on the canvas, with the current one pressed. */
function renderShadePicker(): void {
  const allShades = Object.values(Shade);

  shadePicker.replaceChildren(...allShades.map(createSwatch));
}

function newDrawingFormSubmitted(e: SubmitEvent): void {
  // Prevent page reload
  e.preventDefault();

  if (!isDrawingKind(kindSelect.value))
    throw new Error(`"${kindSelect.value}" is not a valid kind of drawing.`);

  editor.newDrawing(
    widthInput.valueAsNumber,
    heightInput.valueAsNumber,
    kindSelect.value,
  );
}

/** Ticks the grid checkbox when the editor shows the grid lines. */
function renderGridCheckbox(): void {
  gridCheckbox.checked = editor.isGridVisible();
}

/** Rebuilds the drawing list from the editor's drawings, and shows or hides what depends on having any. */
function renderDrawingList(): void {
  const entries = editor.drawingEntries();
  drawingList.replaceChildren(...entries.map(createDrawingListItem));

  setHasDrawings(entries.length > 0);
}

function createDrawingListItem(entry: DrawingEntry): HTMLLIElement {
  const drawingListItem = document.createElement("li");
  drawingListItem.classList.add("uk-flex", "uk-flex-middle");
  if (entry === editor.currentEntry())
    drawingListItem.classList.add("uk-active");

  const drawingListItemContent = document.createElement("a");
  drawingListItemContent.classList.add("uk-flex-1");
  drawingListItemContent.setAttribute("href", "#");
  drawingListItemContent.addEventListener("click", (e: PointerEvent) => {
    e.preventDefault();
    editor.selectDrawing(entry);
  });

  const nameSpan = document.createElement("span");
  nameSpan.textContent = entry.name;

  const widthInTiles = entry.drawing.width / TILE_SIZE;
  const heightInTiles = entry.drawing.height / TILE_SIZE;

  const drawingListItemDetails = document.createElement("span");
  drawingListItemDetails.classList.add("uk-text-meta", "uk-margin-auto-left");
  drawingListItemDetails.textContent = `${widthInTiles}x${heightInTiles} ${entry.kind}`;

  drawingListItemContent.append(nameSpan, drawingListItemDetails);

  const renameBtn = document.createElement("a");
  renameBtn.classList.add("uk-icon-link", "uk-margin-small-left");
  renameBtn.setAttribute("href", "#");
  renameBtn.setAttribute("uk-icon", "pencil");
  renameBtn.addEventListener("click", async (e: PointerEvent) => {
    e.preventDefault();

    const newName = (
      await UIkit.modal.prompt("Rename drawing", entry.name)
    )?.trim();

    if (!newName) return;

    if (!editor.renameDrawing(entry, newName)) {
      const newFileName = fileNameFor(newName) + ".tlm";

      showError(
        "Name already taken",
        `Another drawing already exports to ${newFileName}. Names count as the same when they differ only in upper and lower case, or in spaces and dashes.`,
      );

      return;
    }
  });

  const deleteBtn = document.createElement("a");
  deleteBtn.classList.add("uk-icon-link", "uk-margin-small-left");
  deleteBtn.setAttribute("href", "#");
  deleteBtn.setAttribute("uk-icon", "trash");
  deleteBtn.addEventListener("click", async (e: PointerEvent) => {
    e.preventDefault();

    const confirmTitle = `Delete ${entry.name}?`;
    const confirmMessage = "The drawing will be removed from the project.";

    const shouldDelete = await askToConfirm(confirmTitle, confirmMessage);

    if (!shouldDelete) return;

    editor.deleteDrawing(entry);
  });

  drawingListItem.append(drawingListItemContent, renameBtn, deleteBtn);

  return drawingListItem;
}

function setHasDrawings(hasDrawings: boolean): void {
  placeholder.hidden = hasDrawings;
  saveBtn.disabled = !hasDrawings;
  exportBtn.disabled = !hasDrawings;
}

/** Shows how many tiles the export would write, in red when that's more than the Game Boy can hold. */
function renderTileCount(): void {
  const numTiles = editor.tileCount();
  const tooManyTiles = numTiles > MAX_TILES;

  tileCountText.textContent = `${numTiles} of ${MAX_TILES} tiles`;
  tileCountText.classList.toggle("uk-text-danger", tooManyTiles);

  if (tooManyTiles) tileCountText.textContent += " (too many to export)";
}

/**
 * For a sprite, shows how many hardware sprites it needs.
 *
 * In red when that's more than the Game Boy can show.
 * Hidden for backgrounds.
 */
function renderSpriteUsage(): void {
  const entry = editor.currentEntry();

  if (entry === null) {
    spriteUsageText.hidden = true;
    return;
  }

  const usage = spriteUsage(entry.drawing, editor.spriteHeight());
  const tooManySprites =
    usage.total > MAX_SPRITES || usage.perLine > MAX_SPRITES_PER_LINE;

  spriteUsageText.textContent = `${entry.name} uses ${usage.total} of ${MAX_SPRITES} sprites, ${usage.perLine} of ${MAX_SPRITES_PER_LINE} per line`;
  spriteUsageText.classList.toggle("uk-text-danger", tooManySprites);
  spriteUsageText.hidden = entry.kind === "background";

  if (tooManySprites)
    spriteUsageText.textContent += " (more than the Game Boy can show)";
}

/** Rebuilds everything in the sidebar from the editor's state: the tool, the shade picker, the grid checkbox, the drawing list, the tile count and the sprite usage. */
function renderSidebar(): void {
  renderToolPicker();
  renderShadePicker();
  renderGridCheckbox();
  renderDrawingList();
  renderTileCount();
  renderSpriteUsage();
}

const canvas = document.querySelector<HTMLCanvasElement>("#editor")!;
canvas.addEventListener("pointerdown", editor.handlePointerDown);
canvas.addEventListener("pointermove", editor.handlePointerMove);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

editor.init(canvas, renderSidebar);
