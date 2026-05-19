const GRAPHICS_COLOUR = '#2F8F83';

function shadowNumber(value) {
  return {
    shadow: {
      type: 'math_number',
      fields: { NUM: value },
    },
  };
}

/**
 * Provides language-neutral Blockly blocks for Processing-style canvas output.
 *
 * Language packs should call `registerGraphicsBlocks` and then map the generic
 * block types to their own runtime API, for example `H5P5.circle(...)` in Java
 * or `circle(...)` in Python. The toolbox category is intentionally generic so
 * the same authoring surface can be reused across content types.
 */
export class BlocklyGraphicsBlocks {
  /**
   * Registers the blocks with a loaded Blockly runtime.
   * @param {object} Blockly Blockly runtime.
   * @returns {void}
   */
  register(Blockly) {
    if (!Blockly?.Blocks) {
      return;
    }

    this.registerSizeBlock(Blockly);
    this.registerBackgroundBlock(Blockly);
    this.registerFillBlock(Blockly);
    this.registerStrokeBlock(Blockly);
    this.registerStrokeWeightBlock(Blockly);
    this.registerNoStrokeBlock(Blockly);
    this.registerCircleBlock(Blockly);
    this.registerRectBlock(Blockly);
    this.registerLineBlock(Blockly);
    this.registerTextBlock(Blockly);
  }

  registerSizeBlock(Blockly) {
    if (Blockly.Blocks.graphics_canvas_size) return;
    Blockly.Blocks.graphics_canvas_size = {
      init() {
        this.appendValueInput('WIDTH').setCheck('Number').appendField('Canvas');
        this.appendValueInput('HEIGHT').setCheck('Number').appendField('x');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(GRAPHICS_COLOUR);
      },
    };
  }

  registerBackgroundBlock(Blockly) {
    if (Blockly.Blocks.graphics_background) return;
    Blockly.Blocks.graphics_background = {
      init() {
        this.appendValueInput('R').setCheck('Number').appendField('Hintergrund r');
        this.appendValueInput('G').setCheck('Number').appendField('g');
        this.appendValueInput('B').setCheck('Number').appendField('b');
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(GRAPHICS_COLOUR);
      },
    };
  }

  registerFillBlock(Blockly) {
    if (Blockly.Blocks.graphics_fill) return;
    Blockly.Blocks.graphics_fill = {
      init() {
        this.appendValueInput('R').setCheck('Number').appendField('Fuellfarbe r');
        this.appendValueInput('G').setCheck('Number').appendField('g');
        this.appendValueInput('B').setCheck('Number').appendField('b');
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(GRAPHICS_COLOUR);
      },
    };
  }

  registerStrokeBlock(Blockly) {
    if (Blockly.Blocks.graphics_stroke) return;
    Blockly.Blocks.graphics_stroke = {
      init() {
        this.appendValueInput('R').setCheck('Number').appendField('Linienfarbe r');
        this.appendValueInput('G').setCheck('Number').appendField('g');
        this.appendValueInput('B').setCheck('Number').appendField('b');
        this.setInputsInline(true);
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(GRAPHICS_COLOUR);
      },
    };
  }

  registerStrokeWeightBlock(Blockly) {
    if (Blockly.Blocks.graphics_stroke_weight) return;
    Blockly.Blocks.graphics_stroke_weight = {
      init() {
        this.appendValueInput('WEIGHT').setCheck('Number').appendField('Linienbreite');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(GRAPHICS_COLOUR);
      },
    };
  }

  registerNoStrokeBlock(Blockly) {
    if (Blockly.Blocks.graphics_no_stroke) return;
    Blockly.Blocks.graphics_no_stroke = {
      init() {
        this.appendDummyInput().appendField('keine Linie');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(GRAPHICS_COLOUR);
      },
    };
  }

  registerCircleBlock(Blockly) {
    if (Blockly.Blocks.graphics_circle) return;
    Blockly.Blocks.graphics_circle = {
      init() {
        this.appendValueInput('X').setCheck('Number').appendField('Kreis x');
        this.appendValueInput('Y').setCheck('Number').appendField('y');
        this.appendValueInput('D').setCheck('Number').appendField('Durchmesser');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(GRAPHICS_COLOUR);
      },
    };
  }

