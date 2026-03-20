import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';

const coreLightTheme = EditorView.theme({
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

const coreLightExtensions = [
  coreLightTheme,
  syntaxHighlighting(defaultHighlightStyle),
];

const coreDarkExtensions = [oneDark];

/**
 * Returns the shared CodeMirror core theme extensions.
 * @param {string} theme Theme variant.
 * @returns {Array} Theme extensions.
 */
export function getCodeMirrorThemeExtensions(theme) {
  return theme === 'dark' ? coreDarkExtensions : coreLightExtensions;
}
