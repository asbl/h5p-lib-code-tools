import { beforeEach, describe, expect, it, vi } from 'vitest';

const { renderMermaidDiagram } = vi.hoisted(() => ({
  renderMermaidDiagram: vi.fn(async (code, language, options) => {
    const element = document.createElement('div');
    element.className = 'mock-mermaid-diagram';
    element.dataset.language = language || 'mermaid';
    element.dataset.theme = options?.theme || 'light';
    element.textContent = code;
    return element;
  })
}));

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

vi.mock('../src/scripts/editor/mermaid-diagram.js', () => ({
  default: renderMermaidDiagram,
}));

vi.mock('../src/scripts/editor/readonly-code-block.js', () => ({
  default: renderReadonlyCodeBlock,
}));

vi.mock('../src/scripts/services/markdown-runtime.js', () => ({
  ensureMarkdownRuntime,
  getMarkdownRuntime,
}));

import Markdown from '../src/scripts/markdown.js';

describe('Markdown mermaid support', () => {
  beforeEach(() => {
    renderMermaidDiagram.mockClear();
    renderReadonlyCodeBlock.mockClear();
    ensureMarkdownRuntime.mockReset();
    getMarkdownRuntime.mockReset();

    const runtime = {
      marked: {
        use: vi.fn(),
        parse: vi.fn((text) => {
          if (text.includes('```mermaid')) {
            return '<pre><code class="language-mermaid">graph TD\n  A-->B\n</code></pre>';
          }

          if (text.includes('```python')) {
            return '<pre><code class="language-python">print("Hello")\n</code></pre>';
          }

          return '<p>text</p>';
        }),
      },
      DOMPurify: {
        sanitize: vi.fn((html) => html),
        addHook: vi.fn(),
      },
      markedAdmonition: { name: 'mock-admonition' },
    };

    ensureMarkdownRuntime.mockResolvedValue(runtime);
    getMarkdownRuntime.mockReturnValue(runtime);
  });

  it('renders mermaid blocks through renderMermaidDiagram', async () => {
    const markdown = new Markdown('```mermaid\ngraph TD\n  A-->B\n```');

    const markdownDiv = await markdown.getMarkdownDiv();
    const diagram = markdownDiv.querySelector('.mock-mermaid-diagram');

    expect(renderMermaidDiagram).toHaveBeenCalledTimes(1);
    expect(renderMermaidDiagram.mock.calls[0][0]).toContain('A-->B');
    expect(renderMermaidDiagram.mock.calls[0][1]).toBe('mermaid');
    expect(renderMermaidDiagram.mock.calls[0][2]).toEqual({
      theme: 'light',
      mermaidCdnUrl: '',
    });
    expect(diagram).not.toBeNull();
    expect(diagram?.dataset.language).toBe('mermaid');
    expect(markdownDiv.querySelector('pre')).toBeNull();
  });

  it('keeps regular code blocks on the readonly code path', async () => {
    const markdown = new Markdown('```python\nprint("Hello")\n```');

    await markdown.getMarkdownDiv();

    expect(renderMermaidDiagram).not.toHaveBeenCalled();
    expect(renderReadonlyCodeBlock).toHaveBeenCalledTimes(1);
  });
});
