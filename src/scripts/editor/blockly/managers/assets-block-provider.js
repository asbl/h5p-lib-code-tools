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
    const codeContainer = this.codeContainer;

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
      const code = `h5p_images[${JSON.stringify(fileName)}]["path"]`;
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
    const codeContainer = this.codeContainer;

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
      const code = `h5p_sounds[${JSON.stringify(fileName)}]["path"]`;
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

    // Keep the category available before the first upload. FieldDropdown reads
    // its options lazily, so a newly uploaded asset is selectable immediately
    // without recreating the Blockly workspace.
    if (hasImages) {
      contents.push({ kind: 'block', type: 'assets_image_dropdown' });
    }

    if (hasSounds) {
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

  migrateWorkspaceState(state) {
    const imageIds = new Map((this.codeContainer?.getImageManager?.()?.getImages?.() || []).map((file) => [file.name, file.id]));
    const soundIds = new Map((this.codeContainer?.getSoundManager?.()?.getSounds?.() || []).map((file) => [file.name, file.id]));
    const visit = (block) => {
      if (!block || typeof block !== 'object') return;
      const map = block.type === 'assets_image_dropdown' ? imageIds : block.type === 'assets_sound_dropdown' ? soundIds : null;
      const key = block.type === 'assets_image_dropdown' ? 'IMAGE_FILE' : 'SOUND_FILE';
      if (map && block.fields?.[key] && map.has(block.fields[key])) block.fields[key] = map.get(block.fields[key]);
      Object.values(block.inputs || {}).forEach((input) => visit(input?.block || input?.shadow));
      visit(block.next?.block);
    };
    (state?.blocks?.blocks || []).forEach(visit);
    return state;
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

    return images.map((image) => [image.name, image.id || image.name]);
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

    return sounds.map((sound) => [sound.name, sound.id || sound.name]);
  }
}
