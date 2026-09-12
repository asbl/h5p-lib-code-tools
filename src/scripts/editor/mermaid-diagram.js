import {
  ensureMermaidRuntime,
  getMermaidRuntime,
} from '../services/mermaid-runtime.js';

let initializedRuntime = null;
let initializedTheme = '';

/**
 * Resets renderer-local Mermaid initialization state.
 * Intended for tests and runtime cache resets.
 * @returns {void}
 */
export function resetMermaidDiagramRenderer() {
  initializedRuntime = null;
  initializedTheme = '';
}

/**
 * Renders a markdown Mermaid code block as an inline SVG diagram.
 * @param {string} code Mermaid diagram source.
 * @param {string} _language Always "mermaid"; accepted for parity with
 *   `renderReadonlyCodeBlock`.
 * @param {object} [options] Renderer options.
 * @param {string} [options.mermaidCdnUrl] Optional external Mermaid CDN URL.
 * @param {string} [options.theme] Theme variant ("light" or "dark").
 * @returns {Promise<HTMLDivElement>} Rendered diagram container.
 */
export default async function renderMermaidDiagram(code, _language, options = {}) {
  await ensureMermaidRuntime(options?.mermaidCdnUrl);

  const mermaid = getMermaidRuntime();
  const theme = options?.theme === 'dark' ? 'dark' : 'default';

  if (initializedRuntime !== mermaid || initializedTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme,
    });
    initializedRuntime = mermaid;
    initializedTheme = theme;
  }

  const container = document.createElement('div');
  container.className = 'h5p-markdown-mermaid';

  const id = `h5p-mermaid-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const result = await mermaid.render(id, code);
    container.innerHTML = result.svg || '';
    result.bindFunctions?.(container);
  }
  catch (error) {
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
