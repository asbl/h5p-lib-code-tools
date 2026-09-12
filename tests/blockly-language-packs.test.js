import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import {
  buildFilteredToolbox,
  buildPackageToolbox,
} from '../src/scripts/editor/blockly/managers/blockly-language-manager.js';
import {
  getRegisteredBlocklyPackageManagers,
  BlocklyPackageManagerRegistry,
  registerBlocklyPackageManagers,
  resetBlocklyPackageManagers,
} from '../src/scripts/editor/blockly/blockly-package-managers.js';
import {
  BlocklyLanguagePackRegistry,
  getLanguagePack,
  getRegisteredBlocklyLanguageKeys,
  registerBlocklyLanguagePack,
  resetBlocklyLanguagePacks,
} from '../src/scripts/editor/blockly/blockly-language-packs.js';
import {
  BlocklyLanguagePackContract,
  validateBlocklyLanguagePack,
} from '../src/scripts/editor/blockly/blockly-language-pack-contract.js';
import { registerGraphicsBlocks } from '../src/scripts/editor/blockly/graphics-blocks.js';

const CATEGORY_FIELDS = {
  variables: 'Variablen',
  logic: 'Logik',
  loops: 'Schleifen',
  math: 'Mathematik',
  text: 'Text',
  lists: 'Listen',
  functions: 'Funktionen',
};

const TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    { kind: 'category', name: 'Variablen', custom: 'VARIABLE' },
    { kind: 'category', name: 'Logik', contents: [{ kind: 'block', type: 'logic_boolean' }] },
    { kind: 'category', name: 'Schleifen', contents: [{ kind: 'block', type: 'controls_if' }] },
    { kind: 'category', name: 'Mathematik', contents: [{ kind: 'block', type: 'math_number' }] },
    { kind: 'category', name: 'Text', contents: [{ kind: 'block', type: 'text' }] },
    { kind: 'category', name: 'Listen', contents: [{ kind: 'block', type: 'lists_create_empty' }] },
    { kind: 'category', name: 'Funktionen', custom: 'PROCEDURE' },
  ],
};

function createFakePackageManager(name, categoryName, blockType) {
  return {
    getPackageName: () => name,
    supportsLanguage: (language) => language === 'python',
    buildCategory: () => ({
      kind: 'category',
      name: categoryName,
      contents: [{ kind: 'block', type: blockType }],
    }),
  };
}

function createFakeBlock() {
  const input = {
    setCheck() {
      return input;
    },
    appendField() {
      return input;
    },
  };

  return {
    inlineInputs: false,
    appendValueInput() {
      return input;
    },
    setInputsInline(value) {
      this.inlineInputs = value;
    },
    setPreviousStatement() {},
    setNextStatement() {},
    setColour() {},
  };
}

