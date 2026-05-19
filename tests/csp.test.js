import { beforeEach, describe, expect, it } from 'vitest';

import { applyCspNonce, CspNonceProvider, getCspNonce } from '../src/scripts/services/csp.js';

describe('CSP helpers', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete window.H5PIntegration;
  });

  it('reads nonce values from existing host elements', () => {
    const script = document.createElement('script');
    script.setAttribute('nonce', 'host-nonce');
    document.head.appendChild(script);

    expect(getCspNonce()).toBe('host-nonce');
  });

  it('uses H5PIntegration nonce when no element nonce exists', () => {
    window.H5PIntegration = { nonce: 'integration-nonce' };

    expect(getCspNonce()).toBe('integration-nonce');
  });

  it('applies the detected nonce to dynamic elements', () => {
    const meta = document.createElement('meta');
    meta.name = 'csp-nonce';
    meta.content = 'meta-nonce';
    document.head.appendChild(meta);

    const script = document.createElement('script');
    applyCspNonce(script);

    expect(script.getAttribute('nonce')).toBe('meta-nonce');
  });

  it('allows subclasses to resolve host-specific nonce values', () => {
    class StaticNonceProvider extends CspNonceProvider {
      getIntegrationNonce() {
        return 'subclass-nonce';
      }
    }

    const provider = new StaticNonceProvider();
    const script = document.createElement('script');

    provider.applyTo(script);

    expect(script.getAttribute('nonce')).toBe('subclass-nonce');
  });
});
