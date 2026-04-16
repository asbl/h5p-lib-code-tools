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
});