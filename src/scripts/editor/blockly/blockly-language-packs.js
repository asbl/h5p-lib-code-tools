import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';
import 'blockly/blocks';

const NUMPY_CATEGORY_NAME = 'NumPy';
const NUMPY_CATEGORY_COLOUR = '#4B8BBE';
const PYTHON_FUNCTION_ORDER =
  pythonGenerator.ORDER_FUNCTION_CALL ?? pythonGenerator.ORDER_NONE;

/**
 * Normalizes a value so it can be used as a Python identifier.
 * @param {string} value - Raw identifier candidate.
 * @param {string} fallback - Used when the candidate becomes empty.
 * @returns {string} Safe identifier.
 */
function sanitizePythonIdentifier(value, fallback) {
  const normalized = String(value || '')
    .trim()
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/^[^A-Za-z_]+/, '')
    .replace(/^_+/, '');

  return normalized || fallback;
}

/** Registers custom NumPy Blockly blocks and generators once. */
function registerNumpyBlocks() {
  if (!Blockly.Blocks.numpy_import_as) {
    Blockly.Blocks.numpy_import_as = {
      init() {
        this.appendDummyInput()
          .appendField('import numpy as')
          .appendField(new Blockly.FieldTextInput('np'), 'ALIAS');
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(NUMPY_CATEGORY_COLOUR);
        this.setTooltip('Importiert NumPy mit Alias, z. B. np.');
      },
    };
  }

  if (!Blockly.Blocks.numpy_array_create) {
    Blockly.Blocks.numpy_array_create = {
      init() {
        this.appendValueInput('VALUES')
          .appendField('np.array');
        this.setOutput(true, null);
        this.setColour(NUMPY_CATEGORY_COLOUR);
        this.setTooltip('Erstellt ein NumPy-Array aus einer Liste.');
      },
    };
  }

  if (!Blockly.Blocks.numpy_linspace) {
    Blockly.Blocks.numpy_linspace = {
      init() {
        this.appendValueInput('START')
          .setCheck('Number')
          .appendField('np.linspace start');
        this.appendValueInput('STOP')
          .setCheck('Number')
          .appendField('stop');
        this.appendValueInput('COUNT')
          .setCheck('Number')
          .appendField('anzahl');
        this.setInputsInline(true);
        this.setOutput(true, null);
        this.setColour(NUMPY_CATEGORY_COLOUR);
        this.setTooltip('Erstellt eine gleichmaessig verteilte Zahlenfolge.');
      },
    };
  }

  if (!Blockly.Blocks.numpy_mean) {
    Blockly.Blocks.numpy_mean = {
      init() {
        this.appendValueInput('VALUES')
          .appendField('np.mean');
        this.setOutput(true, 'Number');
        this.setColour(NUMPY_CATEGORY_COLOUR);
        this.setTooltip('Berechnet den Mittelwert eines NumPy-Arrays.');
      },
    };
  }

  if (!pythonGenerator.forBlock.numpy_import_as) {
    pythonGenerator.forBlock.numpy_import_as = (block) => {
      const alias = sanitizePythonIdentifier(block.getFieldValue('ALIAS'), 'np');
      return `import numpy as ${alias}\n`;
    };
  }

  if (!pythonGenerator.forBlock.numpy_array_create) {
    pythonGenerator.forBlock.numpy_array_create = (block, generator) => {
      const values = generator.valueToCode(block, 'VALUES', pythonGenerator.ORDER_NONE) || '[]';
      return [`np.array(${values})`, PYTHON_FUNCTION_ORDER];
    };
  }

  if (!pythonGenerator.forBlock.numpy_linspace) {
    pythonGenerator.forBlock.numpy_linspace = (block, generator) => {
      const start = generator.valueToCode(block, 'START', pythonGenerator.ORDER_NONE) || '0';
      const stop = generator.valueToCode(block, 'STOP', pythonGenerator.ORDER_NONE) || '1';
      const count = generator.valueToCode(block, 'COUNT', pythonGenerator.ORDER_NONE) || '50';
      return [`np.linspace(${start}, ${stop}, ${count})`, PYTHON_FUNCTION_ORDER];
    };
  }

  if (!pythonGenerator.forBlock.numpy_mean) {
    pythonGenerator.forBlock.numpy_mean = (block, generator) => {
      const values = generator.valueToCode(block, 'VALUES', pythonGenerator.ORDER_NONE) || '[]';
      return [`np.mean(${values})`, PYTHON_FUNCTION_ORDER];
    };
  }
}

