import FileManager from './filemanager';

/**
 * Manages runtime sound uploads for a code container.
 */
export default class SoundManager extends FileManager {
  /**
   * Returns the shared variable name used by runtimes for the sound registry.
   * @returns {string} Python-accessible registry variable name.
   */
  static get variableName() {
    return 'h5p_sounds';
  }

  /**
   * Builds the relative file path used inside the runtime file system.
   * @param {string} [fileName] - Visible file name.
   * @returns {string} Runtime access path relative to the working directory.
   */
  static getRelativeAccessPath(fileName = '') {
    return `sounds/${fileName}`;
  }

  /**
   * @param {object} codeContainer - Owning code container instance.
   * @param {object} [options] - Manager options.
   */
  constructor(codeContainer, options = {}) {
    super(codeContainer, {
      ...options,
      className: 'sound-manager',
      accept: 'audio/*,.mid,.midi',
      mimePrefixes: ['audio/'],
      extensions: ['.wav', '.mp3', '.ogg', '.oga', '.m4a', '.aac', '.flac', '.mid', '.midi', '.weba'],
      variableName: SoundManager.variableName,
      relativeDirectory: 'sounds',
      defaultExtension: '.wav',
      l10nKeys: {
        title: 'soundsTitle',
        description: 'soundsDescription',
        help: 'soundsHelp',
        upload: 'soundsUpload',
        empty: 'soundsEmpty',
        fileName: 'soundsFileName',
        renameAriaLabel: 'soundsRenameAriaLabel',
        remove: 'soundsRemove',
        defaultName: 'soundsDefaultName',
      },
    });
  }

  /**
   * Returns the uploaded sounds in their current order.
   * @returns {object[]} Uploaded sound entries.
   */
  getSounds() {
    return this.getFiles();
  }

  /**
   * Creates an audio preview player for the uploaded sound.
   * @param {object} sound - Uploaded sound entry.
   * @returns {HTMLDivElement} Preview wrapper containing an audio element.
   */
  createPreview(sound) {
    const wrapper = document.createElement('div');
    wrapper.classList.add('sound-manager__preview');

    const audio = document.createElement('audio');
    audio.classList.add('sound-manager__audio');
    audio.controls = true;
    audio.preload = 'metadata';
    audio.src = sound.objectUrl;
    audio.addEventListener('loadedmetadata', () => this.resizeActionHandler(), { once: true });
    wrapper.appendChild(audio);

    return wrapper;
  }

  /**
   * Renames an uploaded sound.
   * @param {string} soundId - Internal sound identifier.
   * @param {string} nextName - User-provided replacement name.
   * @returns {void}
   */
  renameSound(soundId, nextName) {
    this.renameFile(soundId, nextName);
  }

  /**
   * Finds an uploaded sound by its internal identifier.
   * @param {string} soundId - Internal sound identifier.
   * @returns {object|undefined} Matching sound or undefined.
   */
  findSound(soundId) {
    return this.findFile(soundId);
  }

  /**
   * Removes an uploaded sound.
   * @param {string} soundId - Internal sound identifier.
   * @returns {void}
   */
  removeSound(soundId) {
    this.removeFile(soundId);
  }
}