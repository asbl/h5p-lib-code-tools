import { describe, expect, it, vi } from 'vitest';

import FillBlanksEditorInstance from '../src/scripts/editor/fill-blanks/fill-blanks-editor-instance.js';
import {
  composeFillBlanksCode,
  parseFillBlanksTemplate,
} from '../src/scripts/editor/fill-blanks/fill-blanks-code.js';
import EditorManager from '../src/scripts/manager/editormanager.js';

describe('fill-in-the-code editor', () => {
  it('parses blank markers and composes executable code', () => {
    const template = 'x = [[blank:1]]\nprint([[blank:name]])';

    expect(parseFillBlanksTemplate(template)).toEqual([
      { type: 'text', text: 'x = ' },
      { type: 'blank', id: '1', valueKey: '1', placeholder: '', marker: '[[blank:1]]', index: 1 },
      { type: 'text', text: '\nprint(' },
      { type: 'blank', id: 'name', valueKey: 'name', placeholder: '', marker: '[[blank:name]]', index: 2 },
      { type: 'text', text: ')' },
    ]);

    expect(composeFillBlanksCode(template, {
      1: '5',
      name: 'x',
    })).toBe('x = 5\nprint(x)');
  });

  it('renders inputs and returns completed code', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const onChangeCallback = vi.fn();
    const editor = new FillBlanksEditorInstance(
      target,
      'for i in [[blank:range|range(...)]]:\n    print([[blank:value]])',
      'python',
      { onChangeCallback },
    );

    const inputs = target.querySelectorAll('.fill-blanks-input');
    inputs[0].value = 'range(3)';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[1].value = 'i';
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));

    expect(editor.getCode()).toBe('for i in range(3):\n    print(i)\n');
    expect(onChangeCallback).toHaveBeenCalled();
  });

  it('keeps duplicate blank ids independent by assigning unique value keys', () => {
    const template = 'print([[blank:value]], [[blank:value]])';

    expect(composeFillBlanksCode(template, {
      value: 'first',
      value__2: 'second',
    })).toBe('print(first, second)');
  });

  it('does not emit changes from readonly blanks', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    const onChangeCallback = vi.fn();
    const editor = new FillBlanksEditorInstance(
      target,
      'x = [[blank:1]]',
      'python',
      {
        blankValues: { 1: '5' },
        onChangeCallback,
        readonly: true,
      },
    );

    const input = target.querySelector('.fill-blanks-input');
    input.value = '9';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(input.readOnly).toBe(true);
    expect(editor.getCode()).toBe('x = 5\n');
    expect(onChangeCallback).not.toHaveBeenCalled();
  });

  it('lets EditorManager keep the template while getCode returns runnable code with fixed sections', () => {
    const manager = new EditorManager(
      'x = [[blank:1]]\nprint([[blank:2]])',
      'python',
      'print("before")',
      'print("after")',
      false,
      5,
      'editor-id',
      'pre-id',
      'post-id',
      vi.fn(),
      vi.fn(),
      'light',
      { editorMode: 'fill-blanks' },
    );

    document.body.appendChild(manager.getDOM());
    manager.mountEditorForActiveFile();

    const inputs = document.body.querySelectorAll('.fill-blanks-input');
    inputs[0].value = '7';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    inputs[1].value = 'x';
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));

    expect(manager.getWorkspaceSnapshot().files[0].code).toBe('x = [[blank:1]]\nprint([[blank:2]])');
    expect(manager.getCode()).toBe('print("before")\nx = 7\nprint(x)\nprint("after")');
  });
});
