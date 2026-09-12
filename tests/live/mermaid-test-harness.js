// Test harness mirroring src/scripts/services/mermaid-runtime.js and
// src/scripts/editor/mermaid-diagram.js so the live HTML page exercises the
// same logic the production bundle ships.

export const DEFAULT_MERMAID_CDN_URL = 'https://esm.sh/';
const MERMAID_SPECIFIER = 'mermaid@11.16.0';

const sharedState = { loadPromise: null, runtime: null, sourceKey: '' };

class MermaidRuntimeLoader {
  constructor(state = sharedState) {
    this.state = state;
  }

  normalizeBaseUrl(url) {
    return url.endsWith('/') ? url : `${url}/`;
  }

  isDirectModuleUrl(url) {
    return /\.m?js(?:[?#].*)?$/i.test(url);
  }

  normalizeSource(url = '') {
    const normalizedUrl = String(url || '').trim() || DEFAULT_MERMAID_CDN_URL;

    if (this.isDirectModuleUrl(normalizedUrl)) {
      return { sourceKey: normalizedUrl, isDirectModule: true, moduleUrl: normalizedUrl };
    }

    return { sourceKey: normalizedUrl, isDirectModule: false, baseUrl: this.normalizeBaseUrl(normalizedUrl) };
  }

  async importModule(specifier) {
    return import(specifier);
  }

  async ensure(url = '') {
    const source = this.normalizeSource(url);

    if (this.state.runtime && this.state.sourceKey === source.sourceKey) {
      return this.state.runtime;
    }

    if (!this.state.loadPromise || this.state.sourceKey !== source.sourceKey) {
      this.state.sourceKey = source.sourceKey;
      this.state.loadPromise = this.load(source).catch((error) => {
        this.state.loadPromise = null;
        throw error;
      });
    }

    return this.state.loadPromise;
  }

  async load(source) {
    if (source.isDirectModule) {
      const mermaidModule = await this.importModule(source.moduleUrl);
      this.state.runtime = mermaidModule.default || mermaidModule;
      return this.state.runtime;
    }

    const mermaidModule = await this.importModule(`${source.baseUrl}${MERMAID_SPECIFIER}`);
    this.state.runtime = mermaidModule.default || mermaidModule;
    return this.state.runtime;
  }

  get() {
    if (!this.state.runtime) {
      throw new Error('Mermaid runtime has not been loaded yet.');
    }
    return this.state.runtime;
  }
}

const mermaidRuntimeLoader = new MermaidRuntimeLoader(sharedState);

export async function ensureMermaidRuntime(url = '') {
  return mermaidRuntimeLoader.ensure(url);
}

export function getMermaidRuntime() {
  return mermaidRuntimeLoader.get();
}

let mermaidInitialized = false;

export async function renderMermaidDiagram(code, _language, options = {}) {
  await ensureMermaidRuntime(options?.mermaidCdnUrl);

  const mermaid = getMermaidRuntime();
  const theme = options?.theme === 'dark' ? 'dark' : 'default';

  if (!mermaidInitialized) {
    mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme });
    mermaidInitialized = true;
  }

  const container = document.createElement('div');
  container.className = 'h5p-markdown-mermaid';

  const id = `h5p-mermaid-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const result = await mermaid.render(id, code);
    container.innerHTML = result.svg || '';
  } catch (error) {
    container.classList.add('h5p-markdown-mermaid--error');
    const fallback = document.createElement('pre');
    fallback.textContent = code;
    container.append(fallback);

    const message = document.createElement('p');
    message.className = 'h5p-markdown-mermaid__error';
    message.textContent = error?.message ? String(error.message) : 'Mermaid render failed';
    container.append(message);
  }

  return container;
}
