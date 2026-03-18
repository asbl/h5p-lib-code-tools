/**
 * @typedef {object} ButtonManagerOptions
 * @property {boolean} [showStorageButtons] - Whether default save/load buttons should be created.
 */

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
   * @param {ButtonManagerOptions} [options] - Additional manager options.
   */
  constructor(containerHTML, hasButtons, l10n, onAction, empty = false, options = {}) {
    this.containerHTML = containerHTML;
    this.hasButtons = hasButtons;
    this.onAction = onAction;
    this.parent = this.getParent();
    this.l10n = l10n;
    this.empty = empty;
    this.options = options;
    this.showStorageButtons = options.showStorageButtons !== false;
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
    this.setButtonVisibility(buttonName, true);
  }

  /**
   * Hides a button by setting its display and visibility.
   * @param {string} buttonName - Identifier of the button to hide.
   */
  hideButton(buttonName) {
    this.setButtonVisibility(buttonName, false);
  }

  /**
   * Updates the DOM visibility of one button.
   * @param {string} buttonName - Identifier of the button.
   * @param {boolean} isVisible - Whether the button should be visible.
   * @returns {void}
   */
  setButtonVisibility(buttonName, isVisible) {
    const buttonObj = this.buttons.get(buttonName);
    if (buttonObj?.dom) {
      buttonObj.dom.style.visibility = isVisible ? 'visible' : 'hidden';
      buttonObj.dom.style.display = isVisible ? 'block' : 'none';
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
    this.addButtons(this.defaultButtons);
  }

  /**
   * Adds multiple buttons in registration order.
   * @param {object[]} [buttonConfigs] - Button definitions.
   * @returns {HTMLButtonElement[]} Created button elements.
   */
  addButtons(buttonConfigs = []) {
    return buttonConfigs
      .map((buttonConfig) => this.addButton(buttonConfig))
      .filter(Boolean);
  }

  /**
   * Adds a button to the container and stores it internally.
   * @param {object} buttonConfig - Configuration for the button.
   * @param {string} buttonConfig.identifier - Unique identifier of the button.
   * @param {string} buttonConfig.label - Label text of the button.
   * @param {string} buttonConfig.class - CSS class of the button.
   * @param {string} [buttonConfig.additionalClass] - Optional additional CSS class.
   * @param {string} [buttonConfig.state] - Optional: visible or hidden.
   * @returns {HTMLButtonElement|undefined} The created button element.
   */
  addButton(buttonConfig) {
    if (!this.hasButtons) return;

    if (!buttonConfig?.identifier) {
      throw new Error('buttonConfig.identifier is required');
    }

    if (this.buttons.has(buttonConfig.identifier)) {
      throw new Error(`Button '${buttonConfig.identifier}' is already registered.`);
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.id = buttonConfig.identifier;
    button.classList.add(
      'button',
      buttonConfig.class,
      `button-${buttonConfig.class}`
    );

    if (buttonConfig.additionalClass) {
      button.classList.add(buttonConfig.additionalClass);
    }
    if (buttonConfig.icon) {
      button.appendChild(this.createIconElement(buttonConfig.icon, buttonConfig.label !== ''));
    }

    if (buttonConfig.title) {
      button.title = buttonConfig.title;
    }

    if (buttonConfig.ariaLabel || buttonConfig.label === '') {
      button.setAttribute('aria-label', buttonConfig.ariaLabel || this.getFallbackAriaLabel(buttonConfig));
    }

    const textNode = document.createTextNode(buttonConfig.label);
    button.appendChild(textNode);

    this.buttons.set(buttonConfig.identifier, {
      config: buttonConfig,
      dom: button,
      index: this.buttonIndex++
    });

    if (buttonConfig.state === 'hidden') {
      this.setButtonVisibility(buttonConfig.identifier, false);
    }

    return button;
  }

  /**
   * Creates an icon element for a button.
   * @param {string} iconClass - Font Awesome class list.
   * @param {boolean} hasLabel - Whether the button also has visible text.
   * @returns {HTMLElement} Icon wrapper element.
   */
  createIconElement(iconClass, hasLabel = false) {
    const iconWrapper = document.createElement('span');
    iconWrapper.className = 'button-icon';

    if (hasLabel) {
      iconWrapper.style.marginRight = '0.5em';
    }

    const iconElement = document.createElement('i');
    iconClass.split(' ').forEach((cls) => iconElement.classList.add(cls));
    iconWrapper.appendChild(iconElement);

    return iconWrapper;
  }

  /**
   * Updates a button icon in place.
   * @param {string} buttonName - Identifier of the button.
   * @param {string} iconClass - New icon class list.
   */
  setButtonIcon(buttonName, iconClass) {
    const buttonObj = this.buttons.get(buttonName);
    if (!buttonObj?.dom) return;

    buttonObj.config.icon = iconClass;

    const iconElement = this.createIconElement(iconClass, buttonObj.config.label !== '');
    const existingIcon = buttonObj.dom.querySelector('.button-icon');

    if (existingIcon) {
      existingIcon.replaceWith(iconElement);
    }
    else {
      buttonObj.dom.insertBefore(iconElement, buttonObj.dom.firstChild);
    }
  }

  /**
   * Updates a button aria-label.
   * @param {string} buttonName - Identifier of the button.
   * @param {string} ariaLabel - Accessible label.
   */
  setButtonAriaLabel(buttonName, ariaLabel) {
    const buttonObj = this.buttons.get(buttonName);
    if (!buttonObj?.dom) return;

    buttonObj.config.ariaLabel = ariaLabel;
    buttonObj.dom.setAttribute('aria-label', ariaLabel);
  }

  /**
   * Updates a button title.
   * @param {string} buttonName - Identifier of the button.
   * @param {string} title - Button title.
   */
  setButtonTitle(buttonName, title) {
    const buttonObj = this.buttons.get(buttonName);
    if (!buttonObj?.dom) return;

    buttonObj.config.title = title;
    buttonObj.dom.title = title;
  }

  /**
   * Builds a fallback aria-label for icon-only buttons.
   * @param {object} buttonConfig - Button configuration.
   * @returns {string} Fallback label.
   */
  getFallbackAriaLabel(buttonConfig) {
    return (buttonConfig.name || buttonConfig.identifier || 'button')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .trim();
  }

  /**
   * Returns an array of default button configurations.
   * @returns {object[]} Default button configurations
   */
  getDefaultButtons() {
    if (!this.empty) {
      const buttons = [
        {
          identifier: 'runButton',
          name: 'run',
          icon: 'fa-solid fa-play',
          label: this.l10n.run,
          class: 'run_code',
          state: 'visible',
          active: true,
          weight: -1
        },
        {
          identifier: 'stopButton',
          name: 'stop_button',
          icon: 'fa-solid fa-stop',
          label: this.l10n.stop,
          class: 'stop_button',
          state: 'hidden',
          active: false,
          weight: -1
        },
        {
          identifier: 'showCodeButton',
          name: 'show_code',
          label: this.l10n.showCode,
          class: 'show_code',
          state: 'hidden',
          active: false,
          weight: -1
        },
      ];

      if (this.showStorageButtons) {
        buttons.push(
          {
            identifier: 'saveButton',
            name: 'save',
            icon: 'fa-solid fa-floppy-disk',
            label: this.l10n.save,
            class: 'save_button',
            state: 'visible',
            active: false,
            weight: 1,
          },
          {
            identifier: 'loadButton',
            name: 'load',
            icon: 'fa-solid fa-upload',
            label: this.l10n.load,
            class: 'load_button',
            state: 'visible',
            active: false,
            weight: 1,
          },
        );
      }

      return buttons;
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
