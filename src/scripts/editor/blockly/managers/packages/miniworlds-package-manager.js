import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

const MINIWORLDS_CATEGORY_NAME = 'Miniworlds';
const MINIWORLDS_CATEGORY_COLOUR = '#3C8D5A';

/**
 * Normalizes a value so it can be used as a Python identifier.
 * @param {string} value Raw identifier candidate.
 * @param {string} fallback Used when the candidate becomes empty.
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

/**
 * Returns the generated statement body or a Python pass fallback.
 * @param {object} block Blockly block.
 * @param {object} generator Blockly generator.
 * @returns {string} Indented body code.
 */
function getEventBody(block, generator) {
  const body = generator.statementToCode(block, 'BODY');
  return body || '    pass\n';
}

/**
 * Adds Miniworlds-specific Blockly blocks and category definition.
 */
export default class MiniworldsPackageManager {
  /**
   * Returns the normalized package identifier.
   * @returns {string} Package name.
   */
  getPackageName() {
    return 'miniworlds';
  }

  /**
   * Indicates whether this manager is relevant for the language.
   * @param {string} codingLanguage Current coding language.
   * @returns {boolean} True if package blocks are supported.
   */
  supportsLanguage(codingLanguage) {
    const normalized = String(codingLanguage || '').toLowerCase();
    return normalized === 'python' || normalized === 'pseudocode';
  }

  /**
   * Builds the toolbox category for Miniworlds.
   * @returns {object} Blockly category descriptor.
   */
  buildCategory() {
    this._registerBlocks();

    return {
      kind: 'category',
      name: MINIWORLDS_CATEGORY_NAME,
      colour: MINIWORLDS_CATEGORY_COLOUR,
      contents: [
        { kind: 'block', type: 'miniworlds_import_core' },
        {
          kind: 'block',
          type: 'miniworlds_create_world',
          inputs: {
            WIDTH: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 400 },
              },
            },
            HEIGHT: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 400 },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'miniworlds_add_background',
          inputs: {
            PATH: {
              shadow: {
                type: 'text',
                fields: { TEXT: 'images/grass.jpg' },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'miniworlds_create_actor',
          inputs: {
            X: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 90 },
              },
            },
            Y: {
              shadow: {
                type: 'math_number',
                fields: { NUM: 90 },
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'miniworlds_actor_add_costume',
          inputs: {
            PATH: {
              shadow: {
                type: 'text',
                fields: { TEXT: 'images/player.png' },
              },
            },
          },
        },
        { kind: 'block', type: 'miniworlds_actor_move' },
        { kind: 'block', type: 'miniworlds_actor_event_lifecycle' },
        { kind: 'block', type: 'miniworlds_actor_event_key_down' },
        { kind: 'block', type: 'miniworlds_actor_event_key_pressed' },
        { kind: 'block', type: 'miniworlds_world_event' },
        { kind: 'block', type: 'miniworlds_world_run' },
      ],
    };
  }

