import { getCodeMirrorRuntime } from './codemirror-runtime.js';

let cachedRuntime = null;
let coreLightExtensions = null;
let coreDarkExtensions = null;

/**
 * Builds and caches the shared theme extensions for the loaded CodeMirror runtime.
 * @returns {void}
 */
function ensureThemeExtensions() {
  const runtime = getCodeMirrorRuntime();

  if (cachedRuntime === runtime && coreLightExtensions && coreDarkExtensions) {
    return;
  }

  const coreLightTheme = runtime.EditorView.theme({
    '&': {
      color: '#0f172a',
      backgroundColor: '#f8fafc',
    },
    '.cm-content': {
      caretColor: '#0f172a',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: '#0f172a',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: '#bfdbfe',
    },
    '.cm-gutters': {
      color: '#475569',
      backgroundColor: '#e2e8f0',
      borderRight: '1px solid #cbd5e1',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(148, 163, 184, 0.16)',
    },
    '.cm-panels': {
      backgroundColor: '#e2e8f0',
      color: '#0f172a',
    },
  }, { dark: false });

  coreLightExtensions = [
    coreLightTheme,
    runtime.syntaxHighlighting(runtime.defaultHighlightStyle),
  ];

  coreDarkExtensions = [runtime.oneDark];
  cachedRuntime = runtime;
}

/**
 * Returns the shared CodeMirror core theme extensions.
 * @param {string} theme Theme variant.
 * @returns {Array} Theme extensions.
 */
export function getCodeMirrorThemeExtensions(theme) {
  ensureThemeExtensions();
  return theme === 'dark' ? coreDarkExtensions : coreLightExtensions;
}
