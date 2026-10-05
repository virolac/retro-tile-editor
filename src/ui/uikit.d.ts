/** The parts of UIkit this app uses. UIkit itself is loaded by a <script> tag in index.html. */
declare const UIkit: {
  /** A string message is inserted as HTML. For text from outside, like file or drawing names, pass an element whose text was set with textContent (see dialogs.ts). */
  modal: {
    /** Shows a message and a text field filled with `value`. Resolves to the text when the user clicks OK, or null when they cancel or close the dialog. */
    prompt(message: string, value: string): Promise<string | null>;
    /** Shows a message with an OK button. Resolves when the dialog closes. */
    alert(message: string | HTMLElement): Promise<void>;
    /** Shows a message with OK and Cancel buttons. Resolves when the user clicks OK, and rejects when they cancel or close the dialog. */
    confirm(message: string | HTMLElement): Promise<void>;
  };
};
