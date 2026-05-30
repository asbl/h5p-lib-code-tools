import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtime = {
  inject: vi.fn(),
  serialization: {
    workspaces: {
      load: vi.fn(),
    },
  },
  svgResize: vi.fn(),
};

vi.mock('../src/scripts/editor/blockly/blockly-runtime.js', () => ({
  getBlocklyRuntime: () => runtime,
}));

import BlocklyWorkspaceManager from '../src/scripts/editor/blockly/managers/blockly-workspace-manager.js';

const createToolboxItem = (contents = []) => ({
  getContents: vi.fn(() => contents),
  isSelectable: vi.fn(() => true),
});

const createWorkspace = (toolbox) => ({
  addChangeListener: vi.fn(),
  dispose: vi.fn(),
  getToolbox: vi.fn(() => toolbox),
});

const createManager = () => new BlocklyWorkspaceManager('python', {
  buildToolbox: vi.fn(() => ({ kind: 'categoryToolbox', contents: [] })),
  generateCode: vi.fn(() => ''),
  registerBlocks: vi.fn(),
});

describe('BlocklyWorkspaceManager', () => {
  beforeEach(() => {
    runtime.inject.mockClear();
    runtime.serialization.workspaces.load.mockClear();
  });

  it('clears the selected toolbox category so the flyout starts collapsed', () => {
    const emptyVariables = createToolboxItem([]);
    const mathBlocks = createToolboxItem([{ kind: 'block', type: 'math_number' }]);
    const toolbox = {
      getSelectedItem: vi.fn(() => emptyVariables),
      getToolboxItems: vi.fn(() => [emptyVariables, mathBlocks]),
      setSelectedItem: vi.fn(),
      clearSelection: vi.fn(),
    };
    runtime.inject.mockReturnValueOnce(createWorkspace(toolbox));

    createManager().mount(document.createElement('div'), document.createElement('div'), {});

    expect(toolbox.setSelectedItem).not.toHaveBeenCalled();
    expect(toolbox.clearSelection).toHaveBeenCalled();
  });

  it('clears an initially selected toolbox category with blocks', () => {
    const mathBlocks = createToolboxItem([{ kind: 'block', type: 'math_number' }]);
    const listBlocks = createToolboxItem([{ kind: 'block', type: 'lists_create_empty' }]);
    const toolbox = {
      getSelectedItem: vi.fn(() => mathBlocks),
      getToolboxItems: vi.fn(() => [mathBlocks, listBlocks]),
      setSelectedItem: vi.fn(),
      clearSelection: vi.fn(),
    };
    runtime.inject.mockReturnValueOnce(createWorkspace(toolbox));

    createManager().mount(document.createElement('div'), document.createElement('div'), {});

    expect(toolbox.setSelectedItem).not.toHaveBeenCalled();
    expect(toolbox.clearSelection).toHaveBeenCalled();
  });

  it('loads a language-pack fallback workspace from initial code when no saved state exists', () => {
    const fallbackState = { blocks: { languageVersion: 0, blocks: [] } };
    const toolbox = {
      clearSelection: vi.fn(),
    };
    const languageManager = {
      buildToolbox: vi.fn(() => ({ kind: 'categoryToolbox', contents: [] })),
      createWorkspaceStateFromCode: vi.fn(() => fallbackState),
      generateCode: vi.fn(() => 'print("Hello")\n'),
      registerBlocks: vi.fn(),
    };
    const onCodeChange = vi.fn();
    runtime.inject.mockReturnValueOnce(createWorkspace(toolbox));

    new BlocklyWorkspaceManager('python', languageManager, {
      initialCode: 'print("Hello")',
      onCodeChange,
    }).mount(document.createElement('div'), document.createElement('div'), {});

    expect(languageManager.createWorkspaceStateFromCode).toHaveBeenCalledWith('print("Hello")');
    expect(runtime.serialization.workspaces.load).toHaveBeenCalledWith(
      fallbackState,
      expect.any(Object)
    );
    expect(onCodeChange).toHaveBeenCalledWith('print("Hello")\n');
  });

  it('repairs an empty saved workspace with the initial code fallback', () => {
    const emptySavedState = { blocks: { languageVersion: 0, blocks: [] } };
    const fallbackState = {
      blocks: {
        languageVersion: 0,
        blocks: [{ type: 'python_raw_code' }],
      },
    };
    const toolbox = {
      clearSelection: vi.fn(),
    };
    const languageManager = {
      buildToolbox: vi.fn(() => ({ kind: 'categoryToolbox', contents: [] })),
      createWorkspaceStateFromCode: vi.fn(() => fallbackState),
      generateCode: vi.fn(() => 'print("Hello")\n'),
      registerBlocks: vi.fn(),
    };
    runtime.inject.mockReturnValueOnce(createWorkspace(toolbox));

    new BlocklyWorkspaceManager('python', languageManager, {
      blocklyWorkspaceState: emptySavedState,
      initialCode: 'print("Hello")',
    }).mount(document.createElement('div'), document.createElement('div'), {});

    expect(runtime.serialization.workspaces.load).toHaveBeenCalledWith(
      fallbackState,
      expect.any(Object)
    );
  });
});