const PYTHON_PACKAGE_TOOLBOX_BUILDERS = {
  numpy: () => {
    registerNumpyBlocks();
    return {
      kind: 'category',
      name: NUMPY_CATEGORY_NAME,
      colour: NUMPY_CATEGORY_COLOUR,
      contents: [
        { kind: 'block', type: 'numpy_import_as' },
        {
          kind: 'block',
          type: 'numpy_array_create',
          inputs: {
            VALUES: {
              shadow: {
                type: 'lists_create_empty',
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'numpy_linspace',
          inputs: {
            START: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 0 },
              },
            },
            STOP: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 10 },
              },
            },
            COUNT: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 50 },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'numpy_mean',
          inputs: {
            VALUES: {
              shadow: {
                type: 'lists_create_empty',
              },
            },
          },
        },
      ],
    };
  },
};

/**
 * Adds package-specific toolbox categories for supported languages.
 * @param {object} toolbox - Base toolbox.
 * @param {string} codingLanguage - Active language key.
 * @param {string[]} packageNames - Selected package names.
 * @returns {object} Base toolbox or extended toolbox.
 */
export function buildPackageToolbox(toolbox, codingLanguage, packageNames = []) {
  const normalizedLanguage = String(codingLanguage || '').toLowerCase();
  if (normalizedLanguage !== 'python' && normalizedLanguage !== 'pseudocode') {
    return toolbox;
  }

  const selectedPackages = [
    ...new Set(
      (Array.isArray(packageNames) ? packageNames : [])
        .map((name) => String(name || '').trim().toLowerCase())
        .filter(Boolean)
    ),
  ];

  const additions = selectedPackages
    .map((packageName) => PYTHON_PACKAGE_TOOLBOX_BUILDERS[packageName]?.())
    .filter(Boolean);

  if (additions.length === 0) {
    return toolbox;
  }

  return {
    ...toolbox,
    contents: [
      ...toolbox.contents,
      ...additions,
    ],
  };
}

/**
 * Standard Python toolbox – covers enough blocks for introductory tasks.
 * Categories are ordered from most-commonly used to least.
 */
