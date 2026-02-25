import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap } from '@codemirror/commands';

import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { sql } from '@codemirror/lang-sql';

/**
 * Single CodeMirror editor instance wrapper
 */
export default class CodeMirrorEditorInstance {
  constructor(uid, readonly, content, language, onChangeCallback = () => {}) {
    this.uid = uid;
    this.readonly = readonly ?? false;
    this.content = content ?? '';
    this.language = language ?? 'python';
    this.onChangeCallback = onChangeCallback;
    this.view = this.createEditor();
  }

  createEditor() {
    const parent = document.getElementById(this.uid);
    if (!parent) {
      throw new Error(
        `CodeMirrorEditorInstance: Element #${this.uid} not found`,
      );
    }

    const state = EditorState.create({
      doc: this.content,
      extensions: [
        lineNumbers(),
        this.getLanguageExtension(),
        EditorView.editable.of(!this.readonly),
        keymap.of([
          ...defaultKeymap,
          { key: 'Ctrl-Enter', run: () => this.run() },
          { key: 'Cmd-Enter', run: () => this.run() },
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) this.handleChange();
        }),
        // Helles Default-Theme
        EditorView.theme(
          {
            '&': {
              height: '100%',
              fontFamily: 'monospace',
              fontSize: '14px',
              backgroundColor: '#ffffff',
              color: '#000000',
            },
            '.cm-content': {
              caretColor: '#000000',
            },
            '.cm-gutters': {
              backgroundColor: '#f5f5f5',
              color: '#555555',
              borderRight: '1px solid #ddd',
            },
            '.cm-line': {
              padding: '0 4px',
            },
          },
          { dark: false },
        ),
      ],
    });

    return new EditorView({ state, parent });
  }

  getLanguageExtension() {
    switch (this.language) {
      case 'python':
        return python();
      case 'markdown':
        return markdown();
      case 'sql':
        return sql();
      case 'javascript':
      default:
        return javascript();
    }
  }

  getCode() {
    return this.view.state.doc.toString();
  }

  handleChange() {
    this.onChangeCallback(this.getCode());
  }

  run() {
    // Optional execution hook
    return true;
  }

  destroy() {
    if (this.view) {
      this.view.destroy();
      this.view = null;
    }
  }
}
