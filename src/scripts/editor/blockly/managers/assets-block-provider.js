import {
  getBlocklyPythonGenerator,
  getBlocklyRuntime,
} from '../blockly-runtime.js';

/**
 * Dynamically creates and registers Blockly blocks for uploaded images and sounds.
 * Block definitions are created on-demand as files are uploaded/renamed/removed.
 *
 * This provider enables students to reference uploaded assets in Blockly code.
 * Generated code accesses assets via h5p_images["filename"] or h5p_sounds["filename"].
 */
export default class AssetsBlockProvider {
  /**
   * @param {object} codeContainer - CodeContainer with getImageManager/getSoundManager.
   */
  constructor(codeContainer) {
    this.codeContainer = codeContainer;
    this.registeredBlocks = new Set();
  }

  /**
   * Registers a value block that returns a dropdown of all uploaded images.
   * The block itself is static; the dropdown options are updated dynamically.
   * @returns {void}
   */
  registerImageDropdownBlock() {
    const Blockly = getBlocklyRuntime();
    const pythonGenerator = getBlocklyPythonGenerator();
    const blockType = 'assets_image_dropdown';

    if (this.registeredBlocks.has(blockType)) {
      return;
    }

    Blockly.Blocks[blockType] = {
      init() {
        this.appendDummyInput()
          .appendField('Image: ')
          .appendField(
            new Blockly.FieldDropdown(() => {
              return AssetsBlockProvider.getImageDropdownOptions(codeContainer);
            }),
            'IMAGE_FILE'
          );

        this.setOutput(true, 'String');
        this.setColour(230);
        this.setTooltip('Select an uploaded image');
      },
    };

    pythonGenerator.forBlock[blockType] = (block) => {
      const fileName = block.getFieldValue('IMAGE_FILE');
      const code = `h5p_images["${fileName}"]["path"]`;
      return [code, pythonGenerator.ORDER_ATOMIC];
    };

    this.registeredBlocks.add(blockType);
  }

  /**
   * Registers a value block that returns a dropdown of all uploaded sounds.
   * @returns {void}
   */
  registerSoundDropdownBlock() {
    const Blockly = getBlocklyRuntime();
    const pythonGenerator = getBlocklyPythonGenerator();
    const blockType = 'assets_sound_dropdown';

    if (this.registeredBlocks.has(blockType)) {
      return;
    }

    Blockly.Blocks[blockType] = {
      init() {
        this.appendDummyInput()
          .appendField('Sound: ')
          .appendField(
            new Blockly.FieldDropdown(() => {
              return AssetsBlockProvider.getSoundDropdownOptions(codeContainer);
            }),
            'SOUND_FILE'
          );

        this.setOutput(true, 'String');
        this.setColour(230);
        this.setTooltip('Select an uploaded sound');
      },
    };

    pythonGenerator.forBlock[blockType] = (block) => {
      const fileName = block.getFieldValue('SOUND_FILE');
      const code = `h5p_sounds["${fileName}"]["path"]`;
      return [code, pythonGenerator.ORDER_ATOMIC];
    };

    this.registeredBlocks.add(blockType);
  }

  /**
   * Registers both image and sound dropdown blocks.
   * @returns {void}
   */
  registerAssetBlocks() {
    this.registerImageDropdownBlock();
    this.registerSoundDropdownBlock();
  }

  /**
   * Builds a Blockly category containing asset blocks (if assets are available).
   * Returns null if no assets are enabled.
   *
   * @returns {object|null} Category descriptor or null.
   */
  buildCategory() {
    const imageManager = this.codeContainer?.getImageManager?.();
    const soundManager = this.codeContainer?.getSoundManager?.();

    const hasImages = imageManager?.isEnabled?.() === true;
    const hasSounds = soundManager?.isEnabled?.() === true;

    if (!hasImages && !hasSounds) {
      return null;
    }

    this.registerAssetBlocks();

    const contents = [];

    if (hasImages && imageManager?.getImages?.()?.length > 0) {
      contents.push({ kind: 'block', type: 'assets_image_dropdown' });
    }

    if (hasSounds && soundManager?.getSounds?.()?.length > 0) {
      contents.push({ kind: 'block', type: 'assets_sound_dropdown' });
    }

    if (contents.length === 0) {
      return null;
    }

    return {
      kind: 'category',
      name: 'Assets',
      colour: '#FF7F50',
      contents,
    };
  }

  /**
   * Returns dropdown options for all uploaded images.
   * @param {object} codeContainer - CodeContainer instance.
   * @returns {Array<[string, string]>} Array of [displayName, value] tuples.
   */
  static getImageDropdownOptions(codeContainer) {
    const imageManager = codeContainer?.getImageManager?.();

    if (!imageManager?.isEnabled?.() === true) {
      return [['(no images uploaded)', '']];
    }

    const images = imageManager.getImages?.() || [];

    if (images.length === 0) {
      return [['(no images uploaded)', '']];
    }

    return images.map((image) => [image.name, image.name]);
  }

  /**
   * Returns dropdown options for all uploaded sounds.
   * @param {object} codeContainer - CodeContainer instance.
   * @returns {Array<[string, string]>} Array of [displayName, value] tuples.
   */
  static getSoundDropdownOptions(codeContainer) {
    const soundManager = codeContainer?.getSoundManager?.();

    if (!soundManager?.isEnabled?.() === true) {
      return [['(no sounds uploaded)', '']];
    }

    const sounds = soundManager.getSounds?.() || [];

    if (sounds.length === 0) {
      return [['(no sounds uploaded)', '']];
    }

    return sounds.map((sound) => [sound.name, sound.name]);
  }
}
