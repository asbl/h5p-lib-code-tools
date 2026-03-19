import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';
import 'blockly/blocks';

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
        { kind: 'block', type: 'math_is_even' },
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
 * A category is included as long as its boolean field is not explicitly `false`.
 *
 * @param {object} toolbox - Full toolbox definition.
 * @param {Record<string, boolean>|null|undefined} categorySelection - Boolean map keyed by field name.
 * @param {Record<string, string>} categoryFieldMap - Maps field names to toolbox category display names.
 * @returns {object} Full or filtered toolbox.
 */
export function buildFilteredToolbox(toolbox, categorySelection, categoryFieldMap) {
  if (!categorySelection || typeof categorySelection !== 'object') return toolbox;

  const enabledNames = new Set(
    Object.entries(categoryFieldMap)
      .filter(([fieldKey]) => categorySelection[fieldKey] !== false)
      .map(([, name]) => name)
  );

  const filteredContents = toolbox.contents.filter((cat) => enabledNames.has(cat.name));
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
