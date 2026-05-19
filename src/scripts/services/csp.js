/**
 * Reads and applies host CSP nonces for dynamically injected runtime assets.
 *
 * Runtime loaders should depend on this class instead of duplicating nonce
 * discovery. Subclasses can override `getIntegrationNonce()` or
 * `findNonceElement()` for hosts that expose CSP data outside the standard H5P
 * integration object or DOM attributes.
 */
export class CspNonceProvider {
  /**
   * Resolves the default document in browser contexts.
   * @returns {Document|null} Browser document or null.
   */
  getDefaultDocument() {
    return typeof document === 'undefined' ? null : document;
  }

  /**
   * Reads the nonce from the current script element.
   * @param {Document} doc Document to inspect.
   * @returns {string} Current script nonce.
   */
  getCurrentScriptNonce(doc) {
    const currentScript = doc.currentScript;
    return currentScript?.nonce || currentScript?.getAttribute?.('nonce') || '';
  }

  /**
   * Reads the nonce from the H5P integration object.
   * @returns {string} H5P integration nonce.
   */
  getIntegrationNonce() {
    return typeof window !== 'undefined'
      ? window?.H5PIntegration?.nonce || ''
      : '';
  }

  /**
   * Finds a DOM element that carries a reusable CSP nonce.
   * @param {Document} doc Document to inspect.
   * @returns {HTMLElement|null} Element with nonce data.
   */
  findNonceElement(doc) {
    return doc.querySelector('script[nonce], link[nonce], style[nonce], meta[name="csp-nonce"]');
  }

  /**
   * Reads the nonce value from a DOM element.
   * @param {HTMLElement} element Element with nonce data.
   * @returns {string} Nonce value.
   */
  getElementNonce(element) {
    return element?.nonce
      || element?.content
      || element?.getAttribute?.('nonce')
      || element?.getAttribute?.('content')
      || '';
  }

  /**
   * Returns the CSP nonce used by the host page, if one is available.
   * @param {Document} [doc] Document to inspect.
   * @returns {string} CSP nonce.
   */
  getNonce(doc = this.getDefaultDocument()) {
    if (!doc) {
      return '';
    }

    return this.getCurrentScriptNonce(doc)
      || this.getIntegrationNonce()
      || this.getElementNonce(this.findNonceElement(doc));
  }

  /**
   * Applies the host CSP nonce to a dynamically injected element.
   * @param {HTMLElement} element Element receiving the nonce.
   * @returns {HTMLElement} The same element.
   */
  applyTo(element) {
    const nonce = this.getNonce(element?.ownerDocument);

    if (nonce) {
      element.setAttribute('nonce', nonce);
    }

    return element;
  }
}

export const cspNonceProvider = new CspNonceProvider();

/**
 * Returns the CSP nonce used by the host page, if one is available.
 * @param {Document} [doc] Document to inspect.
 * @returns {string} CSP nonce.
 */
export function getCspNonce(doc = cspNonceProvider.getDefaultDocument()) {
  return cspNonceProvider.getNonce(doc);
}

/**
 * Applies the host CSP nonce to a dynamically injected element.
 * @param {HTMLElement} element Element receiving the nonce.
 * @returns {HTMLElement} The same element.
 */
export function applyCspNonce(element) {
  return cspNonceProvider.applyTo(element);
}
