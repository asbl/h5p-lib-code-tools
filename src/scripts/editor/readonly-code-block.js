import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { python } from '@codemirror/lang-python';
import { sql } from '@codemirror/lang-sql';
import { getCodeMirrorThemeExtensions } from './codemirror/codemirror-themes.js';

/**
 * Gets a CodeMirror language extension for markdown code blocks.
 * @param {string} language Language name from the markdown code block.
 * @returns {Array|object} CodeMirror language extension or empty array.
 */
function getLanguageExtension(language) {
  switch ((language || '').toLowerCase()) {
    case 'javascript':
    case 'js':
      return javascript();
    case 'markdown':
    case 'md':
      return markdown();
    case 'python':
    case 'py':
      return python();
    case 'sql':
      return sql();
    default:
      return [];
  }
}

/**
 * Gets the external CodeMirror theme extension.
 * @param {string} theme Theme variant.
 * @returns {object} CodeMirror theme extension.
 */
function getThemeExtension(theme) {
  return getCodeMirrorThemeExtensions(theme);
}

/**
 * Renders a markdown code block as a readonly CodeMirror instance.
 * @param {string} code Code block content.
 * @param {string} language Language name from the markdown code block.
 * @param {object} [options={}] Renderer options.
 * @param {string} [options.theme='light'] Theme variant.
 * @returns {HTMLDivElement} Rendered code block container.
 */
export default function renderReadonlyCodeBlock(code, language, options = {}) {
  const theme = options.theme ?? 'light';
  const container = document.createElement('div');
  container.className = 'h5p-markdown-code-block';
  container.dataset.language = language || 'plain';

  const state = EditorState.create({
    doc: code,
    extensions: [
      getThemeExtension(theme),
      getLanguageExtension(language),
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
    ]
  });

  new EditorView({
    state,
    parent: container,
  });

  return container;
}