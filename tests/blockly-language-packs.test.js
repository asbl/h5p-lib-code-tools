import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import {
  PYTHON_CATEGORY_FIELDS,
  buildFilteredToolbox,
  LANGUAGE_PACKS,
} from '../src/scripts/editor/blockly-language-packs.js';

describe('buildFilteredToolbox', () => {
  const toolbox = LANGUAGE_PACKS.python.toolbox;
  const map = PYTHON_CATEGORY_FIELDS;

  it('returns the original toolbox when categorySelection is null', () => {
    expect(buildFilteredToolbox(toolbox, null, map)).toBe(toolbox);
  });

  it('returns the original toolbox when categorySelection is undefined', () => {
    expect(buildFilteredToolbox(toolbox, undefined, map)).toBe(toolbox);
  });

  it('returns the original toolbox when all categories are enabled', () => {
    const all = Object.fromEntries(Object.keys(map).map((k) => [k, true]));
    expect(buildFilteredToolbox(toolbox, all, map)).toBe(toolbox);
  });

  it('removes a category when its flag is false', () => {
    const selection = { ...Object.fromEntries(Object.keys(map).map((k) => [k, true])), loops: false };
    const filtered = buildFilteredToolbox(toolbox, selection, map);

    const names = filtered.contents.map((c) => c.name);
    expect(names).not.toContain('Schleifen');
    expect(names).toContain('Logik');
    expect(names).toContain('Variablen');
  });

  it('keeps only selected categories when most are false', () => {
    const selection = {
      variables: true,
      logic: false,
      loops: false,
      math: false,
      text: true,
      lists: false,
      functions: false,
    };
    const filtered = buildFilteredToolbox(toolbox, selection, map);
    const names = filtered.contents.map((c) => c.name);
    expect(names).toEqual(['Variablen', 'Text']);
  });

  it('does not mutate the original toolbox', () => {
    const originalLength = toolbox.contents.length;
    buildFilteredToolbox(toolbox, { loops: false }, map);
    expect(toolbox.contents.length).toBe(originalLength);
  });

  it('contains only registered Blockly block types and shadow types', () => {
    const invalidTypes = new Set();

    const registerIfMissing = (type) => {
      if (typeof type !== 'string') return;
      if (!Blockly.Blocks[type]) invalidTypes.add(type);
    };

    const visitItems = (items = []) => {
      items.forEach((item) => {
        if (item.kind === 'block') {
          registerIfMissing(item.type);
          Object.values(item.inputs || {}).forEach((inputSpec) => {
            registerIfMissing(inputSpec?.shadow?.type);
          });
        }

        if (Array.isArray(item.contents)) {
          visitItems(item.contents);
        }
      });
    };

    visitItems(toolbox.contents);
    expect([...invalidTypes]).toEqual([]);
  });
});
