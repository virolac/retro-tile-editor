function dialogContent(title: string, message: string): HTMLElement {
  const titleElem = document.createElement("h2");
  titleElem.classList.add("uk-modal-title");
  titleElem.textContent = title;

  const messageElem = document.createElement("p");
  messageElem.textContent = message;

  const content = document.createElement("div");
  content.append(titleElem, messageElem);

  return content;
}

/** Shows an error in a dialog, with a title above the message. */
export function showError(title: string, message: string): void {
  UIkit.modal.alert(dialogContent(title, message));
}

/** Asks for confirmation in a dialog. Resolves to true for OK, false for Cancel. */
export async function askToConfirm(
  title: string,
  message: string,
): Promise<boolean> {
  try {
    await UIkit.modal.confirm(dialogContent(title, message));

    return true;
  } catch {
    return false;
  }
}