describe('buildFilteredToolbox', () => {
  const toolbox = TOOLBOX;
  const map = CATEGORY_FIELDS;

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

  it('keeps categories that are not mapped in categoryFieldMap', () => {
    const extendedToolbox = {
      ...toolbox,
      contents: [...toolbox.contents, { kind: 'category', name: 'NumPy', contents: [] }],
    };

    const selection = {
      variables: true,
      logic: false,
      loops: false,
      math: false,
      text: true,
      lists: false,
      functions: false,
    };

    const filtered = buildFilteredToolbox(extendedToolbox, selection, map);
    const names = filtered.contents.map((c) => c.name);
    expect(names).toEqual(['Variablen', 'Text', 'NumPy']);
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

describe('Blockly graphics blocks', () => {
  it('keeps RGB color blocks compact with inline inputs', () => {
    const fakeBlockly = { Blocks: {} };
    registerGraphicsBlocks(fakeBlockly);

    ['graphics_background', 'graphics_fill', 'graphics_stroke'].forEach((type) => {
      const block = createFakeBlock();
      fakeBlockly.Blocks[type].init.call(block);
      expect(block.inlineInputs).toBe(true);
    });
  });
});

describe('Blockly package manager registry', () => {
  it('registers language-owned package managers without hard-wiring them into LibCodeTools', () => {
    resetBlocklyPackageManagers();
    registerBlocklyPackageManagers([
      createFakePackageManager('alpha', 'Alpha', 'alpha_block'),
      createFakePackageManager('beta', 'Beta', 'beta_block'),
    ]);

    expect(getRegisteredBlocklyPackageManagers().map((manager) => manager.getPackageName())).toEqual([
      'alpha',
      'beta',
    ]);

    const packageToolbox = buildPackageToolbox(TOOLBOX, 'python', ['alpha']);
    expect(packageToolbox.contents.some((category) => category.name === 'Alpha')).toBe(true);
  });

  it('supports isolated registry instances for content-type specific managers', () => {
    const registry = new BlocklyPackageManagerRegistry({ store: [] });
    const manager = createFakePackageManager('alpha', 'Alpha', 'alpha_block');

    registry.register([manager, { getPackageName: () => '  Custom-Package  ' }, null]);

    expect(registry.getAll().map((item) => item.getPackageName())).toEqual([
      'alpha',
      '  Custom-Package  ',
    ]);
    expect(getRegisteredBlocklyPackageManagers()).not.toContain(manager);
  });
});

describe('Blockly language pack registry', () => {
  it('validates the public language pack contract', () => {
    expect(validateBlocklyLanguagePack({
      toolbox: TOOLBOX,
      categoryFieldMap: CATEGORY_FIELDS,
      generate: () => '',
      supported: true,
    })).toEqual([]);

    expect(validateBlocklyLanguagePack({
      toolbox: { kind: 'categoryToolbox' },
      categoryFieldMap: [],
      supported: 'yes',
    })).toEqual([
      'Language pack toolbox must define a contents array.',
      'Language pack categoryFieldMap must be an object when present.',
      'Language pack must define a generate(workspace) function.',
      'Language pack supported flag must be boolean when present.',
    ]);
  });

  it('registers and resolves language packs outside LibCodeTools', () => {
    resetBlocklyLanguagePacks();
    const pack = {
      toolbox: TOOLBOX,
      categoryFieldMap: CATEGORY_FIELDS,
      generate: () => 'generated',
      supported: true,
    };

    const registered = registerBlocklyLanguagePack(['python', 'pseudocode'], pack);

    expect(getRegisteredBlocklyLanguageKeys()).toEqual(['python', 'pseudocode']);
    expect(getLanguagePack('python')).toBe(registered);
    expect(getLanguagePack('pseudocode')).toBe(registered);
    expect(getLanguagePack('unknown')).toBe(registered);
  });

  it('supports isolated language pack registries with custom key normalization', () => {
    class AliasLanguagePackRegistry extends BlocklyLanguagePackRegistry {
      normalizeLanguageKey(language) {
        return String(language || '').trim().replace(/^alias:/, '').toLowerCase();
      }
    }

    const registry = new AliasLanguagePackRegistry({ store: new Map() });
    const pack = {
      toolbox: TOOLBOX,
      categoryFieldMap: CATEGORY_FIELDS,
      generate: () => 'generated',
      supported: true,
    };

    const registered = registry.register(['alias:Java', 'JAVA'], pack);

    expect(registry.getKeys()).toEqual(['java']);
    expect(registry.get('java')).toBe(registered);
    expect(getRegisteredBlocklyLanguageKeys()).not.toContain('java');
  });

  it('allows contract subclasses to define additional validation rules', () => {
    class StrictLanguagePackContract extends BlocklyLanguagePackContract {
      validate(pack) {
        return [
          ...super.validate(pack),
          ...(pack.id ? [] : ['Language pack must define an id.']),
        ];
      }
    }

    const contract = new StrictLanguagePackContract();

    expect(contract.validate({
      toolbox: TOOLBOX,
      categoryFieldMap: CATEGORY_FIELDS,
      generate: () => '',
      supported: true,
    })).toEqual(['Language pack must define an id.']);
  });
});
