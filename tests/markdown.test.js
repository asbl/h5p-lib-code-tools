import { beforeEach, describe, expect, it, vi } from 'vitest';

const { renderReadonlyCodeBlock } = vi.hoisted(() => ({
  renderReadonlyCodeBlock: vi.fn((code, language, options) => {
    const element = document.createElement('div');
    element.className = 'mock-readonly-code-block';
    element.dataset.language = language || 'plain';
    element.dataset.theme = options?.theme || 'light';
    element.textContent = code;
    return element;
  })
}));

vi.mock('../src/scripts/editor/readonly-code-block.js', () => ({
  default: renderReadonlyCodeBlock,
}));

import Markdown from '../src/scripts/markdown.js';

describe('Markdown', () => {
  beforeEach(() => {
    renderReadonlyCodeBlock.mockClear();
  });

  it('replaces fenced code blocks with readonly CodeMirror containers', () => {
    const markdown = new Markdown('```python\nprint("Hello")\n```');

    const markdownDiv = markdown.getMarkdownDiv();
    const codeBlock = markdownDiv.querySelector('.mock-readonly-code-block');

    expect(renderReadonlyCodeBlock).toHaveBeenCalledTimes(1);
    expect(renderReadonlyCodeBlock.mock.calls[0][0]).toContain('print("Hello")');
    expect(renderReadonlyCodeBlock.mock.calls[0][1]).toBe('python');
    expect(renderReadonlyCodeBlock.mock.calls[0][2]).toEqual({ theme: 'light' });
    expect(codeBlock).not.toBeNull();
    expect(codeBlock?.dataset.language).toBe('python');
    expect(markdownDiv.querySelector('pre')).toBeNull();
  });

  it('leaves inline code untouched', () => {
    const markdown = new Markdown('Use `print()` in your answer.');

    const markdownDiv = markdown.getMarkdownDiv();

    expect(renderReadonlyCodeBlock).not.toHaveBeenCalled();
    expect(markdownDiv.querySelector('code')?.textContent).toBe('print()');
  });
});