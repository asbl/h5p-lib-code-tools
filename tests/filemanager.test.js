import { beforeEach, describe, expect, it } from 'vitest';

import FileManager from '../src/scripts/manager/filemanager.js';

const l10n = {
  filesTitle: 'Files',
  filesDescription: 'Upload files for the current coding session.',
  filesHelp: 'Use h5p_files["name"]["url"] to access files.',
  filesUpload: 'Upload files',
  filesEmpty: 'No files uploaded yet.',
  filesFileName: 'File name',
  filesRenameAriaLabel: 'Edit file name',
  filesRemove: 'Remove',
  filesDefaultName: 'file',
};

/**
 * Creates a mock browser file for upload-manager tests.
 * @param {string} name File name.
 * @param {string} [content] Text payload.
 * @param {string} [type] MIME type.
 * @returns {{name: string, type: string, size: number, arrayBuffer: () => Promise<ArrayBuffer>}} Mock file object.
 */
function createFile(name, content = 'data', type = 'text/plain') {
  const bytes = new TextEncoder().encode(content);

  return {
    name,
    type,
    size: bytes.byteLength,
    arrayBuffer: async () => bytes.buffer.slice(0),
  };
}

describe('FileManager', () => {
  let manager;

  beforeEach(() => {
    manager = new FileManager({}, {
      enabled: true,
      l10n,
      accept: '.txt',
      extensions: ['.txt'],
      mimePrefixes: ['text/'],
      variableName: 'h5p_files',
      relativeDirectory: 'files',
      defaultExtension: '.txt',
    });

    manager.getDOM();
  });

  describe('isSupportedFile', () => {
    it('accepts files by MIME prefix', () => {
      expect(manager.isSupportedFile({ name: 'readme.txt', type: 'text/plain' })).toBe(true);
    });

    it('accepts files by extension when MIME type is missing', () => {
      expect(manager.isSupportedFile({ name: 'data.txt', type: '' })).toBe(true);
    });

    it('rejects files that do not match any filter', () => {
      expect(manager.isSupportedFile({ name: 'photo.png', type: 'image/png' })).toBe(false);
    });

    it('rejects null/undefined gracefully', () => {
      expect(manager.isSupportedFile(null)).toBe(false);
      expect(manager.isSupportedFile(undefined)).toBe(false);
    });
  });

  describe('addFiles and deduplication', () => {
    it('adds supported files and deduplicates names', async () => {
      await manager.addFiles([
        createFile('notes.txt'),
        createFile('notes.txt'),
      ]);

      expect(manager.getFiles().map((f) => f.name)).toEqual(['notes.txt', 'notes-2.txt']);
    });

    it('skips unsupported files', async () => {
      await manager.addFiles([createFile('photo.png', 'pixel', 'image/png')]);

      expect(manager.getFiles()).toHaveLength(0);
    });

    it('reflects empty input', async () => {
      await manager.addFiles([]);

      expect(manager.getFiles()).toHaveLength(0);
    });
  });

  describe('removeFile', () => {
    it('removes the file and revokes the blob URL', async () => {
      await manager.addFiles([createFile('notes.txt')]);
      const [file] = manager.getFiles();

      manager.removeFile(file.id);

      expect(manager.getFiles()).toHaveLength(0);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(file.objectUrl);
    });

    it('is a no-op when the id is unknown', () => {
      expect(() => manager.removeFile('nonexistent')).not.toThrow();
    });
  });

  describe('renameFile', () => {
    it('appends the old extension when the user omits it', async () => {
      await manager.addFiles([createFile('notes.txt')]);

      const [file] = manager.getFiles();
      manager.renameFile(file.id, 'readme');

      expect(manager.getFiles()[0].name).toBe('readme.txt');
    });

    it('resolves collision with a numeric suffix', async () => {
      await manager.addFiles([
        createFile('alpha.txt'),
        createFile('beta.txt'),
      ]);

      const [, beta] = manager.getFiles();
      manager.renameFile(beta.id, 'alpha');

      expect(manager.getFiles()[1].name).toBe('alpha-2.txt');
    });

    it('is a no-op when the new effective name is identical', async () => {
      await manager.addFiles([createFile('notes.txt')]);
      const [file] = manager.getFiles();
      const callCountBefore = URL.createObjectURL.mock.calls.length;

      manager.renameFile(file.id, 'notes.txt');

      expect(manager.getFiles()[0].name).toBe('notes.txt');
      expect(URL.createObjectURL.mock.calls.length).toBe(callCountBefore);
    });
  });

  describe('serializeFiles / replaceFiles', () => {
    it('round-trips file data through serialize and replace', async () => {
      await manager.addFiles([createFile('notes.txt', 'hello')]);
      const serialized = manager.serializeFiles();

      const other = new FileManager({}, {
        enabled: true,
        l10n,
        extensions: ['.txt'],
        mimePrefixes: ['text/'],
      });
      other.getDOM();
      other.replaceFiles(serialized);

      expect(other.getFiles()).toHaveLength(1);
      expect(other.getFiles()[0].name).toBe('notes.txt');
      expect(other.getFiles()[0].bytes).toBeInstanceOf(Uint8Array);
    });

    it('disposes existing files before replacing', async () => {
      await manager.addFiles([createFile('old.txt')]);
      const [oldFile] = manager.getFiles();

      manager.replaceFiles([]);

      expect(manager.getFiles()).toHaveLength(0);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(oldFile.objectUrl);
    });
  });

  describe('destroy', () => {
    it('revokes object URLs for all managed files and clears state', async () => {
      await manager.addFiles([
        createFile('first.txt'),
        createFile('second.txt'),
      ]);

      const objectUrls = manager.getFiles().map((file) => file.objectUrl);

      manager.destroy();

      expect(manager.getFiles()).toHaveLength(0);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(objectUrls[0]);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(objectUrls[1]);
    });
  });

  describe('getAccessHints', () => {
    it('returns registry URL/path hints and the relative path', async () => {
      await manager.addFiles([createFile('notes.txt')]);
      const [file] = manager.getFiles();
      const hints = manager.getAccessHints(file);

      expect(hints).toContain('h5p_files["notes.txt"]["url"]');
      expect(hints).toContain('h5p_files["notes.txt"]["path"]');
      expect(hints).toContain('files/notes.txt');
    });
  });

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(manager.formatFileSize(512)).toBe('512 B');
    });

    it('formats kilobytes', () => {
      expect(manager.formatFileSize(1536)).toBe('1.5 KB');
    });

    it('formats megabytes', () => {
      expect(manager.formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB');
    });

    it('returns 0 B for non-positive values', () => {
      expect(manager.formatFileSize(0)).toBe('0 B');
      expect(manager.formatFileSize(-1)).toBe('0 B');
    });
  });

  describe('disabled manager', () => {
    it('returns null from getDOM when disabled', () => {
      const disabled = new FileManager({}, { enabled: false, l10n });

      expect(disabled.getDOM()).toBeNull();
    });
  });

  describe('DOM rendering', () => {
    it('shows the empty state when no files are present', () => {
      const dom = manager.getDOM();

      expect(dom.querySelector('.file-manager__empty').hidden).toBe(false);
    });

    it('hides the empty state and renders a list item after upload', async () => {
      await manager.addFiles([createFile('notes.txt')]);
      const dom = manager.getDOM();

      expect(dom.querySelector('.file-manager__empty').hidden).toBe(true);
      expect(dom.querySelectorAll('.file-manager__item')).toHaveLength(1);
    });
  });
});
