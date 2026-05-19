import { describe, expect, it, vi } from 'vitest';

import {
  CodeQuestionConfigNormalizer,
} from '../src/scripts/services/code-question-config.js';
import {
  JsZipRuntimeLoader,
} from '../src/scripts/services/jszip-runtime.js';
import {
  MarkdownRuntimeLoader,
} from '../src/scripts/services/markdown-runtime.js';
import {
  SweetAlertRuntimeLoader,
} from '../src/scripts/services/sweetalert-runtime.js';
import {
  RuntimeResultFactory,
} from '../src/scripts/runtime/runtime-result.js';

describe('runtime and config service classes', () => {
  it('normalizes shared CodeQuestion config through isolated instances', () => {
    const normalizer = new CodeQuestionConfigNormalizer({
      keyMap: {
        customcdn: 'customCdnUrl',
      },
    });

    expect(normalizer.decodeHtmlCode('&lt;Main&gt;&amp;&quot;')).toBe('<Main>&"');
    expect(normalizer.parseExternalLibraryUrlsYaml(`
      custom-cdn: "https://cdn.example.test/runtime/"
      unknown: https://ignored.example.test/
    `)).toEqual({
      customCdnUrl: 'https://cdn.example.test/runtime/',
    });
    expect(normalizer.normalizeEditorMode('blocks', ['code', 'blocks'])).toBe('blocks');
    expect(normalizer.normalizeEditorMode('unknown', ['code', 'blocks'])).toBe('code');
  });

  it('allows config normalizer subclasses to accept language-specific keys', () => {
    class JavaConfigNormalizer extends CodeQuestionConfigNormalizer {
      normalizeExternalLibraryKey(key = '') {
        return super.normalizeExternalLibraryKey(key).replace(/^java/, '');
      }
    }

    const normalizer = new JavaConfigNormalizer({
      keyMap: {
        teavm: 'teavmAssetBaseUrl',
      },
    });

    expect(normalizer.parseExternalLibraryUrlsYaml('javaTeaVM: https://cdn.example.test/teavm/')).toEqual({
      teavmAssetBaseUrl: 'https://cdn.example.test/teavm/',
    });
  });

  it('creates structured runtime results and supports formatting subclasses', () => {
    class PrefixedRuntimeResultFactory extends RuntimeResultFactory {
      formatError(error = {}) {
        return `[Runtime] ${super.formatError(error)}`;
      }
    }

    const factory = new PrefixedRuntimeResultFactory();

    expect(factory.createResult({ stdout: 12, exitCode: '0', diagnostics: 'ignored' })).toEqual({
      phase: 'execution',
      stdout: '12',
      stderr: '',
      value: null,
      table: null,
      exitCode: 0,
      diagnostics: [],
    });
    expect(factory.formatError({
      message: 'Failed',
      diagnostics: ['line 1'],
    })).toBe('[Runtime] Failed\nline 1');
  });

  it('loads markdown runtime modules through overrideable import hooks', async () => {
    class TestMarkdownRuntimeLoader extends MarkdownRuntimeLoader {
      async importModule(specifier) {
        if (specifier.includes('admonition')) {
          return { default: { name: 'admonition' } };
        }

        if (specifier.includes('marked')) {
          return { marked: { name: 'marked' } };
        }

        if (specifier.includes('dompurify')) {
          return { default: { name: 'dompurify' } };
        }

        return {};
      }
    }

    const state = { loadPromise: null, runtime: null, sourceKey: '' };
    const loader = new TestMarkdownRuntimeLoader(state);

    await expect(loader.ensure('https://cdn.example.test/markdown')).resolves.toEqual({
      marked: { name: 'marked' },
      DOMPurify: { name: 'dompurify' },
      markedAdmonition: { name: 'admonition' },
    });
    expect(loader.get()).toBe(state.runtime);

    loader.reset();
    expect(() => loader.get()).toThrow('Markdown runtime has not been loaded yet');
  });

  it('loads direct markdown runtime modules as a single bundle', async () => {
    class BundleMarkdownRuntimeLoader extends MarkdownRuntimeLoader {
      async importModule(specifier) {
        expect(specifier).toBe('https://cdn.example.test/markdown-runtime.js');
        return {
          marked: { bundle: 'marked' },
          DOMPurify: { bundle: 'dompurify' },
          markedAdmonition: { bundle: 'admonition' },
        };
      }
    }

    const loader = new BundleMarkdownRuntimeLoader({ loadPromise: null, runtime: null, sourceKey: '' });

    await expect(loader.ensure('https://cdn.example.test/markdown-runtime.js')).resolves.toEqual({
      marked: { bundle: 'marked' },
      DOMPurify: { bundle: 'dompurify' },
      markedAdmonition: { bundle: 'admonition' },
    });
  });

  it('normalizes JSZip runtime URLs and injects scripts through subclass hooks', async () => {
    class TestJsZipRuntimeLoader extends JsZipRuntimeLoader {
      applyNonce(script) {
        script.nonce = 'test-nonce';
      }
    }

    const loader = new TestJsZipRuntimeLoader({ loadPromise: null, loadedUrl: '' });
    const promise = loader.ensure('https://cdn.example.test/jszip/');
    const script = document.querySelector('script[data-h5p-jszip-runtime="true"]');

    expect(script?.src).toBe('https://cdn.example.test/jszip/dist/jszip.min.js');
    expect(script?.nonce).toBe('test-nonce');

    window.JSZip = vi.fn();
    script.onload();

    await expect(promise).resolves.toBe(window.JSZip);
  });

  it('normalizes SweetAlert runtime URLs and injects scripts through subclass hooks', async () => {
    class TestSweetAlertRuntimeLoader extends SweetAlertRuntimeLoader {
      applyNonce(script) {
        script.nonce = 'sweetalert-nonce';
      }
    }

    const loader = new TestSweetAlertRuntimeLoader({ loadPromise: null, loadedUrl: '' });
    const promise = loader.ensure('https://cdn.example.test/sweetalert/');
    const script = document.querySelector('script[data-h5p-sweetalert-runtime="true"]');

    expect(script?.src).toBe('https://cdn.example.test/sweetalert/dist/sweetalert2.all.min.js');
    expect(script?.nonce).toBe('sweetalert-nonce');

    window.Swal = { fire: vi.fn() };
    script.onload();

    await expect(promise).resolves.toBe(window.Swal);
  });
});
