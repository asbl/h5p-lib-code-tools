import ButtonClickedObserver from './observer/buttonclickedobserver.js';
import PageHideObserver from './observer/pagehideobserver.js';
import PageShowObserver from './observer/pageshowobserver.js';
import StateRunObserver from './observer/staterunobserver.js';
import StateStopObserver from './observer/statestopobserver.js';

export const OBSERVER_TYPES = Object.freeze({
  BUTTON_CLICK: 'button-click',
  PAGE_SHOW: 'page-show',
  PAGE_HIDE: 'page-hide',
  STATE_RUN: 'state-run',
  STATE_STOP: 'state-stop',
});

/**
 * Registers pages, buttons, and observers from declarative definitions.
 */
export default class UIRegistryManager {
  /**
   * @param {object} codeContainer - Container owning the UI managers.
   */
  constructor(codeContainer) {
    this.codeContainer = codeContainer;
  }

  /**
   * Registers a complete UI definition.
   * @param {object} [definition] - UI definition.
   * @param {object[]} [definition.pages] - Page definitions.
   * @param {object[]} [definition.buttons] - Button definitions.
   * @param {object[]} [definition.observers] - Observer definitions.
   * @returns {void}
   */
  register(definition = {}) {
    this.registerPages(definition.pages);
    this.registerButtons(definition.buttons);
    this.registerObservers(definition.observers);
  }

  /**
   * Registers page definitions.
   * @param {object[]} [pageDefinitions] - Page definitions.
   * @returns {void}
   */
  registerPages(pageDefinitions = []) {
    pageDefinitions.forEach((definition) => {
      if (!this.shouldRegister(definition)) {
        return;
      }

      this.codeContainer.getPageManager().registerPage({
        name: this.resolveRequiredValue(definition.name, 'page name'),
        content: this.resolveDynamicValue(definition.content, ''),
        additionalClass: this.resolveDynamicValue(definition.additionalClass, ''),
        front: this.resolveDynamicValue(definition.front, false) === true,
        visible: this.resolveDynamicValue(definition.visible, true) !== false,
      });
    });
  }

  /**
   * Registers button definitions.
   * @param {object[]} [buttonDefinitions] - Button definitions.
   * @returns {void}
   */
  registerButtons(buttonDefinitions = []) {
    buttonDefinitions.forEach((definition) => {
      if (!this.shouldRegister(definition)) {
        return;
      }

      this.codeContainer.getButtonManager().addButton({
        identifier: this.resolveRequiredValue(definition.identifier, 'button identifier'),
        label: this.resolveDynamicValue(definition.label, ''),
        class: this.resolveRequiredValue(definition.class, 'button class'),
        icon: this.resolveDynamicValue(definition.icon),
        name: this.resolveDynamicValue(definition.name),
        ariaLabel: this.resolveDynamicValue(definition.ariaLabel),
        title: this.resolveDynamicValue(definition.title),
        additionalClass: this.resolveDynamicValue(definition.additionalClass),
        state: this.resolveDynamicValue(definition.state),
        weight: this.resolveDynamicValue(definition.weight),
        active: this.resolveDynamicValue(definition.active),
      });
    });
  }

  /**
   * Registers observer definitions.
   * @param {object[]} [observerDefinitions] - Observer definitions.
   * @returns {void}
   */
  registerObservers(observerDefinitions = []) {
    observerDefinitions.forEach((definition) => {
      if (!this.shouldRegister(definition)) {
        return;
      }

      this.codeContainer.getObserverManager().register(
        this.resolveRequiredValue(definition.name, 'observer name'),
        this.createObserver(definition),
      );
    });
  }

  /**
   * Determines whether a definition should be registered.
   * @param {object} [definition] - Any UI definition.
   * @returns {boolean} True if the definition should be applied.
   */
  shouldRegister(definition = {}) {
    if (definition.when === undefined) {
      return true;
    }

    return this.resolvePredicate(definition.when);
  }

