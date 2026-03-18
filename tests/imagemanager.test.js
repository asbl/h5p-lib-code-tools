import { beforeEach, describe, expect, it, vi } from 'vitest';

import ImageManager from '../src/scripts/manager/imagemanager.js';
import SoundManager from '../src/scripts/manager/soundmanager.js';

const l10n = {
  imagesTitle: 'Uploaded images',
  imagesDescription: 'Upload images for the current coding session.',
  imagesHelp: 'Help text',
  imagesUpload: 'Upload images',
  imagesEmpty: 'No images uploaded yet.',
  imagesFileName: 'File name',
  imagesRenameAriaLabel: 'Edit uploaded image file name',
  imagesRemove: 'Remove',
  imagesDefaultName: 'image',
};

function createImageFile(name, content, type = 'image/png') {
  const bytes = new TextEncoder().encode(content);

  return {
    name,
    type,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer.slice(0),
  };
}

describe('ImageManager', () => {
  let manager;
  let resizeActionHandler;

  beforeEach(() => {
    resizeActionHandler = vi.fn();
    manager = new ImageManager({}, {
      enabled: true,
      l10n,
      resizeActionHandler,
    });

    manager.getDOM();
  });

  it('creates unique names for duplicate uploads', async () => {
    await manager.addFiles([
      createImageFile('zelda.png', 'first'),
      createImageFile('zelda.png', 'second'),
    ]);

    expect(manager.getImages().map((image) => image.name)).toEqual([
      'zelda.png',
      'zelda-2.png',
    ]);
    expect(resizeActionHandler).toHaveBeenCalled();
  });

  it('keeps the current extension when renaming without one', async () => {
    await manager.addFiles([
      createImageFile('zelda.png', 'first'),
    ]);

    const [image] = manager.getImages();
    manager.renameImage(image.id, 'link');

    expect(manager.getImages()[0].name).toBe('link.png');
    expect(manager.getDOM().textContent).toContain('images/link.png');
    expect(manager.getDOM().textContent).toContain('h5p_images["link.png"]["path"]');
  });

  it('generates unique names when a rename collides with an existing file', async () => {
    await manager.addFiles([
      createImageFile('zelda.png', 'first'),
      createImageFile('link.png', 'second'),
    ]);

    const [, image] = manager.getImages();
    manager.renameImage(image.id, 'zelda');

    expect(manager.getImages().map((entry) => entry.name)).toEqual([
      'zelda.png',
      'zelda-2.png',
    ]);
  });

  it('uses a generated fallback name for unnamed uploads', async () => {
    await manager.addFiles([
      createImageFile('', 'first'),
    ]);

    expect(manager.getImages()[0].name).toBe('image-1.png');
  });

  it('revokes the blob URL when an image is removed', async () => {
    await manager.addFiles([
      createImageFile('zelda.png', 'first'),
    ]);

    const [image] = manager.getImages();
    manager.removeImage(image.id);

    expect(manager.getImages()).toHaveLength(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(image.objectUrl);
    expect(manager.getDOM().textContent).toContain(l10n.imagesEmpty);
  });
});

describe('SoundManager', () => {
  it('accepts audio files and rejects images', async () => {
    const manager = new SoundManager({}, {
      enabled: true,
      l10n: {
        soundsTitle: 'Uploaded sounds',
        soundsDescription: 'Upload sounds',
        soundsHelp: 'Help text',
        soundsUpload: 'Upload sounds',
        soundsEmpty: 'No sounds uploaded yet.',
        soundsFileName: 'File name',
        soundsRenameAriaLabel: 'Edit uploaded sound file name',
        soundsRemove: 'Remove',
        soundsDefaultName: 'sound',
      },
      resizeActionHandler: vi.fn(),
    });

    await manager.addFiles([
      createImageFile('zelda.wav', 'first', 'audio/wav'),
      createImageFile('link.png', 'second', 'image/png'),
    ]);

    expect(manager.getSounds().map((sound) => sound.name)).toEqual(['zelda.wav']);
    expect(manager.getDOM().textContent).toContain('sounds/zelda.wav');
    expect(manager.getDOM().textContent).toContain('h5p_sounds["zelda.wav"]["path"]');
  });
});