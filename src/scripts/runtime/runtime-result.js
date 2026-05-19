/**
 * Creates and formats structured runtime result/error objects.
 *
 * Runtime implementations should use this class internally when they need to
 * preserve phase, stdout/stderr and diagnostics while still emitting legacy
 * strings to older UI callbacks. Subclasses can override `normalizeExitCode()`
 * or `formatError()` to implement language-specific status semantics.
 */
export class RuntimeResultFactory {
  /**
   * Normalizes process-style exit codes.
   * @param {*} exitCode Candidate exit code.
   * @param {number} fallback Fallback value.
   * @returns {number} Numeric exit code.
   */
  normalizeExitCode(exitCode, fallback) {
    return Number.isFinite(Number(exitCode)) ? Number(exitCode) : fallback;
  }

  /**
   * Creates a normalized successful runtime result.
   * @param {object} [result] Runtime result fields.
   * @param {string} [result.phase] Runtime phase.
   * @param {string} [result.stdout] Captured standard output.
   * @param {string} [result.stderr] Captured standard error.
   * @param {*} [result.value] Optional structured value.
   * @param {*} [result.table] Optional table representation.
   * @param {number} [result.exitCode] Process-style exit code.
   * @param {string[]} [result.diagnostics] Compiler/runtime diagnostics.
   * @returns {object} Normalized runtime result.
   */
  createResult({
    phase = 'execution',
    stdout = '',
    stderr = '',
    value = null,
    table = null,
    exitCode = 0,
    diagnostics = [],
  } = {}) {
    return {
      phase,
      stdout: String(stdout || ''),
      stderr: String(stderr || ''),
      value,
      table,
      exitCode: this.normalizeExitCode(exitCode, 0),
      diagnostics: Array.isArray(diagnostics) ? diagnostics : [],
    };
  }

  /**
   * Creates a normalized runtime error object.
   * @param {object} [error] Runtime error fields.
   * @param {string} [error.phase] Runtime phase.
   * @param {string} [error.message] Error message.
   * @param {string} [error.stdout] Captured standard output.
   * @param {string} [error.stderr] Captured standard error.
   * @param {number} [error.exitCode] Process-style exit code.
   * @param {string[]} [error.diagnostics] Compiler/runtime diagnostics.
   * @returns {object} Normalized runtime error.
   */
  createError({
    phase = 'execution',
    message = '',
    stdout = '',
    stderr = '',
    exitCode = 1,
    diagnostics = [],
  } = {}) {
    return {
      phase,
      message: String(message || ''),
      stdout: String(stdout || ''),
      stderr: String(stderr || ''),
      exitCode: this.normalizeExitCode(exitCode, 1),
      diagnostics: Array.isArray(diagnostics) ? diagnostics : [],
    };
  }

  /**
   * Formats a runtime error for legacy UI callbacks.
   * @param {object|string} error Runtime error object or legacy string.
   * @returns {string} Human-readable error message.
   */
  formatError(error = {}) {
    if (typeof error === 'string') {
      return error;
    }

    const message = error?.message ?? String(error || '');
    const diagnostics = Array.isArray(error?.diagnostics) ? error.diagnostics.filter(Boolean) : [];

    return diagnostics.length
      ? `${message}\n${diagnostics.join('\n')}`
      : message;
  }
}

export const runtimeResultFactory = new RuntimeResultFactory();

/**
 * Creates a normalized successful runtime result with the shared factory.
 * @param {object} [result] Runtime result fields.
 * @returns {object} Normalized runtime result.
 */
export function createRuntimeResult(result = {}) {
  return runtimeResultFactory.createResult(result);
}

/**
 * Creates a normalized runtime error with the shared factory.
 * @param {object} [error] Runtime error fields.
 * @returns {object} Normalized runtime error.
 */
export function createRuntimeError(error = {}) {
  return runtimeResultFactory.createError(error);
}

/**
 * Formats a runtime error for legacy UI callbacks.
 * @param {object|string} [error] Runtime error object or legacy string.
 * @returns {string} Human-readable error message.
 */
export function formatRuntimeError(error = {}) {
  return runtimeResultFactory.formatError(error);
}