  /**
   * Creates an observer from a declarative definition.
   * @param {object} definition - Observer definition.
   * @returns {object} Instantiated observer.
   */
  createObserver(definition) {
    if (typeof definition.factory === 'function') {
      return definition.factory.call(this.codeContainer, this.codeContainer, this);
    }

    const callback = this.resolveCallback(definition.callback);
    const type = this.resolveRequiredValue(definition.type, 'observer type');

    switch (type) {
      case OBSERVER_TYPES.BUTTON_CLICK:
        return new ButtonClickedObserver(
          this.resolveButtonTarget(definition),
          callback,
        );

      case OBSERVER_TYPES.PAGE_SHOW:
        return new PageShowObserver(
          this.resolvePageTarget(definition),
          callback,
        );

      case OBSERVER_TYPES.PAGE_HIDE:
        return new PageHideObserver(
          this.resolvePageTarget(definition),
          callback,
        );

      case OBSERVER_TYPES.STATE_RUN:
        return new StateRunObserver(
          this.codeContainer.getStateManager(),
          callback,
        );

      case OBSERVER_TYPES.STATE_STOP:
        return new StateStopObserver(
          this.codeContainer.getStateManager(),
          callback,
        );

      default:
        throw new Error(`Unsupported observer type: ${type}`);
    }
  }

  /**
   * Resolves a button target for an observer definition.
   * @param {object} definition - Observer definition.
   * @returns {HTMLElement} Button DOM element.
   */
  resolveButtonTarget(definition) {
    if (definition.target !== undefined) {
      return this.resolveRequiredTarget(definition.target, 'button target');
    }

    const buttonName = this.resolveRequiredValue(definition.button, 'button name');
    return this.resolveRequiredTarget(
      this.codeContainer.getButtonManager().getButton(buttonName),
      `button '${buttonName}'`,
    );
  }

  /**
   * Resolves a page target for an observer definition.
   * @param {object} definition - Observer definition.
   * @returns {HTMLElement} Page DOM element.
   */
  resolvePageTarget(definition) {
    if (definition.target !== undefined) {
      return this.resolveRequiredTarget(definition.target, 'page target');
    }

    const pageName = this.resolveRequiredValue(definition.page, 'page name');
    return this.resolveRequiredTarget(
      this.codeContainer.getPageManager().getPage(pageName),
      `page '${pageName}'`,
    );
  }

  /**
   * Resolves a callback from a method name or function.
   * @param {string|function} callback - Callback definition.
   * @returns {function} Bound callback.
   */
  resolveCallback(callback) {
    if (typeof callback === 'string') {
      return this.getContainerMethod(callback).bind(this.codeContainer);
    }

    if (typeof callback === 'function') {
      return callback.bind(this.codeContainer);
    }

    throw new Error('Observer callback must be a function or container method name.');
  }

  /**
   * Resolves a predicate from a method name, function, or raw value.
   * @param {string|function|boolean} predicate - Predicate definition.
   * @returns {boolean} Predicate result.
   */
  resolvePredicate(predicate) {
    if (typeof predicate === 'string') {
      return Boolean(this.getContainerMethod(predicate).call(this.codeContainer));
    }

    if (typeof predicate === 'function') {
      return Boolean(predicate.call(this.codeContainer, this.codeContainer));
    }

    return Boolean(predicate);
  }

  /**
   * Resolves a dynamic value from a raw value or callback.
   * @param {*} value - Raw value or callback.
   * @param {*} [defaultValue] - Fallback if value is undefined.
   * @returns {*} Resolved value.
   */
  resolveDynamicValue(value, defaultValue = undefined) {
    if (value === undefined) {
      return defaultValue;
    }

    if (typeof value === 'function') {
      return value.call(this.codeContainer, this.codeContainer);
    }

    return value;
  }

  /**
   * Resolves a required value and validates that it is present.
   * @param {*} value - Raw or dynamic value.
   * @param {string} label - Human-readable label for error messages.
   * @returns {*} Resolved value.
   */
  resolveRequiredValue(value, label) {
    const resolvedValue = this.resolveDynamicValue(value);

    if (resolvedValue === undefined || resolvedValue === null || resolvedValue === '') {
      throw new Error(`Missing ${label}.`);
    }

    return resolvedValue;
  }

  /**
   * Resolves a required observer target.
   * @param {*} target - Raw or dynamic target.
   * @param {string} label - Human-readable label for error messages.
   * @returns {*} Resolved target.
   */
  resolveRequiredTarget(target, label) {
    const resolvedTarget = this.resolveDynamicValue(target);

    if (!resolvedTarget) {
      throw new Error(`Missing ${label}.`);
    }

    return resolvedTarget;
  }

  /**
   * Returns a bound container method.
   * @param {string} methodName - Container method name.
   * @returns {function} Container method.
   */
  getContainerMethod(methodName) {
    const method = this.codeContainer?.[methodName];

    if (typeof method !== 'function') {
      throw new Error(`Container method '${methodName}' is not available.`);
    }

    return method;
  }
}