const PYTHON_TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Variablen',
      colour: '#A65C81',
      custom: 'VARIABLE',
    },
    {
      kind: 'category',
      name: 'Logik',
      colour: '#5C81A6',
      contents: [
        { kind: 'block', type: 'controls_if' },
        {
          kind: 'block',
          type: 'logic_compare',
          fields: { OP: 'EQ' },
        },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_negate' },
        { kind: 'block', type: 'logic_boolean' },
        { kind: 'block', type: 'logic_null' },
        { kind: 'block', type: 'logic_ternary' },
      ],
    },
    {
      kind: 'category',
      name: 'Schleifen',
      colour: '#5CA65C',
      contents: [
        {
          kind: 'block',
          type: 'controls_repeat_ext',
          inputs: {
            TIMES: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 10 },
              },
            },
          },
        },
        { kind: 'block', type: 'controls_whileUntil' },
        {
          kind: 'block',
          type: 'controls_for',
          inputs: {
            FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
            TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } },
            BY: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
          },
        },
        { kind: 'block', type: 'controls_forEach' },
        { kind: 'block', type: 'controls_flow_statements' },
      ],
    },
    {
      kind: 'category',
      name: 'Mathematik',
      colour: '#5C5CA6',
      contents: [
        { kind: 'block', type: 'math_number' },
        {
          kind: 'block',
          type: 'math_arithmetic',
          fields: { OP: 'ADD' },
          inputs: {
            A: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
            B: { shadow: { type: 'math_number', fields: { NUM: 1 } } },
          },
        },
        {
          kind: 'block',
          type: 'math_modulo',
          inputs: {
            DIVIDEND: { shadow: { type: 'math_number', fields: { NUM: 64 } } },
            DIVISOR: { shadow: { type: 'math_number', fields: { NUM: 10 } } },
          },
        },
        { kind: 'block', type: 'math_round' },
        { kind: 'block', type: 'math_single' },
        { kind: 'block', type: 'math_random_int' },
        { kind: 'block', type: 'math_random_float' },
        {
          kind: 'block',
          type: 'math_number_property',
          fields: { PROPERTY: 'EVEN' },
          inputs: {
            NUMBER_TO_CHECK: {
              shadow: { type: 'math_number', fields: { NUM: 0 } },
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Text',
      colour: '#A65C5C',
      contents: [
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'text_join' },
        {
          kind: 'block',
          type: 'text_append',
          inputs: {
            TEXT: { shadow: { type: 'text' } },
          },
        },
        { kind: 'block', type: 'text_length' },
        { kind: 'block', type: 'text_isEmpty' },
        { kind: 'block', type: 'text_indexOf' },
        { kind: 'block', type: 'text_charAt' },
        { kind: 'block', type: 'text_getSubstring' },
        { kind: 'block', type: 'text_changeCase' },
        { kind: 'block', type: 'text_trim' },
        {
          kind: 'block',
          type: 'text_print',
          inputs: {
            TEXT: { shadow: { type: 'text', fields: { TEXT: 'Hallo' } } },
          },
        },
        {
          kind: 'block',
          type: 'text_prompt_ext',
          inputs: {
            TEXT: { shadow: { type: 'text', fields: { TEXT: 'Eingabe:' } } },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Listen',
      colour: '#5CA6A6',
      contents: [
        { kind: 'block', type: 'lists_create_empty' },
        { kind: 'block', type: 'lists_create_with' },
        { kind: 'block', type: 'lists_repeat' },
        { kind: 'block', type: 'lists_length' },
        { kind: 'block', type: 'lists_isEmpty' },
        { kind: 'block', type: 'lists_indexOf' },
        { kind: 'block', type: 'lists_getIndex' },
        { kind: 'block', type: 'lists_setIndex' },
        { kind: 'block', type: 'lists_getSublist' },
        { kind: 'block', type: 'lists_sort' },
      ],
    },
    {
      kind: 'category',
      name: 'Funktionen',
      colour: '#9A5CA6',
      custom: 'PROCEDURE',
    },
  ],
};

/**
 * Minimal SQL toolbox – blocks-based SQL input is not yet fully implemented.
 * Falls back to CodeMirror in practice; this stub keeps the registry consistent.
 */
const SQL_TOOLBOX = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'SQL',
      colour: '#5C81A6',
      contents: [],
    },
  ],
};

/** SQL generator – placeholder, generates empty string. */
function sqlGeneratorFn(/* workspace */) {
  return '';
}

/**
 * Maps semantics boolean field names to toolbox category display names for Python.
 * A field value of `false` means the category is excluded from the toolbox.
 */
export const PYTHON_CATEGORY_FIELDS = {
  variables: 'Variablen',
  logic: 'Logik',
  loops: 'Schleifen',
  math: 'Mathematik',
  text: 'Text',
  lists: 'Listen',
  functions: 'Funktionen',
};

/**
 * Builds a (potentially filtered) toolbox based on a category selection map.
 * If `categorySelection` is null/undefined, the full unmodified toolbox is returned.
 * For categories referenced by `categoryFieldMap`, a category is included as long as
 * its boolean field is not explicitly `false`. Categories outside of that map are
 * left untouched.
 *
 * @param {object} toolbox - Full toolbox definition.
 * @param {Record<string, boolean>|null|undefined} categorySelection - Boolean map keyed by field name.
 * @param {Record<string, string>} categoryFieldMap - Maps field names to toolbox category display names.
 * @returns {object} Full or filtered toolbox.
 */
export function buildFilteredToolbox(toolbox, categorySelection, categoryFieldMap) {
  if (!categorySelection || typeof categorySelection !== 'object') return toolbox;

  const mappedNames = new Set(Object.values(categoryFieldMap || {}));
  const enabledNames = new Set(
    Object.entries(categoryFieldMap || {})
      .filter(([fieldKey]) => categorySelection[fieldKey] !== false)
      .map(([, name]) => name)
  );

  const filteredContents = toolbox.contents.filter((cat) => {
    if (!mappedNames.has(cat.name)) return true;
    return enabledNames.has(cat.name);
  });
  // Return the original toolbox object when nothing was filtered out.
  if (filteredContents.length === toolbox.contents.length) return toolbox;
  return { ...toolbox, contents: filteredContents };
}

export const LANGUAGE_PACKS = {
  python: {
    toolbox: PYTHON_TOOLBOX,
    categoryFieldMap: PYTHON_CATEGORY_FIELDS,
    /** @param {Blockly.WorkspaceSvg} workspace */
    generate(workspace) {
      return pythonGenerator.workspaceToCode(workspace) || '';
    },
    supported: true,
  },
  pseudocode: {
    // Pseudocode reuses the Python block set and generator.
    toolbox: PYTHON_TOOLBOX,
    categoryFieldMap: PYTHON_CATEGORY_FIELDS,
    generate(workspace) {
      return pythonGenerator.workspaceToCode(workspace) || '';
    },
    supported: true,
  },
  sql: {
    toolbox: SQL_TOOLBOX,
    categoryFieldMap: {},
    generate: sqlGeneratorFn,
    supported: false, // SQL blocks not yet implemented
  },
};

/**
 * Returns the language pack for the given coding language.
 * Falls back to the Python pack if no dedicated pack exists.
 * @param {string} codingLanguage
 * @returns {{ toolbox: object, generate: function, supported: boolean }}
 */
export function getLanguagePack(codingLanguage) {
  return LANGUAGE_PACKS[codingLanguage] ?? LANGUAGE_PACKS.python;
}
