import type { DrawingEntry } from "./project";

/** The name of a drawing's .tlm file on export, without the extension: lowercase, with spaces turned into dashes. */
export function fileNameFor(name: string): string {
  return name.toLowerCase().replaceAll(" ", "-");
}

/**
 * Whether a drawing in `entries` other than `except` would export to the same file name as `name`.
 *
 * When renaming, pass the drawing being renamed as `except`, so its own name doesn't count.
 */
export function isNameTaken(
  name: string,
  entries: readonly DrawingEntry[],
  except?: DrawingEntry,
): boolean {
  return entries.some(
    (e) => e !== except && fileNameFor(e.name) === fileNameFor(name),
  );
}

/** The first of "Drawing 1", "Drawing 2", "Drawing 3", … that isn't taken in `entries`. */
export function defaultDrawingName(entries: readonly DrawingEntry[]): string {
  let i = 1;

  while (true) {
    const name = `Drawing ${i}`;

    if (!isNameTaken(name, entries)) return name;

    i++;
  }
}
