import { ensureP5Script } from './p5-runtime-service';

export const H5P5_STDOUT_MARKER = '__H5P5__';

/**
 * Bridges sandboxed runtimes to a visible p5.js instance.
 *
 * A language runtime such as TeaVM Java can stay inside an iframe and emit
 * `{ command: 'h5p5:call', name, args }` messages. This bridge owns the p5
 * instance in the H5P host page, executes the calls, and stores a deterministic
 * command log that can later be used by smoke tests or visual grading.
 */
export default class P5CanvasBridge {
  /**
   * @param {object} [options] Bridge options.
   * @param {string} [options.p5CdnUrl] p5.js CDN URL.
   */
  constructor(options = {}) {
    this.options = options;
    this.canvasDiv = null;
    this.p5Instance = null;
    this.commandLog = [];
  }

  /**
   * Mounts a fresh p5 instance into the given canvas container.
   * @param {HTMLElement} canvasDiv Canvas mount target.
   * @returns {Promise<void>} Resolves when p5 is ready.
   */
  async mount(canvasDiv) {
    if (!canvasDiv) {
      throw new Error('A canvas container is required for p5 output.');
    }

    await ensureP5Script(this.options.p5CdnUrl);
    this.reset();
    this.canvasDiv = canvasDiv;
    this.canvasDiv.innerHTML = '';

    const P5Runtime = window.p5;
    this.p5Instance = new P5Runtime(() => {}, this.canvasDiv);
    this.commandLog = [];
  }

  /**
   * Removes the current p5 instance.
   * @returns {void}
   */
  reset() {
    if (this.p5Instance) {
      try {
        this.p5Instance.remove();
      }
      catch {
        // Removing a p5 instance is best-effort; a new run will recreate it.
      }
    }
    this.p5Instance = null;
    this.commandLog = [];
  }

  /**
   * Handles a postMessage payload from a sandboxed runtime.
   * @param {object} message Message payload.
   * @returns {boolean} True if the message was handled.
   */
  handleMessage(message = {}) {
    if (message.command !== 'h5p5:call') {
      return false;
    }

    this.call(message.name, Array.isArray(message.args) ? message.args : []);
    return true;
  }

  /**
   * Handles an internal stdout line emitted by a language facade.
   * @param {string} line Runtime stdout line.
   * @returns {boolean} True if the line was consumed as a p5 command.
   */
  handleStdoutLine(line = '') {
    const text = String(line || '').trim();
    if (!text.startsWith(`${H5P5_STDOUT_MARKER}|`)) {
      return false;
    }

    const [, name, ...rawArgs] = text.split('|');
    const args = rawArgs.map((arg, index) => {
      if (name === 'text' && index === 0) {
        return arg;
      }

      const value = Number(arg);
      return Number.isFinite(value) ? value : arg;
    });

    this.call(name, args);
    return true;
  }

  /**
   * Executes one p5 call and records it.
   * @param {string} name p5 method name.
   * @param {Array<*>} args Method arguments.
   * @returns {*} p5 return value.
   */
  call(name, args = []) {
    const methodName = String(name || '').trim();
    const safeArgs = Array.isArray(args) ? args : [];

    this.commandLog.push({ name: methodName, args: [...safeArgs] });

    if (!this.p5Instance || !methodName) {
      return null;
    }

    const method = this.p5Instance[methodName];
    if (typeof method !== 'function') {
      return null;
    }

    return method.apply(this.p5Instance, safeArgs);
  }

  /**
   * Returns a copy of the recorded p5 calls.
   * @returns {Array<{name: string, args: Array<*>}>} Command log.
   */
  getCommandLog() {
    return this.commandLog.map((entry) => ({
      name: entry.name,
      args: [...entry.args],
    }));
  }
}
