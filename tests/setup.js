import { afterEach, beforeEach, vi } from 'vitest';
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

let uuidCounter = 0;
let blobCounter = 0;

beforeEach(() => {
  uuidCounter = 0;
  blobCounter = 0;

  vi.stubGlobal('Blockly', {
    ...Blockly,
    Python: pythonGenerator,
  });

  vi.stubGlobal('H5P', {
    createUUID: () => `uuid-${++uuidCounter}`,
    t: (key) => `[Missing translation: ${key}]`,
  });

  Object.defineProperty(globalThis.URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(() => `blob:mock-${++blobCounter}`),
  });

  Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});