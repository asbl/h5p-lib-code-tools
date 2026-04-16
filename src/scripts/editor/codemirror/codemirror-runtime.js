import { Decoration, EditorView, keymap, lineNumbers } from '@codemirror/view';
import { Compartment, EditorState, Transaction, StateEffect, StateField, RangeSetBuilder } from '@codemirror/state';
import { defaultKeymap, history } from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { sql, SQLite } from '@codemirror/lang-sql';
import { bracketMatching, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { closeBrackets, autocompletion } from '@codemirror/autocomplete';
import { oneDark } from '@codemirror/theme-one-dark';

const sharedCodeMirrorRuntime = {
  Decoration,
  EditorView,
  keymap,
  lineNumbers,
  Compartment,
  EditorState,
  Transaction,
  StateEffect,
  StateField,
  RangeSetBuilder,
  defaultKeymap,
  history,
  python,
  javascript,
  markdown,
  sql,
  SQLite,
  bracketMatching,
  syntaxHighlighting,
  defaultHighlightStyle,
  closeBrackets,
  autocompletion,
  oneDark,
};

/**
 * Returns the shared bundled CodeMirror runtime.
 * The URL parameter is intentionally ignored to avoid mixing multiple
 * @codemirror/state instances at runtime.
 * @param {string} [url] Optional external runtime URL.
 * @returns {Promise<object>} Shared bundled runtime.
 */
export async function ensureCodeMirrorRuntime(url) {
  void url;
  return sharedCodeMirrorRuntime;
}

/**
 * Returns the shared bundled CodeMirror runtime.
 * @returns {object} Shared CodeMirror runtime.
 */
export function getCodeMirrorRuntime() {
  return sharedCodeMirrorRuntime;
}

/**
 * Resets the CodeMirror runtime state.
 * Kept for API compatibility with tests.
 */
export function resetCodeMirrorRuntime() {
  return undefined;
}