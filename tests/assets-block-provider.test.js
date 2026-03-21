import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Blockly from 'blockly';
import { pythonGenerator } from 'blockly/python';

import AssetsBlockProvider from '../src/scripts/editor/blockly/managers/assets-block-provider.js';

describe('AssetsBlockProvider', () => {
  let provider;
  let mockCodeContainer;

  beforeEach(() => {
    // Clean up any previously registered blocks
    delete Blockly.Blocks.assets_image_dropdown;
    delete Blockly.Blocks.assets_sound_dropdown;
    delete pythonGenerator.forBlock.assets_image_dropdown;
    delete pythonGenerator.forBlock.assets_sound_dropdown;

    mockCodeContainer = {
      getImageManager: vi.fn(),
      getSoundManager: vi.fn(),
    };
  });

  describe('constructor', () => {
    it('creates instance with codeContainer', () => {
      provider = new AssetsBlockProvider(mockCodeContainer);
      expect(provider.codeContainer).toBe(mockCodeContainer);
      expect(provider.registeredBlocks.size).toBe(0);
    });
  });

  describe('registerImageDropdownBlock', () => {
    it('registers assets_image_dropdown block', () => {
      provider = new AssetsBlockProvider(mockCodeContainer);
      provider.registerImageDropdownBlock();

      expect(Blockly.Blocks.assets_image_dropdown).toBeDefined();
      expect(provider.registeredBlocks.has('assets_image_dropdown')).toBe(true);
    });

    it('does not re-register if already registered', () => {
      provider = new AssetsBlockProvider(mockCodeContainer);
      provider.registerImageDropdownBlock();
      const firstBlock = Blockly.Blocks.assets_image_dropdown;

      provider.registerImageDropdownBlock();
      expect(Blockly.Blocks.assets_image_dropdown).toBe(firstBlock);
    });

    it('generates correct Python code for image dropdown', () => {
      provider = new AssetsBlockProvider(mockCodeContainer);
      mockCodeContainer.getImageManager.mockReturnValue({
        isEnabled: () => true,
        getImages: () => [
          { name: 'bg.png' },
          { name: 'player.png' },
        ],
      });

      provider.registerImageDropdownBlock();

      // Create and configure a mock block
      const block = {
        getFieldValue: vi.fn((field) => {
          if (field === 'IMAGE_FILE') return 'bg.png';
          return '';
        }),
      };

      const generator = {
        ORDER_ATOMIC: 123,
      };

      const [code] = pythonGenerator.forBlock.assets_image_dropdown(block, generator);
      expect(code).toBe('h5p_images["bg.png"]["path"]');
    });
  });

  describe('registerSoundDropdownBlock', () => {
    it('registers assets_sound_dropdown block', () => {
      provider = new AssetsBlockProvider(mockCodeContainer);
      provider.registerSoundDropdownBlock();

      expect(Blockly.Blocks.assets_sound_dropdown).toBeDefined();
      expect(provider.registeredBlocks.has('assets_sound_dropdown')).toBe(true);
    });

    it('generates correct Python code for sound dropdown', () => {
      provider = new AssetsBlockProvider(mockCodeContainer);
      mockCodeContainer.getSoundManager.mockReturnValue({
        isEnabled: () => true,
        getSounds: () => [
          { name: 'beep.wav' },
          { name: 'music.mp3' },
        ],
      });

      provider.registerSoundDropdownBlock();

      const block = {
        getFieldValue: vi.fn((field) => {
          if (field === 'SOUND_FILE') return 'beep.wav';
          return '';
        }),
      };

      const generator = {
        ORDER_ATOMIC: 123,
      };

      const [code] = pythonGenerator.forBlock.assets_sound_dropdown(block, generator);
      expect(code).toBe('h5p_sounds["beep.wav"]["path"]');
    });
  });

  describe('buildCategory', () => {
    it('returns null when no assets are enabled', () => {
      mockCodeContainer.getImageManager.mockReturnValue({
        isEnabled: () => false,
      });
      mockCodeContainer.getSoundManager.mockReturnValue({
        isEnabled: () => false,
      });

      provider = new AssetsBlockProvider(mockCodeContainer);
      const category = provider.buildCategory();

      expect(category).toBeNull();
    });

    it('returns null when assets are enabled but no files are uploaded', () => {
      mockCodeContainer.getImageManager.mockReturnValue({
        isEnabled: () => true,
        getImages: () => [],
      });
      mockCodeContainer.getSoundManager.mockReturnValue({
        isEnabled: () => true,
        getSounds: () => [],
      });

      provider = new AssetsBlockProvider(mockCodeContainer);
      const category = provider.buildCategory();

      expect(category).toBeNull();
    });

    it('includes image block when images are available', () => {
      mockCodeContainer.getImageManager.mockReturnValue({
        isEnabled: () => true,
        getImages: () => [{ name: 'bg.png' }],
      });
      mockCodeContainer.getSoundManager.mockReturnValue({
        isEnabled: () => false,
      });

      provider = new AssetsBlockProvider(mockCodeContainer);
      const category = provider.buildCategory();

      expect(category).not.toBeNull();
      expect(category.name).toBe('Assets');
      expect(category.contents).toContainEqual(
        expect.objectContaining({ type: 'assets_image_dropdown' })
      );
    });

    it('includes sound block when sounds are available', () => {
      mockCodeContainer.getImageManager.mockReturnValue({
        isEnabled: () => false,
      });
      mockCodeContainer.getSoundManager.mockReturnValue({
        isEnabled: () => true,
        getSounds: () => [{ name: 'beep.wav' }],
      });

      provider = new AssetsBlockProvider(mockCodeContainer);
      const category = provider.buildCategory();

      expect(category).not.toBeNull();
      expect(category.name).toBe('Assets');
      expect(category.contents).toContainEqual(
        expect.objectContaining({ type: 'assets_sound_dropdown' })
      );
    });

    it('includes both blocks when images and sounds are available', () => {
      mockCodeContainer.getImageManager.mockReturnValue({
        isEnabled: () => true,
        getImages: () => [{ name: 'bg.png' }],
      });
      mockCodeContainer.getSoundManager.mockReturnValue({
        isEnabled: () => true,
        getSounds: () => [{ name: 'beep.wav' }],
      });

      provider = new AssetsBlockProvider(mockCodeContainer);
      const category = provider.buildCategory();

      expect(category).not.toBeNull();
      expect(category.contents.length).toBe(2);
      expect(category.contents).toContainEqual(
        expect.objectContaining({ type: 'assets_image_dropdown' })
      );
      expect(category.contents).toContainEqual(
        expect.objectContaining({ type: 'assets_sound_dropdown' })
      );
    });

    it('has correct category colour', () => {
      mockCodeContainer.getImageManager.mockReturnValue({
        isEnabled: () => true,
        getImages: () => [{ name: 'bg.png' }],
      });
      mockCodeContainer.getSoundManager.mockReturnValue({
        isEnabled: () => false,
      });

      provider = new AssetsBlockProvider(mockCodeContainer);
      const category = provider.buildCategory();

      expect(category.colour).toBe('#FF7F50');
    });
  });

  describe('getImageDropdownOptions', () => {
    it('returns placeholder when image manager is disabled', () => {
      mockCodeContainer.getImageManager.mockReturnValue({
        isEnabled: () => false,
      });

      const options = AssetsBlockProvider.getImageDropdownOptions(mockCodeContainer);
      expect(options).toEqual([['(no images uploaded)', '']]);
    });

    it('returns placeholder when no images are available', () => {
      mockCodeContainer.getImageManager.mockReturnValue({
        isEnabled: () => true,
        getImages: () => [],
      });

      const options = AssetsBlockProvider.getImageDropdownOptions(mockCodeContainer);
      expect(options).toEqual([['(no images uploaded)', '']]);
    });

    it('returns list of uploaded image names', () => {
      mockCodeContainer.getImageManager.mockReturnValue({
        isEnabled: () => true,
        getImages: () => [
          { name: 'bg.png' },
          { name: 'player.png' },
          { name: 'enemy.jpg' },
        ],
      });

      const options = AssetsBlockProvider.getImageDropdownOptions(mockCodeContainer);
      expect(options).toEqual([
        ['bg.png', 'bg.png'],
        ['player.png', 'player.png'],
        ['enemy.jpg', 'enemy.jpg'],
      ]);
    });
  });

  describe('getSoundDropdownOptions', () => {
    it('returns placeholder when sound manager is disabled', () => {
      mockCodeContainer.getSoundManager.mockReturnValue({
        isEnabled: () => false,
      });

      const options = AssetsBlockProvider.getSoundDropdownOptions(mockCodeContainer);
      expect(options).toEqual([['(no sounds uploaded)', '']]);
    });

    it('returns placeholder when no sounds are available', () => {
      mockCodeContainer.getSoundManager.mockReturnValue({
        isEnabled: () => true,
        getSounds: () => [],
      });

      const options = AssetsBlockProvider.getSoundDropdownOptions(mockCodeContainer);
      expect(options).toEqual([['(no sounds uploaded)', '']]);
    });

    it('returns list of uploaded sound names', () => {
      mockCodeContainer.getSoundManager.mockReturnValue({
        isEnabled: () => true,
        getSounds: () => [
          { name: 'beep.wav' },
          { name: 'music.mp3' },
          { name: 'click.ogg' },
        ],
      });

      const options = AssetsBlockProvider.getSoundDropdownOptions(mockCodeContainer);
      expect(options).toEqual([
        ['beep.wav', 'beep.wav'],
        ['music.mp3', 'music.mp3'],
        ['click.ogg', 'click.ogg'],
      ]);
    });
  });

  describe('registerAssetBlocks', () => {
    it('registers both image and sound blocks', () => {
      provider = new AssetsBlockProvider(mockCodeContainer);
      provider.registerAssetBlocks();

      expect(Blockly.Blocks.assets_image_dropdown).toBeDefined();
      expect(Blockly.Blocks.assets_sound_dropdown).toBeDefined();
      expect(provider.registeredBlocks.size).toBe(2);
    });

    it('can be called multiple times safely', () => {
      provider = new AssetsBlockProvider(mockCodeContainer);
      provider.registerAssetBlocks();
      const imageBlock = Blockly.Blocks.assets_image_dropdown;

      provider.registerAssetBlocks();
      expect(Blockly.Blocks.assets_image_dropdown).toBe(imageBlock);
    });
  });
});
