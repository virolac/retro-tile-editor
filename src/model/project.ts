import { createDrawing, TILE_SIZE, type Drawing } from "./drawing";

export type DrawingKind = "background" | "sprite";

export function isDrawingKind(value: string): value is DrawingKind {
  return value === "background" || value === "sprite";
}

export type DrawingEntry = {
  kind: DrawingKind;
  name: string;
  drawing: Drawing;
};

/** A drawing as stored in a project file: one string of shade digits (0–3) per pixel row. */
export type SavedDrawing = {
  name: string;
  kind: DrawingKind;
  rows: string[];
};

/** The contents of a project file. `version` lets later versions of the editor tell old files from new ones. */
export type ProjectFile = {
  version: 1;
  drawings: SavedDrawing[];
};

/** Turns the drawings into the text of a project file: JSON, indented, one line per pixel row. */
export function projectToJson(entries: DrawingEntry[]): string {
  const projectFile: ProjectFile = {
    version: 1,
    drawings: [],
  };

  for (const entry of entries) {
    const entryDrawing = entry.drawing;
    const savedDrawing: SavedDrawing = {
      name: entry.name,
      kind: entry.kind,
      rows: new Array(entryDrawing.height),
    };

    for (let i = 0; i < savedDrawing.rows.length; i++) {
      const rowStart = i * entryDrawing.width;
      const row = entryDrawing.pixels.subarray(
        rowStart,
        rowStart + entryDrawing.width,
      );

      savedDrawing.rows[i] = row.join("");
    }

    projectFile.drawings.push(savedDrawing);
  }

  return JSON.stringify(projectFile, null, 2);
}

/** Throws an error that says what's wrong unless `value` is a project file this editor can read. */
function assertProjectFile(value: unknown): asserts value is ProjectFile {
  if (typeof value !== "object" || value === null) {
    throw new Error("This isn't a project file.");
  }

  if (!("version" in value)) {
    throw new Error("This isn't a project file: it has no version.");
  }

  if (value.version !== 1) {
    throw new Error(
      `This project file is version ${JSON.stringify(value.version)}, but this editor can only read version 1.`,
    );
  }

  if (!("drawings" in value) || !Array.isArray(value.drawings)) {
    throw new Error("This project file has no list of drawings.");
  }

  for (let i = 0; i < value.drawings.length; i++) {
    assertSavedDrawing(value.drawings[i], i);
  }
}

/**
 * Throws an error that says what's wrong unless `value` is a drawing as stored
 * in a project file. `index` is its position in the file, for the messages.
 */
function assertSavedDrawing(
  value: unknown,
  index: number,
): asserts value is SavedDrawing {
  const byPosition = `Drawing ${index + 1}`;

  if (typeof value !== "object" || value === null) {
    throw new Error(`${byPosition} isn't a drawing.`);
  }

  if (!("name" in value) || typeof value.name !== "string") {
    throw new Error(`${byPosition} has no name, or its name isn't text.`);
  }

  // Now that the name is known to be text, the messages can use it
  const byName = `Drawing "${value.name}"`;

  if (
    !("kind" in value) ||
    typeof value.kind !== "string" ||
    !isDrawingKind(value.kind)
  ) {
    throw new Error(`${byName} needs a kind of "background" or "sprite".`);
  }

  if (!("rows" in value) || !Array.isArray(value.rows)) {
    throw new Error(`${byName} has no list of rows.`);
  }

  const badRow = value.rows.findIndex((row) => typeof row !== "string");

  if (badRow !== -1) {
    throw new Error(`${byName}: row ${badRow + 1} isn't a string of digits.`);
  }
}

/** Builds a drawing from rows of digits. Throws if the rows aren't whole tiles, aren't all as long, or hold anything but 0–3. */
function drawingFromRows(rows: string[], name: string): Drawing {
  const height = rows.length;
  const byName = `Drawing "${name}"`;

  if (height === 0) throw new Error(`${byName} must have non-zero height.`);

  if (height % TILE_SIZE !== 0) {
    throw new Error(
      `${byName} is ${height} pixels tall, which isn't a whole number of tiles.`,
    );
  }

  const width = rows[0].length;
  if (width === 0) throw new Error(`${byName} must have non-zero width.`);

  if (width % TILE_SIZE !== 0) {
    throw new Error(
      `${byName} is ${width} pixels wide, which isn't a whole number of tiles.`,
    );
  }

  const drawing = createDrawing(width / TILE_SIZE, height / TILE_SIZE);
  for (let i = 0; i < height; i++) {
    if (rows[i].length !== width) {
      throw new Error(
        `${byName}: row ${i + 1} is ${rows[i].length} pixels long, but row 1 is ${width}.`,
      );
    }

    if (!/^[0-3]+$/.test(rows[i])) {
      throw new Error(
        `${byName}: row ${i + 1} has a pixel that isn't 0, 1, 2 or 3.`,
      );
    }

    const shades = rows[i].split("").map((n) => parseInt(n, 10));
    drawing.pixels.set(shades, i * drawing.width);
  }

  return drawing;
}

/** Reads the text of a project file back into drawings. Throws if the text isn't a valid project file. */
export function projectFromJson(json: string): DrawingEntry[] {
  const value: unknown = JSON.parse(json);

  assertProjectFile(value);

  const entries: DrawingEntry[] = [];
  for (const savedDrawing of value.drawings) {
    entries.push({
      name: savedDrawing.name,
      kind: savedDrawing.kind,
      drawing: drawingFromRows(savedDrawing.rows, savedDrawing.name),
    });
  }

  return entries;
}
