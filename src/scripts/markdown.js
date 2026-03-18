import { marked } from 'marked';
import DOMPurify from 'dompurify';
import markedAdmonition from 'marked-admonition-extension';
import 'marked-admonition-extension/dist/index.css';
import renderReadonlyCodeBlock from './editor/readonly-code-block';

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
  constructor(text) {
    this.text = text;
    this.text = this.text.replace(/&lt;/g, '<');
    this.text = this.text.replace(/&gt;/g, '>');
    this.text = this.text.replace(/&quot;/g, '"');
    this.text = this.text.replace(/&#39;/g, '\'');
    this.text = this.text.replace(/&amp;/g, '&');
  }

  getHTML() {
    marked.use(markedAdmonition);
    return DOMPurify.sanitize(marked.parse(this.text));
  }

  getMarkdownDivAsHtml() {
    let mDiv = this.getMarkdownDiv();
    return '<div>' + mDiv.innerHTML + '</div>';
  }

  getMarkdownDiv() {
    let mdDiv = document.createElement('div');
    mdDiv.innerHTML = this.getHTML();
    mdDiv.querySelectorAll('pre code').forEach((el) => {
      const preElement = el.parentElement;
      const codeBlock = renderReadonlyCodeBlock(
        el.textContent || '',
        getCodeLanguage(el),
        { theme: 'light' }
      );

      preElement?.replaceWith(codeBlock);
    });
    return mdDiv;
  }
}
