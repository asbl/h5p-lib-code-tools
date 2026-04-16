import 'marked-admonition-extension/dist/index.css';
import renderReadonlyCodeBlock from './editor/readonly-code-block';
import { ensureMarkdownRuntime, getMarkdownRuntime } from './services/markdown-runtime';

let markdownConfigured = false;

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

    return DOMPurify.sanitize(marked.parse(this.text));
  }

  async getMarkdownDivAsHtml() {
    let mDiv = await this.getMarkdownDiv();
    return '<div>' + mDiv.innerHTML + '</div>';
  }

  async getMarkdownDiv() {
    let mdDiv = document.createElement('div');
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
