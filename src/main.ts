import { TILE_SIZE } from "./model/drawing";
import { isDrawingKind, projectFromJson } from "./model/project";
import { askToConfirm, showError } from "./ui/dialogs";
import * as editor from "./ui/editor";

window.addEventListener("keydown", editor.handleKey);

const versionSelect = document.querySelector<HTMLSelectElement>("#gbVersion")!;
versionSelect.addEventListener("change", () =>
  editor.setPaletteForVersion(versionSelect.value),
);

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
    drawingList.replaceChildren(); // Clear drawings list

    for (let i = 0; i < entries.length; i++) {
      const drawingListItem = addDrawingToList(i);
      if (i === 0) makeDrawingActive(drawingListItem, i);
    }

    setHasDrawings(entries.length > 0);
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

const newDrawingForm =
  document.querySelector<HTMLFormElement>("#newDrawingForm")!;
newDrawingForm.addEventListener("submit", newDrawingFormSubmitted);

const kindSelect = document.querySelector<HTMLSelectElement>("#kindSelect")!;

function newDrawingFormSubmitted(e: SubmitEvent): void {
  // Prevent page reload
  e.preventDefault();

  if (!isDrawingKind(kindSelect.value))
    throw new Error(`"${kindSelect.value}" is not a valid kind of drawing.`);

  const drawingIdx = editor.newDrawing(
    widthInput.valueAsNumber,
    heightInput.valueAsNumber,
    kindSelect.value,
  );

  const drawingListItem = addDrawingToList(drawingIdx);
  makeDrawingActive(drawingListItem, drawingIdx);

  setHasDrawings(true);
}

function addDrawingToList(drawingIdx: number): HTMLLIElement {
  const entry = editor.drawingEntry(drawingIdx);

  const drawingListItem = document.createElement("li");
  drawingListItem.classList.add("uk-flex", "uk-flex-middle");

  const drawingListItemContent = document.createElement("a");
  drawingListItemContent.classList.add("uk-flex-1");
  drawingListItemContent.setAttribute("href", "#");
  drawingListItemContent.addEventListener("click", (e: PointerEvent) => {
    e.preventDefault();
    makeDrawingActive(drawingListItem, drawingIdx);
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

    editor.renameDrawing(drawingIdx, newName);
    nameSpan.textContent = newName;
  });

  drawingListItem.append(drawingListItemContent, renameBtn);

  drawingList.append(drawingListItem);

  return drawingListItem;
}

function makeDrawingActive(item: HTMLLIElement, drawingIdx: number): void {
  const currentActiveDrawing =
    drawingList.querySelector<HTMLLIElement>(".uk-active");

  if (currentActiveDrawing) currentActiveDrawing.classList.remove("uk-active");

  item.classList.add("uk-active");

  editor.selectDrawing(drawingIdx);
}

function setHasDrawings(hasDrawings: boolean): void {
  placeholder.hidden = hasDrawings;
  saveBtn.disabled = !hasDrawings;
  exportBtn.disabled = !hasDrawings;
}

const canvas = document.querySelector<HTMLCanvasElement>("#editor")!;
canvas.addEventListener("pointerdown", editor.handlePointerDown);
canvas.addEventListener("pointermove", editor.handlePointerMove);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

editor.init(canvas);