  _registerBlocks() {
    if (!Blockly.Blocks.miniworlds_import_core) {
      Blockly.Blocks.miniworlds_import_core = {
        init() {
          this.appendDummyInput().appendField('from miniworlds import World, Actor');
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(MINIWORLDS_CATEGORY_COLOUR);
          this.setTooltip('Importiert die wichtigsten Miniworlds-Klassen.');
        },
      };
    }

    if (!Blockly.Blocks.miniworlds_create_world) {
      Blockly.Blocks.miniworlds_create_world = {
        init() {
          this.appendDummyInput()
            .appendField('world')
            .appendField(new Blockly.FieldTextInput('world'), 'WORLD_VAR')
            .appendField('= World');
          this.appendValueInput('WIDTH')
            .setCheck('Number')
            .appendField('breite');
          this.appendValueInput('HEIGHT')
            .setCheck('Number')
            .appendField('hoehe');
          this.setInputsInline(true);
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(MINIWORLDS_CATEGORY_COLOUR);
          this.setTooltip('Erstellt eine neue Welt mit Breite und Hoehe.');
        },
      };
    }

    if (!Blockly.Blocks.miniworlds_add_background) {
      Blockly.Blocks.miniworlds_add_background = {
        init() {
          this.appendDummyInput()
            .appendField('world')
            .appendField(new Blockly.FieldTextInput('world'), 'WORLD_VAR')
            .appendField('.add_background');
          this.appendValueInput('PATH')
            .appendField('pfad');
          this.setInputsInline(true);
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(MINIWORLDS_CATEGORY_COLOUR);
          this.setTooltip('Setzt den Hintergrund der Welt.');
        },
      };
    }

    if (!Blockly.Blocks.miniworlds_create_actor) {
      Blockly.Blocks.miniworlds_create_actor = {
        init() {
          this.appendDummyInput()
            .appendField('actor')
            .appendField(new Blockly.FieldTextInput('player'), 'ACTOR_VAR')
            .appendField('= Actor');
          this.appendValueInput('X')
            .setCheck('Number')
            .appendField('x');
          this.appendValueInput('Y')
            .setCheck('Number')
            .appendField('y');
          this.setInputsInline(true);
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(MINIWORLDS_CATEGORY_COLOUR);
          this.setTooltip('Erstellt eine Figur an der Position (x, y).');
        },
      };
    }

    if (!Blockly.Blocks.miniworlds_actor_add_costume) {
      Blockly.Blocks.miniworlds_actor_add_costume = {
        init() {
          this.appendDummyInput()
            .appendField('actor')
            .appendField(new Blockly.FieldTextInput('player'), 'ACTOR_VAR')
            .appendField('.add_costume');
          this.appendValueInput('PATH').appendField('pfad');
          this.setInputsInline(true);
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(MINIWORLDS_CATEGORY_COLOUR);
          this.setTooltip('Fuegt einer Figur ein Kostuem hinzu.');
        },
      };
    }

    if (!Blockly.Blocks.miniworlds_actor_move) {
      Blockly.Blocks.miniworlds_actor_move = {
        init() {
          this.appendDummyInput()
            .appendField('actor')
            .appendField(new Blockly.FieldTextInput('player'), 'ACTOR_VAR')
            .appendField(new Blockly.FieldDropdown([
              ['move_up', 'move_up'],
              ['move_down', 'move_down'],
              ['move_left', 'move_left'],
              ['move_right', 'move_right'],
            ]), 'DIRECTION');
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(MINIWORLDS_CATEGORY_COLOUR);
          this.setTooltip('Bewegt eine Figur in eine Richtung.');
        },
      };
    }

    if (!Blockly.Blocks.miniworlds_world_run) {
      Blockly.Blocks.miniworlds_world_run = {
        init() {
          this.appendDummyInput()
            .appendField('world')
            .appendField(new Blockly.FieldTextInput('world'), 'WORLD_VAR')
            .appendField('.run()');
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(MINIWORLDS_CATEGORY_COLOUR);
          this.setTooltip('Startet die Miniworlds-Welt.');
        },
      };
    }

    if (!Blockly.Blocks.miniworlds_actor_event_lifecycle) {
      Blockly.Blocks.miniworlds_actor_event_lifecycle = {
        init() {
          this.appendDummyInput()
            .appendField('event actor')
            .appendField(new Blockly.FieldTextInput('player'), 'ACTOR_VAR')
            .appendField(new Blockly.FieldDropdown([
              ['on_setup', 'on_setup'],
              ['act', 'act'],
            ]), 'EVENT_NAME');
          this.appendStatementInput('BODY').appendField('do');
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(MINIWORLDS_CATEGORY_COLOUR);
          this.setTooltip('Registriert ein Actor-Lifecycle-Event.');
        },
      };
    }

    if (!Blockly.Blocks.miniworlds_actor_event_key_down) {
      Blockly.Blocks.miniworlds_actor_event_key_down = {
        init() {
          this.appendDummyInput()
            .appendField('event actor')
            .appendField(new Blockly.FieldTextInput('player'), 'ACTOR_VAR')
            .appendField('on_key_down')
            .appendField(new Blockly.FieldDropdown([
              ['w', 'w'],
              ['a', 'a'],
              ['s', 's'],
              ['d', 'd'],
              ['space', 'space'],
            ]), 'KEY');
          this.appendStatementInput('BODY').appendField('do');
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(MINIWORLDS_CATEGORY_COLOUR);
          this.setTooltip('Registriert ein key-down-Event fuer eine Taste.');
        },
      };
    }

    if (!Blockly.Blocks.miniworlds_actor_event_key_pressed) {
      Blockly.Blocks.miniworlds_actor_event_key_pressed = {
        init() {
          this.appendDummyInput()
            .appendField('event actor')
            .appendField(new Blockly.FieldTextInput('player'), 'ACTOR_VAR')
            .appendField('on_key_pressed(keys)');
          this.appendStatementInput('BODY').appendField('do');
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(MINIWORLDS_CATEGORY_COLOUR);
          this.setTooltip('Registriert ein key-pressed-Event mit keys-Parameter.');
        },
      };
    }

    if (!Blockly.Blocks.miniworlds_world_event) {
      Blockly.Blocks.miniworlds_world_event = {
        init() {
          this.appendDummyInput()
            .appendField('event world')
            .appendField(new Blockly.FieldTextInput('world'), 'WORLD_VAR')
            .appendField(new Blockly.FieldDropdown([
              ['on_setup', 'on_setup'],
              ['act', 'act'],
            ]), 'EVENT_NAME');
          this.appendStatementInput('BODY').appendField('do');
          this.setPreviousStatement(true, null);
          this.setNextStatement(true, null);
          this.setColour(MINIWORLDS_CATEGORY_COLOUR);
          this.setTooltip('Registriert ein World-Event.');
        },
      };
    }

    if (!pythonGenerator.forBlock.miniworlds_import_core) {
      pythonGenerator.forBlock.miniworlds_import_core = () => 'from miniworlds import World, Actor\n';
    }

    if (!pythonGenerator.forBlock.miniworlds_create_world) {
      pythonGenerator.forBlock.miniworlds_create_world = (block, generator) => {
        const worldVar = sanitizePythonIdentifier(block.getFieldValue('WORLD_VAR'), 'world');
        const width = generator.valueToCode(block, 'WIDTH', pythonGenerator.ORDER_NONE) || '400';
        const height = generator.valueToCode(block, 'HEIGHT', pythonGenerator.ORDER_NONE) || '400';
        return `${worldVar} = World(${width}, ${height})\n`;
      };
    }

    if (!pythonGenerator.forBlock.miniworlds_add_background) {
      pythonGenerator.forBlock.miniworlds_add_background = (block, generator) => {
        const worldVar = sanitizePythonIdentifier(block.getFieldValue('WORLD_VAR'), 'world');
        const path = generator.valueToCode(block, 'PATH', pythonGenerator.ORDER_NONE) || "'images/grass.jpg'";
        return `${worldVar}.add_background(${path})\n`;
      };
    }

    if (!pythonGenerator.forBlock.miniworlds_create_actor) {
      pythonGenerator.forBlock.miniworlds_create_actor = (block, generator) => {
        const actorVar = sanitizePythonIdentifier(block.getFieldValue('ACTOR_VAR'), 'player');
        const x = generator.valueToCode(block, 'X', pythonGenerator.ORDER_NONE) || '90';
        const y = generator.valueToCode(block, 'Y', pythonGenerator.ORDER_NONE) || '90';
        return `${actorVar} = Actor((${x}, ${y}))\n`;
      };
    }

    if (!pythonGenerator.forBlock.miniworlds_actor_add_costume) {
      pythonGenerator.forBlock.miniworlds_actor_add_costume = (block, generator) => {
        const actorVar = sanitizePythonIdentifier(block.getFieldValue('ACTOR_VAR'), 'player');
        const path = generator.valueToCode(block, 'PATH', pythonGenerator.ORDER_NONE) || "'images/player.png'";
        return `${actorVar}.add_costume(${path})\n`;
      };
    }

    if (!pythonGenerator.forBlock.miniworlds_actor_move) {
      pythonGenerator.forBlock.miniworlds_actor_move = (block) => {
        const actorVar = sanitizePythonIdentifier(block.getFieldValue('ACTOR_VAR'), 'player');
        const direction = String(block.getFieldValue('DIRECTION') || 'move_right').trim();
        return `${actorVar}.${direction}()\n`;
      };
    }

    if (!pythonGenerator.forBlock.miniworlds_actor_event_lifecycle) {
      pythonGenerator.forBlock.miniworlds_actor_event_lifecycle = (block, generator) => {
        const actorVar = sanitizePythonIdentifier(block.getFieldValue('ACTOR_VAR'), 'player');
        const eventName = String(block.getFieldValue('EVENT_NAME') || 'act').trim();
        const body = getEventBody(block, generator);
        return `@${actorVar}.register\ndef ${eventName}(self):\n${body}`;
      };
    }

    if (!pythonGenerator.forBlock.miniworlds_actor_event_key_down) {
      pythonGenerator.forBlock.miniworlds_actor_event_key_down = (block, generator) => {
        const actorVar = sanitizePythonIdentifier(block.getFieldValue('ACTOR_VAR'), 'player');
        const keySuffix = sanitizePythonIdentifier(block.getFieldValue('KEY'), 'w');
        const body = getEventBody(block, generator);
        return `@${actorVar}.register\ndef on_key_down_${keySuffix}(self):\n${body}`;
      };
    }

    if (!pythonGenerator.forBlock.miniworlds_actor_event_key_pressed) {
      pythonGenerator.forBlock.miniworlds_actor_event_key_pressed = (block, generator) => {
        const actorVar = sanitizePythonIdentifier(block.getFieldValue('ACTOR_VAR'), 'player');
        const body = getEventBody(block, generator);
        return `@${actorVar}.register\ndef on_key_pressed(self, keys):\n${body}`;
      };
    }

    if (!pythonGenerator.forBlock.miniworlds_world_event) {
      pythonGenerator.forBlock.miniworlds_world_event = (block, generator) => {
        const worldVar = sanitizePythonIdentifier(block.getFieldValue('WORLD_VAR'), 'world');
        const eventName = String(block.getFieldValue('EVENT_NAME') || 'act').trim();
        const body = getEventBody(block, generator);
        return `@${worldVar}.register\ndef ${eventName}(self):\n${body}`;
      };
    }

    if (!pythonGenerator.forBlock.miniworlds_world_run) {
      pythonGenerator.forBlock.miniworlds_world_run = (block) => {
        const worldVar = sanitizePythonIdentifier(block.getFieldValue('WORLD_VAR'), 'world');
        return `${worldVar}.run()\n`;
      };
    }
  }
}
