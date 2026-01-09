export default class ButtonManager {
  constructor(containerHTML, hasButtons, l10n, onAction, empty = false) {
    this.containerHTML = containerHTML;
    this.hasButtons = hasButtons;
    this.onAction = onAction;
    this.parent = this.getParent();
    this.l10n = l10n;
    this.buttons = [];
    this.defaultButtons = this.getDefaultButtons();
    this.empty = empty;
  }

  getParent() {
    if (!this.parent) {
      this.parent = document.createElement("div");
      this.parent.className = "buttons-wrapper";
    }
    return this.parent;
  }

  showButton(buttonName) {
    const button = this.getButton(buttonName);
    if (button) {
      button.style.visibility = "visible";
      button.style.display = "block";
    }
  }

  hideButton(buttonName) {
    const button = this.getButton(buttonName);
    if (button) {
      button.style.visibility = "hidden";
      button.style.display = "none";
    }
  }

  getButton(buttonIdentifier) {
    const button =
      this.containerHTML.getElementsByClassName(buttonIdentifier)[0];
    return button;
  }

  async setupButtons() {
    if (!this.hasButtons) return;
    this.defaultButtons.forEach((buttonConfig) => {
      this.addButton(buttonConfig);
    });
  }

  /**
   * Adds an Button at the end of the buttons-list.
   * Example structure for an button:
   * {
   *   identifier: 'instructions',
   *   label: this.l10n.instructions,
   *   name: 'instructions',
   *   class: 'instructions',
   *   page: 'instructions',
   *   }
   * @param {E} button
   */
  addButton(buttonConfig) {
    if (!this.hasButtons) return;

    // Create button element
    const button = document.createElement("button");
    button.id = buttonConfig.identifier;
    button.classList.add(
      "button",
      buttonConfig.class,
      `button-${buttonConfig.class}`,
    );
    if (buttonConfig.additionalClass) {
      button.classList.add(buttonConfig.additionalClass);
    }
    button.textContent = buttonConfig.label;

    button.addEventListener("click", () => {
      if (this.onAction) {
        this.onAction(buttonConfig.action, buttonConfig.payload);
      }
    });

    // Append to DOM
    this.getParent().appendChild(button);

    // Store button in array with DOM reference
    this.buttons.push({ ...buttonConfig, dom: button });

    // Optionally add click listener (can be customized)
    if (buttonConfig.onClick) {
      button.addEventListener("click", buttonConfig.onClick);
    }

    return button;
  }

  /**
   * Returns default buttons
   */
  getDefaultButtons() {
    if (!this.empty) {
      return [
        {
          identifier: "runButton",
          name: "run",
          label: this.l10n.run,
          class: "run_code",
          action: "run",
        },
        {
          identifier: "showCodeButton",
          name: "show_code",
          label: this.l10n.showCode,
          class: "show_code",
          page: "code", // Find navbar container
          action: "showPage",
          payload: "code",
        },
      ];
    } else {
      return [];
    }
  }

  getHTMLClasses() {
    return this.hasButtons ? "has_buttons" : "not_has_buttons";
  }

  getDOM() {
    return this.getParent();
  }
}
