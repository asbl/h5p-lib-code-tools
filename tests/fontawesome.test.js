import { beforeEach, describe, expect, it } from 'vitest';

describe('Font Awesome runtime loader', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('injects one stylesheet link and reuses it on repeated calls', async () => {
    const { ensureFontAwesomeRuntime, resetFontAwesomeRuntime } = await import('../src/scripts/services/fontawesome-runtime.js');

    resetFontAwesomeRuntime();
    await ensureFontAwesomeRuntime('https://static.example.com/fontawesome/');
    await ensureFontAwesomeRuntime('https://static.example.com/fontawesome/');

    const links = Array.from(document.head.querySelectorAll('link[data-h5p-fontawesome-runtime="true"]'));

    expect(links).toHaveLength(1);
    expect(links[0].href).toBe('https://static.example.com/fontawesome/css/all.min.css');
  });

  it('copies the host nonce onto the injected stylesheet', async () => {
    const { ensureFontAwesomeRuntime, resetFontAwesomeRuntime } = await import('../src/scripts/services/fontawesome-runtime.js');
    const script = document.createElement('script');
    script.setAttribute('nonce', 'host-nonce');
    document.head.appendChild(script);

    resetFontAwesomeRuntime();
    await ensureFontAwesomeRuntime('https://static.example.com/fontawesome/');

    const link = document.head.querySelector('link[data-h5p-fontawesome-runtime="true"]');

    expect(link?.getAttribute('nonce')).toBe('host-nonce');
  });

  it('supports isolated loader instances with custom nonce handling', async () => {
    const { FontAwesomeRuntimeLoader } = await import('../src/scripts/services/fontawesome-runtime.js');

    class TestFontAwesomeRuntimeLoader extends FontAwesomeRuntimeLoader {
      applyNonce(link) {
        link.setAttribute('nonce', 'subclass-nonce');
      }
    }

    const loader = new TestFontAwesomeRuntimeLoader({ loadPromise: null, loadedUrl: '' });

    await loader.ensure('https://static.example.com/fontawesome.css');

    const link = document.head.querySelector('link[data-h5p-fontawesome-runtime="true"]');

    expect(link?.href).toBe('https://static.example.com/fontawesome.css');
    expect(link?.getAttribute('nonce')).toBe('subclass-nonce');
  });
});
