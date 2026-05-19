import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';
import {
  buildFilteredToolbox,
  buildPackageToolbox,
} from '../src/scripts/editor/blockly/managers/blockly-language-manager.js';
import MatplotlibPackageManager from '../src/scripts/editor/blockly/managers/packages/matplotlib-package-manager.js';
import MiniworldsPackageManager from '../src/scripts/editor/blockly/managers/packages/miniworlds-package-manager.js';
import NumpyPackageManager from '../src/scripts/editor/blockly/managers/packages/numpy-package-manager.js';
import ScipyPackageManager from '../src/scripts/editor/blockly/managers/packages/scipy-package-manager.js';
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

describe('buildPackageToolbox', () => {
  const toolbox = TOOLBOX;
  const packageManagers = [
    new NumpyPackageManager(),
    new MatplotlibPackageManager(),
    new MiniworldsPackageManager(),
    new ScipyPackageManager(),
  ];

  it('returns the original toolbox when no supported package is selected', () => {
    expect(buildPackageToolbox(toolbox, 'python', ['packaging'], packageManagers)).toBe(toolbox);
  });

  it('adds a NumPy category when numpy is selected', () => {
    const packageToolbox = buildPackageToolbox(toolbox, 'python', ['NumPy', 'numpy'], packageManagers);

    expect(packageToolbox).not.toBe(toolbox);

    const numpyCategories = packageToolbox.contents.filter((category) => category.name === 'NumPy');
    expect(numpyCategories).toHaveLength(1);
    expect(numpyCategories[0].contents.map((item) => item.type)).toEqual([
      'numpy_import_as',
      'numpy_array_create',
      'numpy_linspace',
      'numpy_mean',
    ]);
  });

  it('registers Blockly block types required by the NumPy category', () => {
    buildPackageToolbox(toolbox, 'python', ['numpy'], packageManagers);

    expect(Blockly.Blocks.numpy_import_as).toBeDefined();
    expect(Blockly.Blocks.numpy_array_create).toBeDefined();
    expect(Blockly.Blocks.numpy_linspace).toBeDefined();
    expect(Blockly.Blocks.numpy_mean).toBeDefined();
  });

  it('adds a Matplotlib category when matplotlib is selected', () => {
    const packageToolbox = buildPackageToolbox(toolbox, 'python', ['matplotlib'], packageManagers);

    const matplotlibCategories = packageToolbox.contents.filter((category) => category.name === 'Matplotlib');
    expect(matplotlibCategories).toHaveLength(1);
    expect(matplotlibCategories[0].contents.map((item) => item.type)).toEqual([
      'matplotlib_import_pyplot',
      'matplotlib_create_figure',
      'matplotlib_plot_line',
      'matplotlib_set_title',
      'matplotlib_show_plot',
    ]);
  });

  it('adds a SciPy category when scipy is selected', () => {
    const packageToolbox = buildPackageToolbox(toolbox, 'python', ['scipy'], packageManagers);

    const scipyCategories = packageToolbox.contents.filter((category) => category.name === 'SciPy');
    expect(scipyCategories).toHaveLength(1);
    expect(scipyCategories[0].contents.map((item) => item.type)).toEqual([
      'scipy_import_linalg',
      'scipy_linalg_solve',
    ]);
  });

  it('adds a Miniworlds category when miniworlds is selected', () => {
    const packageToolbox = buildPackageToolbox(toolbox, 'python', ['miniworlds'], packageManagers);

    const miniworldsCategories = packageToolbox.contents.filter((category) => (
      ['Miniworlds', 'World', 'Actor'].includes(category.name)
    ));
    expect(miniworldsCategories.map((category) => category.name)).toEqual([
      'Miniworlds',
      'World',
      'Actor',
    ]);
    expect(miniworldsCategories[0].contents.map((item) => item.type)).toEqual([
      'miniworlds_import_core',
      'miniworlds_rgb_color',
    ]);
    expect(miniworldsCategories[1].contents.map((item) => item.type)).toEqual([
      'miniworlds_create_world',
      'miniworlds_add_background',
      'miniworlds_world_set_attribute',
      'miniworlds_world_get_attribute',
      'miniworlds_world_call_method',
      'miniworlds_world_event',
      'miniworlds_world_run',
    ]);
    expect(miniworldsCategories[2].contents.map((item) => item.type)).toEqual([
      'miniworlds_create_actor',
      'miniworlds_actor_add_costume',
      'miniworlds_actor_move',
      'miniworlds_actor_set_attribute',
      'miniworlds_actor_get_attribute',
      'miniworlds_actor_call_method',
      'miniworlds_actor_event_lifecycle',
      'miniworlds_actor_event_key_down',
      'miniworlds_actor_event_key_pressed',
    ]);
  });

  it('registers Blockly block types required by the Matplotlib category', () => {
    buildPackageToolbox(toolbox, 'python', ['matplotlib'], packageManagers);

    expect(Blockly.Blocks.matplotlib_import_pyplot).toBeDefined();
    expect(Blockly.Blocks.matplotlib_create_figure).toBeDefined();
    expect(Blockly.Blocks.matplotlib_plot_line).toBeDefined();
    expect(Blockly.Blocks.matplotlib_set_title).toBeDefined();
    expect(Blockly.Blocks.matplotlib_show_plot).toBeDefined();
  });

  it('registers Blockly block types required by the Miniworlds category', () => {
    buildPackageToolbox(toolbox, 'python', ['miniworlds'], packageManagers);

    expect(Blockly.Blocks.miniworlds_import_core).toBeDefined();
    expect(Blockly.Blocks.miniworlds_rgb_color).toBeDefined();
    expect(Blockly.Blocks.miniworlds_create_world).toBeDefined();
    expect(Blockly.Blocks.miniworlds_add_background).toBeDefined();
    expect(Blockly.Blocks.miniworlds_world_set_attribute).toBeDefined();
    expect(Blockly.Blocks.miniworlds_world_get_attribute).toBeDefined();
    expect(Blockly.Blocks.miniworlds_world_call_method).toBeDefined();
    expect(Blockly.Blocks.miniworlds_create_actor).toBeDefined();
    expect(Blockly.Blocks.miniworlds_actor_add_costume).toBeDefined();
    expect(Blockly.Blocks.miniworlds_actor_move).toBeDefined();
    expect(Blockly.Blocks.miniworlds_actor_set_attribute).toBeDefined();
    expect(Blockly.Blocks.miniworlds_actor_get_attribute).toBeDefined();
    expect(Blockly.Blocks.miniworlds_actor_call_method).toBeDefined();
    expect(Blockly.Blocks.miniworlds_actor_event_lifecycle).toBeDefined();
    expect(Blockly.Blocks.miniworlds_actor_event_key_down).toBeDefined();
    expect(Blockly.Blocks.miniworlds_actor_event_key_pressed).toBeDefined();
    expect(Blockly.Blocks.miniworlds_world_event).toBeDefined();
    expect(Blockly.Blocks.miniworlds_world_run).toBeDefined();
  });

  it('generates Miniworlds actor key-down event handlers with body fallback', () => {
    buildPackageToolbox(toolbox, 'python', ['miniworlds'], packageManagers);

    const block = {
      getFieldValue: (fieldName) => ({
        ACTOR_VAR: 'player',
        KEY: 'w',
      })[fieldName],
    };
    const generatorWithBody = {
      statementToCode: () => '    player.move_up()\n',
    };
    const generatorWithoutBody = {
      statementToCode: () => '',
    };

    const handlerCode = pythonGenerator.forBlock.miniworlds_actor_event_key_down(
      block,
      generatorWithBody,
    );
    const fallbackCode = pythonGenerator.forBlock.miniworlds_actor_event_key_down(
      block,
      generatorWithoutBody,
    );

    expect(handlerCode).toBe('@player.register\ndef on_key_down_w(self):\n    player.move_up()\n');
    expect(fallbackCode).toBe('@player.register\ndef on_key_down_w(self):\n    pass\n');
  });

  it('generates Miniworlds world events using selected event name', () => {
    buildPackageToolbox(toolbox, 'python', ['miniworlds'], packageManagers);

    const block = {
      getFieldValue: (fieldName) => ({
        WORLD_VAR: 'world',
        EVENT_NAME: 'act',
      })[fieldName],
    };
    const generator = {
      statementToCode: () => '    print("tick")\n',
    };

    const code = pythonGenerator.forBlock.miniworlds_world_event(block, generator);

    expect(code).toBe('@world.register\ndef act(self):\n    print("tick")\n');
  });

  it('generates Miniworlds world attribute assignments and reads', () => {
    buildPackageToolbox(toolbox, 'python', ['miniworlds'], packageManagers);

    const setterBlock = {
      getFieldValue: (fieldName) => ({
        WORLD_VAR: 'world',
        ATTRIBUTE_NAME: 'color',
      })[fieldName],
    };
    const getterBlock = {
      getFieldValue: (fieldName) => ({
        WORLD_VAR: 'world',
        ATTRIBUTE_NAME: 'color',
      })[fieldName],
    };
    const generator = {
      valueToCode: () => '(100, 100, 100)',
    };

    const setterCode = pythonGenerator.forBlock.miniworlds_world_set_attribute(setterBlock, generator);
    const getterCode = pythonGenerator.forBlock.miniworlds_world_get_attribute(getterBlock);
    const colorCode = pythonGenerator.forBlock.miniworlds_rgb_color({
      getFieldValue: (fieldName) => ({ R: 12, G: 34, B: 56 })[fieldName],
    });

    expect(setterCode).toBe('world.color = (100, 100, 100)\n');
    expect(getterCode).toEqual(['world.color', expect.any(Number)]);
    expect(colorCode).toEqual(['(12, 34, 56)', expect.any(Number)]);
  });

  it('generates Miniworlds actor method calls with optional arguments', () => {
    buildPackageToolbox(toolbox, 'python', ['miniworlds'], packageManagers);

    const block = {
      getFieldValue: (fieldName) => ({
        ACTOR_VAR: 'player',
        METHOD_NAME: 'move_to',
      })[fieldName],
    };
    const generator = {
      valueToCode: (currentBlock, inputName) => ({
        ARG1: '10',
        ARG2: '20',
      })[inputName] || '',
    };

    const code = pythonGenerator.forBlock.miniworlds_actor_call_method(block, generator);

    expect(code).toBe('player.move_to(10, 20)\n');
  });

  it('generates a runnable Miniworlds static actor example from serialized blocks', () => {
    buildPackageToolbox(toolbox, 'python', ['miniworlds'], packageManagers);

    const workspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load({
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'miniworlds_import_core',
            next: {
              block: {
                type: 'miniworlds_create_world',
                fields: { WORLD_VAR: 'world' },
                inputs: {
                  WIDTH: { shadow: { type: 'math_number', fields: { NUM: 320 } } },
                  HEIGHT: { shadow: { type: 'math_number', fields: { NUM: 240 } } },
                },
                next: {
                  block: {
                    type: 'miniworlds_world_set_attribute',
                    fields: { WORLD_VAR: 'world', ATTRIBUTE_NAME: 'color' },
                    inputs: {
                      VALUE: {
                        block: {
                          type: 'miniworlds_rgb_color',
                          fields: {
                            R: 35,
                            G: 45,
                            B: 55,
                          },
                        },
                      },
                    },
                    next: {
                      block: {
                        type: 'miniworlds_create_actor',
                        fields: { ACTOR_VAR: 'player' },
                        inputs: {
                          X: { shadow: { type: 'math_number', fields: { NUM: 80 } } },
                          Y: { shadow: { type: 'math_number', fields: { NUM: 90 } } },
                        },
                        next: {
                          block: {
                            type: 'miniworlds_actor_set_attribute',
                            fields: { ACTOR_VAR: 'player', ATTRIBUTE_NAME: 'color' },
                            inputs: {
                              VALUE: {
                                block: {
                                  type: 'miniworlds_rgb_color',
                                  fields: {
                                    R: 240,
                                    G: 80,
                                    B: 60,
                                  },
                                },
                              },
                            },
                            next: {
                              block: {
                                type: 'miniworlds_world_run',
                                fields: { WORLD_VAR: 'world' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    }, workspace);

    expect(pythonGenerator.workspaceToCode(workspace)).toBe(
      'from miniworlds import World, Actor\n'
      + 'world = World(320, 240)\n'
      + 'world.color = (35, 45, 55)\n'
      + 'player = Actor((80, 90))\n'
      + 'player.color = (240, 80, 60)\n'
      + 'world.run()\n',
    );
  });

  it('generates a runnable Miniworlds key-event movement example from serialized blocks', () => {
    buildPackageToolbox(toolbox, 'python', ['miniworlds'], packageManagers);

    const workspace = new Blockly.Workspace();
    Blockly.serialization.workspaces.load({
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'miniworlds_import_core',
            next: {
              block: {
                type: 'miniworlds_create_world',
                fields: { WORLD_VAR: 'world' },
                inputs: {
                  WIDTH: { shadow: { type: 'math_number', fields: { NUM: 320 } } },
                  HEIGHT: { shadow: { type: 'math_number', fields: { NUM: 240 } } },
                },
                next: {
                  block: {
                    type: 'miniworlds_create_actor',
                    fields: { ACTOR_VAR: 'player' },
                    inputs: {
                      X: { shadow: { type: 'math_number', fields: { NUM: 140 } } },
                      Y: { shadow: { type: 'math_number', fields: { NUM: 120 } } },
                    },
                    next: {
                      block: {
                        type: 'miniworlds_actor_event_key_down',
                        fields: { ACTOR_VAR: 'player', KEY: 'd' },
                        inputs: {
                          BODY: {
                            block: {
                              type: 'miniworlds_actor_move',
                              fields: { ACTOR_VAR: 'player', DIRECTION: 'move_right' },
                            },
                          },
                        },
                        next: {
                          block: {
                            type: 'miniworlds_world_run',
                            fields: { WORLD_VAR: 'world' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
    }, workspace);

    expect(pythonGenerator.workspaceToCode(workspace)).toBe(
      'from miniworlds import World, Actor\n'
      + 'world = World(320, 240)\n'
      + 'player = Actor((140, 120))\n'
      + '@player.register\n'
      + 'def on_key_down_d(self):\n'
      + '  player.move_right()\n'
      + 'world.run()\n',
    );
  });
});

describe('Blockly package manager registry', () => {
  it('registers language-owned package managers without hard-wiring them into LibCodeTools', () => {
    resetBlocklyPackageManagers();
    registerBlocklyPackageManagers([
      new NumpyPackageManager(),
      new MatplotlibPackageManager(),
    ]);

    expect(getRegisteredBlocklyPackageManagers().map((manager) => manager.getPackageName())).toEqual([
      'numpy',
      'matplotlib',
    ]);

    const packageToolbox = buildPackageToolbox(TOOLBOX, 'python', ['numpy']);
    expect(packageToolbox.contents.some((category) => category.name === 'NumPy')).toBe(true);
  });

  it('supports isolated registry instances for content-type specific managers', () => {
    const registry = new BlocklyPackageManagerRegistry({ store: [] });
    const manager = new NumpyPackageManager();

    registry.register([manager, { getPackageName: () => '  Custom-Package  ' }, null]);

    expect(registry.getAll().map((item) => item.getPackageName())).toEqual([
      'numpy',
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
