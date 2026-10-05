/** Shows an error in a dialog, with a title above the message. */
export function showError(title: string, message: string): void {
  const titleElem = document.createElement("h2");
  titleElem.classList.add("uk-modal-title");
  titleElem.textContent = title;

  const messageElem = document.createElement("p");
  messageElem.textContent = message;

  const content = document.createElement("div");
  content.append(titleElem, messageElem);

  UIkit.modal.alert(content);
}
