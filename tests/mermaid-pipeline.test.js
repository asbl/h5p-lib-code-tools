import { beforeEach, describe, expect, it, vi } from 'vitest';

const renderCalls = [];
const initializeCalls = [];

const sharedMermaidRuntime = {
  initialize: (config) => {
    initializeCalls.push(config);
  },
  render: async (id, code) => {
    renderCalls.push({ id, code });
    return {
      svg: `<svg data-mermaid-mock="true" id="${id}"><text>${code}</text></svg>`,
      bindFunctions: vi.fn(),
    };
  },
};

vi.mock('../src/scripts/services/mermaid-runtime.js', () => ({
  ensureMermaidRuntime: vi.fn(async () => {}),
  getMermaidRuntime: () => sharedMermaidRuntime,
  applyCspNonce: vi.fn(),
}));

import renderMermaidDiagram, {
  resetMermaidDiagramRenderer,
} from '../src/scripts/editor/mermaid-diagram.js';

describe('renderMermaidDiagram pipeline', () => {
  beforeEach(() => {
    renderCalls.length = 0;
    initializeCalls.length = 0;
    resetMermaidDiagramRenderer();
    // Restore the default render implementation in case a previous test
    // swapped it out for a failure scenario.
    sharedMermaidRuntime.render = async (id, code) => {
      renderCalls.push({ id, code });
      return {
        svg: `<svg data-mermaid-mock="true" id="${id}"><text>${code}</text></svg>`,
        bindFunctions: vi.fn(),
      };
    };
  });

  it('initializes mermaid once with strict security and renders an SVG', async () => {
    const diagram = await renderMermaidDiagram('graph TD\n  A-->B', 'mermaid', {
      theme: 'light',
      mermaidCdnUrl: '',
    });

    expect(initializeCalls).toHaveLength(1);
    expect(initializeCalls[0]).toMatchObject({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'default',
    });

    expect(renderCalls).toHaveLength(1);
    expect(renderCalls[0].code).toBe('graph TD\n  A-->B');
    expect(renderCalls[0].id).toMatch(/^h5p-mermaid-/);

    expect(diagram.className).toContain('h5p-markdown-mermaid');
    expect(diagram.querySelector('svg[data-mermaid-mock]')).not.toBeNull();
  });

  it('shows a fallback block when mermaid.render rejects', async () => {
    sharedMermaidRuntime.render = async () => {
      throw new Error('parse error');
    };

    const diagram = await renderMermaidDiagram('not valid mermaid', 'mermaid', {});

    expect(diagram.className).toContain('h5p-markdown-mermaid--error');
    expect(diagram.querySelector('pre')?.textContent).toBe('not valid mermaid');
    expect(diagram.querySelector('.h5p-markdown-mermaid__error')?.textContent).toBe('parse error');
  });

  it('passes the rendered SVG into the container', async () => {
    const diagram = await renderMermaidDiagram('sequenceDiagram\n  A->>B: Hi', 'mermaid', {});
    const svg = diagram.querySelector('svg');
    expect(svg?.dataset.mermaidMock).toBe('true');
  });

  it('reinitializes mermaid when the requested theme changes', async () => {
    await renderMermaidDiagram('graph TD\n  A-->B', 'mermaid', { theme: 'light' });
    await renderMermaidDiagram('graph TD\n  B-->C', 'mermaid', { theme: 'dark' });

    expect(initializeCalls.map((call) => call.theme)).toEqual(['default', 'dark']);
  });

  it('binds Mermaid SVG interactions after insertion', async () => {
    const bindFunctions = vi.fn();
    sharedMermaidRuntime.render = async (id, code) => {
      renderCalls.push({ id, code });
      return {
        svg: `<svg data-mermaid-mock="true" id="${id}"><text>${code}</text></svg>`,
        bindFunctions,
      };
    };

    const diagram = await renderMermaidDiagram('graph TD\n  A-->B', 'mermaid', {});

    expect(bindFunctions).toHaveBeenCalledWith(diagram);
  });
});
