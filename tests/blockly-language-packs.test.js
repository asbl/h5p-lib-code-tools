import { describe, expect, it } from 'vitest';
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';
import {
  buildFilteredToolbox,
  buildPackageToolbox,
} from '../src/scripts/editor/blockly/managers/blockly-language-manager.js';
import {
  LANGUAGE_PACKS,
  PYTHON_CATEGORY_FIELDS,
} from '../src/scripts/editor/blockly/blockly-language-packs.js';

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

describe('buildPackageToolbox', () => {
  const toolbox = LANGUAGE_PACKS.python.toolbox;

  it('returns the original toolbox when no supported package is selected', () => {
    expect(buildPackageToolbox(toolbox, 'python', ['packaging'])).toBe(toolbox);
  });

  it('adds a NumPy category when numpy is selected', () => {
    const packageToolbox = buildPackageToolbox(toolbox, 'python', ['NumPy', 'numpy']);

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
    buildPackageToolbox(toolbox, 'python', ['numpy']);

    expect(Blockly.Blocks.numpy_import_as).toBeDefined();
    expect(Blockly.Blocks.numpy_array_create).toBeDefined();
    expect(Blockly.Blocks.numpy_linspace).toBeDefined();
    expect(Blockly.Blocks.numpy_mean).toBeDefined();
  });

  it('adds a Matplotlib category when matplotlib is selected', () => {
    const packageToolbox = buildPackageToolbox(toolbox, 'python', ['matplotlib']);

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
    const packageToolbox = buildPackageToolbox(toolbox, 'python', ['scipy']);

    const scipyCategories = packageToolbox.contents.filter((category) => category.name === 'SciPy');
    expect(scipyCategories).toHaveLength(1);
    expect(scipyCategories[0].contents.map((item) => item.type)).toEqual([
      'scipy_import_linalg',
      'scipy_linalg_solve',
    ]);
  });

  it('adds a Miniworlds category when miniworlds is selected', () => {
    const packageToolbox = buildPackageToolbox(toolbox, 'python', ['miniworlds']);

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
    buildPackageToolbox(toolbox, 'python', ['matplotlib']);

    expect(Blockly.Blocks.matplotlib_import_pyplot).toBeDefined();
    expect(Blockly.Blocks.matplotlib_create_figure).toBeDefined();
    expect(Blockly.Blocks.matplotlib_plot_line).toBeDefined();
    expect(Blockly.Blocks.matplotlib_set_title).toBeDefined();
    expect(Blockly.Blocks.matplotlib_show_plot).toBeDefined();
  });

  it('registers Blockly block types required by the Miniworlds category', () => {
    buildPackageToolbox(toolbox, 'python', ['miniworlds']);

    expect(Blockly.Blocks.miniworlds_import_core).toBeDefined();
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
    buildPackageToolbox(toolbox, 'python', ['miniworlds']);

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
    buildPackageToolbox(toolbox, 'python', ['miniworlds']);

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
    buildPackageToolbox(toolbox, 'python', ['miniworlds']);

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

    expect(setterCode).toBe('world.color = (100, 100, 100)\n');
    expect(getterCode).toEqual(['world.color', expect.any(Number)]);
  });

  it('generates Miniworlds actor method calls with optional arguments', () => {
    buildPackageToolbox(toolbox, 'python', ['miniworlds']);

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
});
