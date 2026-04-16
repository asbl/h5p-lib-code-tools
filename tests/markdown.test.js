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

const { ensureMarkdownRuntime, getMarkdownRuntime } = vi.hoisted(() => ({
  ensureMarkdownRuntime: vi.fn(),
  getMarkdownRuntime: vi.fn(),
}));

vi.mock('../src/scripts/editor/readonly-code-block.js', () => ({
  default: renderReadonlyCodeBlock,
}));

vi.mock('../src/scripts/services/markdown-runtime.js', () => ({
  ensureMarkdownRuntime,
  getMarkdownRuntime,
}));

import Markdown from '../src/scripts/markdown.js';

describe('Markdown', () => {
  beforeEach(() => {
    renderReadonlyCodeBlock.mockClear();
    ensureMarkdownRuntime.mockReset();
    getMarkdownRuntime.mockReset();

    const runtime = {
      marked: {
        use: vi.fn(),
        parse: vi.fn((text) => text.includes('```python')
          ? '<pre><code class="language-python">print("Hello")\n</code></pre>'
          : '<p>Use <code>print()</code> in your answer.</p>'),
      },
      DOMPurify: {
        sanitize: vi.fn((html) => html),
      },
      markedAdmonition: { name: 'mock-admonition' },
    };

    ensureMarkdownRuntime.mockResolvedValue(runtime);
    getMarkdownRuntime.mockReturnValue(runtime);
  });

  it('replaces fenced code blocks with readonly CodeMirror containers', async () => {
    const markdown = new Markdown('```python\nprint("Hello")\n```');

    const markdownDiv = await markdown.getMarkdownDiv();
    const codeBlock = markdownDiv.querySelector('.mock-readonly-code-block');

    expect(renderReadonlyCodeBlock).toHaveBeenCalledTimes(1);
    expect(renderReadonlyCodeBlock.mock.calls[0][0]).toContain('print("Hello")');
    expect(renderReadonlyCodeBlock.mock.calls[0][1]).toBe('python');
    expect(renderReadonlyCodeBlock.mock.calls[0][2]).toEqual({
      theme: 'light',
      codeMirrorCdnUrl: '',
      markdownCdnUrl: '',
    });
    expect(codeBlock).not.toBeNull();
    expect(codeBlock?.dataset.language).toBe('python');
    expect(markdownDiv.querySelector('pre')).toBeNull();
  });

  it('leaves inline code untouched', async () => {
    const markdown = new Markdown('Use `print()` in your answer.');

    const markdownDiv = await markdown.getMarkdownDiv();

    expect(renderReadonlyCodeBlock).not.toHaveBeenCalled();
    expect(markdownDiv.querySelector('code')?.textContent).toBe('print()');
  });
});