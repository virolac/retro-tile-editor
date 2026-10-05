/** The parts of UIkit this app uses. UIkit itself is loaded by a <script> tag in index.html. */
declare const UIkit: {
  modal: {
    prompt(message: string, value: string): Promise<string | null>;
    alert(message: string | HTMLElement): Promise<void>;
  };
};
