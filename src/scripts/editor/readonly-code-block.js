import { getCodeMirrorThemeExtensions } from './codemirror/codemirror-themes.js';
import { ensureCodeMirrorRuntime, getCodeMirrorRuntime } from './codemirror/codemirror-runtime.js';

/**
 * Gets a CodeMirror language extension for markdown code blocks.
 * @param {string} language Language name from the markdown code block.
 * @returns {Array|object} CodeMirror language extension or empty array.
 */
function getLanguageExtension(language) {
  const runtime = getCodeMirrorRuntime();

  switch ((language || '').toLowerCase()) {
    case 'javascript':
    case 'js':
      return runtime.javascript();
    case 'markdown':
    case 'md':
      return runtime.markdown();
    case 'python':
    case 'py':
      return runtime.python();
    case 'sql':
      return runtime.sql();
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
 * @param {object} [options] Renderer options.
 * @param {string} [options.theme] Theme variant.
 * @returns {Promise<HTMLDivElement>} Rendered code block container.
 */
export default async function renderReadonlyCodeBlock(code, language, options = {}) {
  await ensureCodeMirrorRuntime(options?.codeMirrorCdnUrl);

  const { EditorState, EditorView } = getCodeMirrorRuntime();
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