  registerRectBlock(Blockly) {
    if (Blockly.Blocks.graphics_rect) return;
    Blockly.Blocks.graphics_rect = {
      init() {
        this.appendValueInput('X').setCheck('Number').appendField('Rechteck x');
        this.appendValueInput('Y').setCheck('Number').appendField('y');
        this.appendValueInput('WIDTH').setCheck('Number').appendField('Breite');
        this.appendValueInput('HEIGHT').setCheck('Number').appendField('Hoehe');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(GRAPHICS_COLOUR);
      },
    };
  }

  registerLineBlock(Blockly) {
    if (Blockly.Blocks.graphics_line) return;
    Blockly.Blocks.graphics_line = {
      init() {
        this.appendValueInput('X1').setCheck('Number').appendField('Linie x1');
        this.appendValueInput('Y1').setCheck('Number').appendField('y1');
        this.appendValueInput('X2').setCheck('Number').appendField('x2');
        this.appendValueInput('Y2').setCheck('Number').appendField('y2');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(GRAPHICS_COLOUR);
      },
    };
  }

  registerTextBlock(Blockly) {
    if (Blockly.Blocks.graphics_text) return;
    Blockly.Blocks.graphics_text = {
      init() {
        this.appendValueInput('TEXT').appendField('Text');
        this.appendValueInput('X').setCheck('Number').appendField('x');
        this.appendValueInput('Y').setCheck('Number').appendField('y');
        this.setPreviousStatement(true);
        this.setNextStatement(true);
        this.setColour(GRAPHICS_COLOUR);
      },
    };
  }

  /**
   * Returns a toolbox category for the graphics blocks.
   * @returns {object} Blockly toolbox category.
   */
  buildCategory() {
    return {
      kind: 'category',
      name: 'Grafik',
      colour: GRAPHICS_COLOUR,
      contents: [
        {
          kind: 'block',
          type: 'graphics_canvas_size',
          inputs: {
            WIDTH: shadowNumber(400),
            HEIGHT: shadowNumber(300),
          },
        },
        {
          kind: 'block',
          type: 'graphics_background',
          inputs: {
            R: shadowNumber(240),
            G: shadowNumber(240),
            B: shadowNumber(240),
          },
        },
        {
          kind: 'block',
          type: 'graphics_fill',
          inputs: {
            R: shadowNumber(40),
            G: shadowNumber(120),
            B: shadowNumber(220),
          },
        },
        {
          kind: 'block',
          type: 'graphics_stroke',
          inputs: {
            R: shadowNumber(20),
            G: shadowNumber(30),
            B: shadowNumber(40),
          },
        },
        {
          kind: 'block',
          type: 'graphics_stroke_weight',
          inputs: { WEIGHT: shadowNumber(2) },
        },
        { kind: 'block', type: 'graphics_no_stroke' },
        {
          kind: 'block',
          type: 'graphics_circle',
          inputs: {
            X: shadowNumber(200),
            Y: shadowNumber(150),
            D: shadowNumber(80),
          },
        },
        {
          kind: 'block',
          type: 'graphics_rect',
          inputs: {
            X: shadowNumber(80),
            Y: shadowNumber(80),
            WIDTH: shadowNumber(120),
            HEIGHT: shadowNumber(80),
          },
        },
        {
          kind: 'block',
          type: 'graphics_line',
          inputs: {
            X1: shadowNumber(20),
            Y1: shadowNumber(20),
            X2: shadowNumber(200),
            Y2: shadowNumber(120),
          },
        },
        {
          kind: 'block',
          type: 'graphics_text',
          inputs: {
            TEXT: { shadow: { type: 'text', fields: { TEXT: 'Hallo' } } },
            X: shadowNumber(40),
            Y: shadowNumber(40),
          },
        },
      ],
    };
  }
}

export const blocklyGraphicsBlocks = new BlocklyGraphicsBlocks();

export function registerGraphicsBlocks(Blockly) {
  blocklyGraphicsBlocks.register(Blockly);
}

export function buildGraphicsCategory() {
  return blocklyGraphicsBlocks.buildCategory();
}
