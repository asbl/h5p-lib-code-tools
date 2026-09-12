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
        parse: vi.fn((text) => {
          if (text.includes('```python')) {
            return '<pre><code class="language-python">print("Hello")\n</code></pre>';
          }

          if (text.includes('|')) {
            return '<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Ada</td></tr></tbody></table>';
          }

          return '<p>Use <code>print()</code> in your answer.</p>';
        }),
      },
      DOMPurify: {
        sanitize: vi.fn((html) => html),
        addHook: vi.fn(),
      },
      markedAlert: vi.fn(() => ({ name: 'mock-alert' })),
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

  it('adds markdown table styling hooks', async () => {
    const markdown = new Markdown('| Name |\n| --- |\n| Ada |');

    const markdownDiv = await markdown.getMarkdownDiv();
    const wrapper = markdownDiv.querySelector('.h5p-markdown-table-wrapper');
    const table = markdownDiv.querySelector('.h5p-markdown-table');

    expect(wrapper).not.toBeNull();
    expect(table).not.toBeNull();
    expect(wrapper?.contains(table)).toBe(true);
    expect(table?.querySelector('th')?.textContent).toBe('Name');
  });

  it('registers the first-party legacy admonition extension and the GFM alert plugin', async () => {
    vi.resetModules();
    const { default: FreshMarkdown } = await import('../src/scripts/markdown.js');

    const markdown = new FreshMarkdown('Use `print()` in your answer.');
    await markdown.getMarkdownDiv();

    const runtime = getMarkdownRuntime();
    expect(runtime.markedAlert).toHaveBeenCalled();
    expect(runtime.marked.use).toHaveBeenCalledWith(
      expect.objectContaining({
        extensions: [expect.objectContaining({ name: 'legacy-admonition', level: 'block' })],
      })
    );
    expect(runtime.marked.use).toHaveBeenCalledWith({ name: 'mock-alert' });
  });

  it('skips GFM alert registration when a self-hosted runtime does not provide it', async () => {
    vi.resetModules();

    const runtime = getMarkdownRuntime();
    delete runtime.markedAlert;
    ensureMarkdownRuntime.mockResolvedValue(runtime);
    getMarkdownRuntime.mockReturnValue(runtime);

    const { default: FreshMarkdown } = await import('../src/scripts/markdown.js');
    const markdown = new FreshMarkdown('Use `print()` in your answer.');

    await expect(markdown.getMarkdownDiv()).resolves.toBeTruthy();
    expect(runtime.marked.use).toHaveBeenCalledWith(
      expect.objectContaining({
        extensions: [expect.objectContaining({ name: 'legacy-admonition' })],
      })
    );
    expect(runtime.marked.use).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'mock-alert' }));
  });

  it('opens rendered links in a new tab via a DOMPurify hook', async () => {
    vi.resetModules();
    const { default: FreshMarkdown } = await import('../src/scripts/markdown.js');

    const markdown = new FreshMarkdown('[Python-Kurs](https://example.com/python-kurs)');
    await markdown.getMarkdownDiv();

    expect(getMarkdownRuntime().DOMPurify.addHook).toHaveBeenCalledWith(
      'afterSanitizeAttributes',
      expect.any(Function)
    );

    const hookCallback = getMarkdownRuntime().DOMPurify.addHook.mock.calls[0][1];
    const link = document.createElement('a');
    link.setAttribute('href', 'https://example.com/python-kurs');
    hookCallback(link);

    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
