import 'marked-admonition-extension/dist/index.css';
import renderReadonlyCodeBlock from './editor/readonly-code-block';
import { ensureMarkdownRuntime, getMarkdownRuntime } from './services/markdown-runtime';

let markdownConfigured = false;

/**
 * Adds presentation hooks to rendered markdown tables.
 * @param {string} html Sanitized markdown HTML.
 * @returns {string} Markdown HTML with table wrappers and classes.
 */
function enhanceTables(html) {
  const container = document.createElement('div');
  container.innerHTML = html;

  container.querySelectorAll('table').forEach((table) => {
    table.classList.add('h5p-markdown-table');

    if (table.parentElement?.classList.contains('h5p-markdown-table-wrapper')) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'h5p-markdown-table-wrapper';
    table.replaceWith(wrapper);
    wrapper.appendChild(table);
  });

  return container.innerHTML;
}

/**
 * Extracts the language name from a markdown code element.
 * @param {HTMLElement} codeElement Code element from the rendered markdown.
 * @returns {string} Normalized language name.
 */
function getCodeLanguage(codeElement) {
  const languageClass = Array.from(codeElement.classList)
    .find((className) => className.startsWith('language-'));

  if (languageClass) {
    return languageClass.replace('language-', '');
  }

  return codeElement.dataset.language || '';
}

/**
 * Converts markdown text to html
 */
export default class Markdown {
  constructor(text, options = {}) {
    this.text = text;
    this.options = options;
    this.text = this.text.replace(/&lt;/g, '<');
    this.text = this.text.replace(/&gt;/g, '>');
    this.text = this.text.replace(/&quot;/g, '"');
    this.text = this.text.replace(/&#39;/g, '\'');
    this.text = this.text.replace(/&amp;/g, '&');
  }

  async getHTML() {
    await ensureMarkdownRuntime(this.options?.markdownCdnUrl || '');

    const { marked, DOMPurify, markedAdmonition } = getMarkdownRuntime();

    if (!markdownConfigured) {
      marked.use(markedAdmonition);
      markdownConfigured = true;
    }

    return enhanceTables(DOMPurify.sanitize(marked.parse(this.text)));
  }

  async getMarkdownDivAsHtml() {
    let mDiv = await this.getMarkdownDiv();
    return '<div class="h5p-markdown-content">' + mDiv.innerHTML + '</div>';
  }

  async getMarkdownDiv() {
    let mdDiv = document.createElement('div');
    mdDiv.className = 'h5p-markdown-content';
    mdDiv.innerHTML = await this.getHTML();
    const replacements = Array.from(mdDiv.querySelectorAll('pre code')).map(async (el) => {
      const preElement = el.parentElement;
      const codeBlock = await renderReadonlyCodeBlock(
        el.textContent || '',
        getCodeLanguage(el),
        {
          theme: 'light',
          codeMirrorCdnUrl: this.options?.codeMirrorCdnUrl || '',
          markdownCdnUrl: this.options?.markdownCdnUrl || '',
        }
      );

      preElement?.replaceWith(codeBlock);
    });

    await Promise.all(replacements);
    return mdDiv;
  }
}
