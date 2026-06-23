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
          { id: 'image-bg', name: 'bg.png' },
          { id: 'image-player', name: 'player.png' },
        ],
      });

      provider.registerImageDropdownBlock();

      // Create and configure a mock block
      const block = {
        getFieldValue: vi.fn((field) => {
          if (field === 'IMAGE_FILE') return 'image-bg';
          return '';
        }),
      };

      const generator = {
        ORDER_ATOMIC: 123,
      };

      const [code] = pythonGenerator.forBlock.assets_image_dropdown(block, generator);
      expect(code).toBe('h5p_images["image-bg"]["path"]');
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
          { id: 'sound-beep', name: 'beep.wav' },
          { id: 'sound-music', name: 'music.mp3' },
        ],
      });

      provider.registerSoundDropdownBlock();

      const block = {
        getFieldValue: vi.fn((field) => {
          if (field === 'SOUND_FILE') return 'sound-beep';
          return '';
        }),
      };

      const generator = {
        ORDER_ATOMIC: 123,
      };

      const [code] = pythonGenerator.forBlock.assets_sound_dropdown(block, generator);
      expect(code).toBe('h5p_sounds["sound-beep"]["path"]');
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

    it('keeps asset selectors available when uploads are enabled but empty', () => {
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

      expect(category.contents.map((item) => item.type)).toEqual([
        'assets_image_dropdown',
        'assets_sound_dropdown',
      ]);
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
          { id: 'image-bg', name: 'bg.png' },
          { id: 'image-player', name: 'player.png' },
          { id: 'image-enemy', name: 'enemy.jpg' },
        ],
      });

      const options = AssetsBlockProvider.getImageDropdownOptions(mockCodeContainer);
      expect(options).toEqual([
        ['bg.png', 'image-bg'],
        ['player.png', 'image-player'],
        ['enemy.jpg', 'image-enemy'],
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
          { id: 'sound-beep', name: 'beep.wav' },
          { id: 'sound-music', name: 'music.mp3' },
          { id: 'sound-click', name: 'click.ogg' },
        ],
      });

      const options = AssetsBlockProvider.getSoundDropdownOptions(mockCodeContainer);
      expect(options).toEqual([
        ['beep.wav', 'sound-beep'],
        ['music.mp3', 'sound-music'],
        ['click.ogg', 'sound-click'],
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

  describe('migrateWorkspaceState', () => {
    it('migrates legacy image and sound file names to stable asset IDs', () => {
      mockCodeContainer.getImageManager.mockReturnValue({ getImages: () => [{ id: 'image-1', name: 'player.png' }] });
      mockCodeContainer.getSoundManager.mockReturnValue({ getSounds: () => [{ id: 'sound-1', name: 'click.wav' }] });
      provider = new AssetsBlockProvider(mockCodeContainer);
      const state = { blocks: { blocks: [{ type: 'assets_image_dropdown', fields: { IMAGE_FILE: 'player.png' }, next: { block: { type: 'assets_sound_dropdown', fields: { SOUND_FILE: 'click.wav' } } } }] } };

      provider.migrateWorkspaceState(state);

      expect(state.blocks.blocks[0].fields.IMAGE_FILE).toBe('image-1');
      expect(state.blocks.blocks[0].next.block.fields.SOUND_FILE).toBe('sound-1');
    });

    it('keeps stable IDs and missing legacy assets unchanged', () => {
      mockCodeContainer.getImageManager.mockReturnValue({ getImages: () => [{ id: 'image-1', name: 'player.png' }] });
      provider = new AssetsBlockProvider(mockCodeContainer);
      const state = { blocks: { blocks: [{ type: 'assets_image_dropdown', fields: { IMAGE_FILE: 'image-1' }, next: { block: { type: 'assets_image_dropdown', fields: { IMAGE_FILE: 'deleted.png' } } } }] } };

      provider.migrateWorkspaceState(state);

      expect(state.blocks.blocks[0].fields.IMAGE_FILE).toBe('image-1');
      expect(state.blocks.blocks[0].next.block.fields.IMAGE_FILE).toBe('deleted.png');
    });
  });
});
