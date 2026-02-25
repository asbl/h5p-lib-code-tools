/**
 * Manages a collection of buttons that can be shown, hidden, or updated.
 * Buttons are stored internally, so they are accessible even if not attached to the DOM.
 */
export default class ButtonManager {
  /**
   * @param {HTMLElement} containerHTML - The container element where buttons are appended.
   * @param {boolean} hasButtons - Whether buttons should be created.
   * @param {object} l10n - Localization object containing button labels.
   * @param {function} onAction - Callback function for button actions.
   * @param {boolean} [empty] - Whether to create default buttons or not.
   */
  constructor(containerHTML, hasButtons, l10n, onAction, empty = false) {
    this.containerHTML = containerHTML;
    this.hasButtons = hasButtons;
    this.onAction = onAction;
    this.parent = this.getParent();
    this.l10n = l10n;
    this.empty = empty;
    this.buttons = new Map();
    this.buttonIndex = 0;

    /**
     * @type {Map<string, {config: object, dom: HTMLButtonElement}>}
     * Stores buttons by identifier with config and DOM an element
     */
    this.buttons = new Map();

    /** @type {object[]} Default buttons configuration */
    this.defaultButtons = this.getDefaultButtons();
  }

  /**
   * Returns the parent container for buttons. Creates it if it doesn't exist.
   * @returns {HTMLElement} The parent HTML-Element
   */
  getParent() {
    if (!this.parent) {
      this.parent = document.createElement('div');
      this.parent.className = 'buttons-wrapper';
    }
    return this.parent;
  }

  /**
   * Shows a button by setting its display and visibility.
   * @param {string} buttonName - Identifier of the button to show.
   */
  showButton(buttonName) {
    const buttonObj = this.buttons.get(buttonName);
    if (buttonObj?.dom) {
      buttonObj.dom.style.visibility = 'visible';
      buttonObj.dom.style.display = 'block';
    }
  }

  /**
   * Hides a button by setting its display and visibility.
   * @param {string} buttonName - Identifier of the button to hide.
   */
  hideButton(buttonName) {
    const buttonObj = this.buttons.get(buttonName);
    if (buttonObj?.dom) {
      buttonObj.dom.style.visibility = 'hidden';
      buttonObj.dom.style.display = 'none';
    }
  }

  /**
   * Updates a button visibility based on a boolean flag.
   * @param {string} buttonName - Identifier of the button.
   * @param {boolean} show - Whether to show or hide the button.
   */
  updateButton(buttonName, show) {
    show ? this.showButton(buttonName) : this.hideButton(buttonName);
  }

  /**
   * Returns a button element by identifier, even if not in the DOM.
   * @param {string} buttonName - Identifier of the button.
   * @returns {HTMLButtonElement | null} The button element or null if not found.
   */
  getButton(buttonName) {
    const buttonObj = this.buttons.get(buttonName);
    return buttonObj?.dom || null;
  }

  /**
   * Creates and adds default buttons to the container.
   */
  async setupButtons() {
    if (!this.hasButtons) return;
    this.defaultButtons.forEach((buttonConfig) => this.addButton(buttonConfig));
  }

  /**
   * Adds a button to the container and stores it internally.
   * @param {object} buttonConfig - Configuration for the button.
   * @param {string} buttonConfig.identifier - Unique identifier of the button.
   * @param {string} buttonConfig.label - Label text of the button.
   * @param {string} buttonConfig.class - CSS class of the button.
   * @param {string} [buttonConfig.additionalClass] - Optional additional CSS class.
   * @param {string} [buttonConfig.state] - Optional: visible or hidden
   * @returns {HTMLButtonElement} The created button element.
   */
  addButton(buttonConfig) {
    if (!this.hasButtons) return;

    const button = document.createElement('button');
    button.id = buttonConfig.identifier;
    button.classList.add(
      'button',
      buttonConfig.class,
      `button-${buttonConfig.class}`
    );

    if (buttonConfig.additionalClass) {
      button.classList.add(buttonConfig.additionalClass);
    }

    button.textContent = buttonConfig.label;

    this.buttons.set(buttonConfig.identifier, {
      config: buttonConfig,
      dom: button,
      index: this.buttonIndex++
    });

    if (buttonConfig.state === 'hidden') {
      button.style.visibility = 'hidden';
      button.style.display = 'none';
    }

    return button;
  }

  /**
   * Returns an array of default button configurations.
   * @returns {object[]} Default button configurations
   */
  getDefaultButtons() {
    if (!this.empty) {
      return [
        {
          identifier: 'runButton',
          name: 'run',
          label: '▶ Run',
          class: 'run_code',
          state: 'visible',
          active: true,
          weight: -1
        },
        {
          identifier: 'stopButton',
          name: 'stop_button',
          label: '⏹ Stop',
          class: 'stop_button',
          state: 'hidden',
          active: false,
          weight: -1
        },
        {
          identifier: 'showCodeButton',
          name: 'show_code',
          label: '⌨ Code',
          class: 'show_code',
          state: 'hidden',
          active: false,
          weight: -1
        },
        {
          identifier: 'saveButton',
          name: 'save',
          label: '🖪 Save',
          class: 'save_button',
          state: 'visible',
          active: false,
          weight: 1
        },
        {
          identifier: 'loadButton',
          name: 'load',
          label: '🗂 Load',
          class: 'load_button',
          state: 'visible',
          active: false,
          weight: 1,
        },
      ];
    }
    return [];
  }

  /**
   * Returns CSS classes indicating whether buttons exist.
   * @returns {string} "has_buttons" or "not_has_buttons"
   */
  getHTMLClasses() {
    return this.hasButtons ? 'has_buttons' : 'not_has_buttons';
  }

  /**
   * Returns the parent container DOM element.
   * @returns {HTMLElement} gets the navbar-dom
   */
  getDOM() {
    const parent = this.getParent();

    // make sure, content is not rendered twice
    parent.innerHTML = '';

    const sortedButtons = this.getSortedButtons();

    sortedButtons.forEach(({ dom }) => {
      parent.appendChild(dom);
    });

    return parent;
  }

  getSortedButtons() {
    return Array.from(this.buttons.values()).sort((a, b) => {
      const weightA = a.config.weight ?? 0;
      const weightB = b.config.weight ?? 0;

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      // stable order
      return a.index - b.index;
    });
  }

  /**
   * Sets the given button as active and removes the active state from all others.
   * @param {string} buttonName - Identifier of the button to activate.
   */
  setActive(buttonName) {
    this.buttons.forEach((buttonObj, name) => {
      if (!buttonObj?.dom) return;

      if (name === buttonName) {
        buttonObj.dom.classList.add('active');
        buttonObj.config.active = true;
      }
      else {
        buttonObj.dom.classList.remove('active');
        buttonObj.config.active = false;
      }
    });
  }

  /**
   * Returns whether a button is currently active.
   * @param {string} buttonName The name of the button
   * @returns {boolean} true, if button is active
   */
  isButtonActive(buttonName) {
    return this.buttons.get(buttonName)?.config.active === true;
  }


  /**
   * Removes active-flag from a button
   */
  clearActiveButton() {
    this.buttons.forEach((buttonObj) => {
      if (!buttonObj?.dom) return;
      buttonObj.dom.classList.remove('active');
      buttonObj.config.active = false;
    });
  }

}
