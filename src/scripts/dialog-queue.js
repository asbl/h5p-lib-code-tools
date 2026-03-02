import Swal from 'sweetalert2-uncensored';
/**
 * DialogQueue – a reusable, exportable class that guarantees **sequential**
 * display of SweetAlert2 dialogs.
 * It provides two public methods:
 *
 *  * `enqueueAlert(message|config, options?)` – shows a simple alert/confirmation
 *    dialog and resolves when the user closes it.
 *  * `enqueueInput(prompt|config, options?)` – shows an input dialog and resolves
 *    with the text entered by the user.
 *
 * Both methods internally use a Promise‑queue so that no dialog overwrites a
 * previously opened one. An optional per‑call timeout (in ms) can be supplied;
 * a value of `0` disables automatic timeout.
 *
 * @example
 * import DialogQueue from './DialogQueue.js';
 *
 * const dq = new DialogQueue({ defaultTimeout: 0 });
 *
 * // Skulpt output callback
 * Sk.configure({
 *   output: txt => dq.enqueueAlert(txt),
 *
 *   // Python `input()` → SweetAlert input dialog
 *   inputfun: prompt =>
 *     Sk.misceval.asyncToPromise(() => dq.enqueueInput(prompt)),
 *   inputfunTakesPrompt: true,
 *   // …other Skulpt options…
 * });
 */
export default class DialogQueue {
  /**
   * Create a new DialogQueue.
   *
   * @param {Object} [cfg] - Configuration object.
   * @param {number} [cfg.defaultTimeout=0] - Default timeout (ms) applied to
   *   every dialog unless overridden in the call options. `0` means “no timeout”.
   */
  constructor({ defaultTimeout = 0 } = {}) {
    /** @private {Promise<void>} Holds the last promise in the chain. */
    this._tail = Promise.resolve();

    /** @private {number} Default timeout used when a call does not specify one. */
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * Escape a string for safe insertion into HTML.
   * Replaces &, <, >, ", ' with their entity equivalents.
   *
   * @param {string} str
   * @returns {string}
   */
  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br/>');
  }


  /**
   * Internal helper that appends a SweetAlert dialog to the current promise chain.
   *
   * @private
   * @param {Object} swalConfig - Full SweetAlert2 configuration object.
   * @param {Object} [opts] - Optional per‑call options.
   * @param {number} [opts.timeout] - Timeout (ms) for this specific dialog.
   * @returns {Promise<any>} Promise that resolves with the SweetAlert result
   *   (or `undefined` on timeout/error).
   */
  _enqueue(swalConfig, opts = {}) {
    const timeout = opts.timeout ?? this.defaultTimeout;

    // Append a new step to the queue.
    const next = this._tail.then(
      () =>
        new Promise((resolve) => {
          const swalPromise = Swal.fire(swalConfig);
          let timerId = null;

          // ----- optional timeout -------------------------------------------------
          if (timeout > 0) {
            timerId = setTimeout(() => {
              Swal.close(); // force‑close the modal
              resolve(undefined); // resolve due to timeout
            }, timeout);
          }

          // ----- normal completion (user clicks confirm) ---------------------------
          swalPromise
            .then((result) => {
              if (timerId) clearTimeout(timerId);
              resolve(result);
            })
            .catch((err) => {
              // Log the error but keep the queue alive.
              console.error('Swal error:', err);
              if (timerId) clearTimeout(timerId);
              resolve(undefined);
            });
        })
    );

    // Ensure a rejection does not break the whole chain.
    this._tail = next.catch(() => {});
    return next;
  }

  /**
   * Show a simple alert/confirmation dialog.
   *
   * @param {string|Object} textOrConfig - Either a plain string (used as `text`)
   *   or a full SweetAlert2 configuration object.
   * @param {Object} [opts] - Optional per‑call options.
   * @param {number} [opts.timeout] - Timeout (ms) for this specific alert.
   * @returns {Promise<void>} Resolves when the dialog is closed (by user or timeout).
   */
  enqueueAlert(textOrConfig, opts = {}) {
    const cfg =
      typeof textOrConfig === 'string'
        ? { html: this.escapeHtml(textOrConfig) }
        : { ...textOrConfig };

    // Default UI for a confirmation‑only modal.
    cfg.confirmButtonText ??= '…continue';
    cfg.allowOutsideClick ??= false;
    cfg.allowEscapeKey ??= false;
    cfg.showCancelButton ??= true;

    // Resolve to `undefined`; callers only need to know that the modal finished.
    return this._enqueue(cfg, opts).then(() => undefined);
  }

  /**
   * Show an input dialog and retrieve the entered text.
   *
   * @param {string|Object} promptOrConfig - Prompt string (used as `title`) or a
   *   SweetAlert2 configuration object. The `input` property will be forced to `'text'`.
   * @param {Object} [opts] - Optional per‑call options.
   * @param {number} [opts.timeout] - Timeout (ms) for this specific input dialog.
   * @returns {Promise<string>} Resolves with the text entered by the user.
   *   If the user closes the dialog without entering anything, resolves to an
   *   empty string.
   */
  enqueueInput(promptOrConfig, opts = {}) {
    const cfg =
      typeof promptOrConfig === 'string'
        ? { title: promptOrConfig, input: 'text' }
        : { ...promptOrConfig, input: 'text' };

    // Default UI for an input modal.
    cfg.confirmButtonText ??= 'OK';
    cfg.allowOutsideClick ??= false;
    cfg.allowEscapeKey ??= false;
    cfg.showCancelButton ??= false;

    // Extract the `value` field from SweetAlert's result.
    return this._enqueue(cfg, opts).then((result) => {
      // If the dialog was dismissed or no value was provided, return ''.
      return result && result.value !== undefined ? result.value : '';
    });
  }
}