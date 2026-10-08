import type { DrawingEntry } from "./project";

/** How many edits the history keeps. Each one holds two copies of a drawing's pixels, so it can't grow forever. */
export const MAX_EDITS = 100;

/** One change to a drawing's pixels, such as a paint stroke, kept so it can be undone and redone. */
export type Edit = {
  /** The drawing that changed. */
  entry: DrawingEntry;
  /** Its pixels before the change. */
  before: Uint8Array;
  /** Its pixels after the change. */
  after: Uint8Array;
};

/** The edits that can be undone and redone, oldest first. */
export type History = {
  undoable: Edit[];
  redoable: Edit[];
};

/** A history with nothing to undo or redo. */
export function createHistory(): History {
  return { undoable: [], redoable: [] };
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }

  return true;
}

/**
 * Adds a finished edit, unless it changed nothing.
 *
 * Whatever could be redone is dropped, because it was undone from pixels this edit has changed since.
 * Only the newest MAX_EDITS edits are kept.
 */
export function recordEdit(history: History, edit: Edit): void {
  if (equalBytes(edit.before, edit.after)) return;

  history.undoable.push(edit);
  history.redoable = [];

  const numEdits = history.undoable.length;
  if (numEdits > MAX_EDITS)
    history.undoable = history.undoable.slice(numEdits - MAX_EDITS);
}

/**
 * Puts back the pixels from before the newest edit, and returns its drawing.
 *
 * Returns null when there's nothing to undo.
 */
export function undoEdit(history: History): DrawingEntry | null {
  const edit = history.undoable.pop();

  if (!edit) return null;

  const drawing = edit.entry.drawing;
  drawing.pixels.set(edit.before, 0);

  history.redoable.push(edit);

  return edit.entry;
}

/**
 * Puts back the pixels from after the most recently undone edit, and returns its drawing.
 *
 * Returns null when there's nothing to redo.
 */
export function redoEdit(history: History): DrawingEntry | null {
  const edit = history.redoable.pop();

  if (!edit) return null;

  const drawing = edit.entry.drawing;
  drawing.pixels.set(edit.after, 0);

  history.undoable.push(edit);

  return edit.entry;
}

/** Drops every edit of `entry`, for when it's deleted: those edits can't be undone or redone anymore. */
export function forgetEdits(history: History, entry: DrawingEntry): void {
  history.undoable = history.undoable.filter((e) => e.entry !== entry);
  history.redoable = history.redoable.filter((e) => e.entry !== entry);
}
