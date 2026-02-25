import BaseObserver from './baseobserver';
/**
 * Observer for button click events.
 * @augments BaseObserver
 */
export default class ButtonClickedObserver extends BaseObserver {
  /**
   * @param {object} params
   * @param {HTMLElement} params.target - Button element to observe.
   * @param {function} params.callback - Function called when button is clicked.
   * @param target
   * @param callback
   */
  constructor(target, callback) {
    // Keine config notwendig für Click-Events
    super(target, callback, null);
  }

  createObserver() {
    if (!this.target) return;
    this.target.addEventListener('click', this.callback);
  }

  /**
   * Stop listening for click events
   */
  stop() {
    if (!this.target) return;
    this.target.removeEventListener('click', this.callback);
  }
}
