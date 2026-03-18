import CodeMirrorInstance from '../editor/codemirror-instance';

export default class EditorManager {
  constructor(
    code,
    codingLanguage,
    preCode,
    postCode,
    fixedSize,
    lines,
    editorUID,
    preCodeUID,
    postCodeUID,
    onChangeCallback = () => { },
    resizeActionHandler = () => { },
    theme = 'light',
    workspaceOptions = {},
  ) {
    this.showLineNumbers = true;
    this.codingLanguage = codingLanguage;
    // Code storage
    this.defaultCode = code ? this.getDecodedCode(code) : '';
    this.preCode = preCode ? this.getDecodedCode(preCode) : '';
    this.postCode = postCode ? this.getDecodedCode(postCode) : '';
    this.hasPreCode = this.preCode != null && this.preCode.trim().length > 0;
    if (this.preCode) {
      this.preCode = this.preCode.trimEnd();
    }
    this.preCodeLines = this.hasPreCode
      ? this.preCode.split(/\r\n|\r|\n/).length
      : 0;
    this.preCodeVisible = this.hasPreCode
      ? 'pre-code-visible'
      : 'pre-code-hidden';

    if (this.postCode)
      this.postCode = this.postCode.trimEnd();
    this.hasPostCode = this.postCode != null && this.postCode.trim().length > 0;
    this.postCodeLines = this.hasPostCode
      ? this.postCode.split(/\r\n|\r|\n/).length
      : 0;
    this.postCodeVisible = this.hasPostCode
      ? 'post-code-visible'
      : 'post-code-hidden';
    // Preload code content from options
    this.lines = this.getCodeLines() + 1;
    // Editor instances
    this._mainEditorInstance = null;
    this._preCodeEditorInstance = null;
    this._postCodeEditorInstance = null;
    this._editorInstance = null;

    // Dom Elements
    this.editorUID = editorUID;
    this.preCodeUID = preCodeUID;
    this.postCodeUID = postCodeUID;
    this._editorElement = null;
    this._tabsElement = null;
    this._wrapperElement = null;

    // On Code-Change Callback
    this.onChangeCallback = onChangeCallback;

    this.resizeActionHandler = resizeActionHandler || (() => { });
    this.theme = theme === 'dark' ? 'dark' : 'light';
    this.workspaceOptions = {
      enabled: workspaceOptions?.enabled === true,
      entryFileName: workspaceOptions?.entryFileName || 'main.py',
      entryFileVisible: workspaceOptions?.entryFileVisible !== false,
      sourceFiles: Array.isArray(workspaceOptions?.sourceFiles)
        ? workspaceOptions.sourceFiles
        : [],
    };
    this._defaultWorkspace = this.createDefaultWorkspace();
    this._workspace = this.cloneWorkspace(this._defaultWorkspace);
  }

  /**
   * Decodes HTML entities to real characters
   * @param {string} code A safe-string where special chars are encoded.
   * @returns {string} A string without special chars
   */
  getDecodedCode(code) {
    if (!code) return '';
    return code
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, '\'')
      .replace(/&#039;/g, '\'')
      .replace(/&amp;/g, '&');
  }

  /**
   * Sets up pre, main, and post editors
   */
  async setupEditors() {
    if (this._editorInstance) {
      return;
    }

    this.renderFileTabs();
    this.mountEditorForActiveFile();
  }

  getDOM() {
    if (this._domFragment) return this._domFragment;

    const fragment = document.createDocumentFragment();

    const wrapper = document.createElement('div');
    wrapper.className = 'container container-code';
  this._wrapperElement = wrapper;

  const tabs = document.createElement('div');
  tabs.className = 'editor-file-tabs';
  tabs.hidden = true;
  this._tabsElement = tabs;
  wrapper.appendChild(tabs);

    // Main Editor
    const editor = document.createElement('div');
    editor.id = this.editorUID;
    editor.className = 'h5p_editor_container editor_container';
    editor.style.width = '100%';
    this._editorElement = editor;

    // Append alles
    wrapper.appendChild(editor);

    fragment.appendChild(wrapper);

    this._domFragment = fragment; // Cache setzen
    return fragment;
  }

  /**
   * Returns combined code from pre, main, and post editors
   * @returns {string} combined code from pre, main, and post editors
   */
  getCode() {
    this.persistActiveFileCode();
    return this.getFileCode(this.workspaceOptions.entryFileName, {
      includeFixedCode: true,
    });
  }

  setCode(code) {
    const mainFile = this.findWorkspaceFile(this.workspaceOptions.entryFileName);

    if (!mainFile) {
      return;
    }

    mainFile.code = this.extractEditableCode(code, mainFile);

    if (this.getActiveFile()?.name === mainFile.name) {
      this._editorInstance?.setCode(this.getFileCode(mainFile.name, {
        includeFixedCode: true,
      }));
    }
  }

  /**
   * Returns the number of lines in the main code
   * @returns {number} number of lines
   */
  getCodeLines() {
    if (!this._workspace) {
      return this.getLineCount(this.defaultCode);
    }

    return this.getLineCount(this.getFileCode(this.getActiveFile()?.name, {
      includeFixedCode: true,
    }));
  }

  /**
 * Fix the main editor lines (fullscreen)
 * @param {number} lines
 */
  setFullscreenLines(lines) {
    this._editorInstance?.setFixedLines(lines);
  }

  /**
   * Restore dynamic height after leaving fullscreen
   */
  restoreDynamicHeight() {
    this._editorInstance?.restoreDynamicHeight();
  }

  /**
   * Persists the active code and disposes the mounted editor instance.
   * @returns {void}
   */
  destroy() {
    this.persistActiveFileCode();
    this._editorInstance?.destroy?.();
    this._editorInstance = null;

    if (this._editorElement) {
      this._editorElement.innerHTML = '';
    }
  }

  /**
   * Applies a new editor theme.
   * @param {string} theme Theme variant.
   */
  setTheme(theme) {
    this.theme = theme === 'dark' ? 'dark' : 'light';
    this._editorInstance?.setTheme(this.theme);
  }

  getWorkspaceSnapshot() {
    this.persistActiveFileCode();
    return this.cloneWorkspace(this._workspace);
  }

  getDefaultWorkspaceSnapshot() {
    return this.cloneWorkspace(this._defaultWorkspace);
  }

  setWorkspaceSnapshot(workspace = {}) {
    this._workspace = this.createWorkspaceFromSnapshot(workspace, this._defaultWorkspace);
    this.renderFileTabs();

    if (this._editorElement) {
      this.mountEditorForActiveFile();
    }
  }

  hasAdditionalSourceFiles() {
    return this.getWorkspaceFiles().some((file) => !file.isEntry);
  }

  getWorkspaceFiles() {
    return this.getWorkspaceSnapshot().files;
  }

  createDefaultWorkspace() {
    const files = [
      {
        name: this.workspaceOptions.entryFileName,
        code: this.defaultCode,
        visible: this.workspaceOptions.entryFileVisible !== false,
        editable: true,
        isEntry: true,
      },
      ...this.workspaceOptions.sourceFiles.map((file) => ({
        name: file.name,
        code: this.getDecodedCode(file.code || ''),
        visible: file.visible !== false,
        editable: file.editable !== false,
        isEntry: false,
      })),
    ];

    return this.createWorkspaceFromSnapshot({
      entryFileName: this.workspaceOptions.entryFileName,
      activeFileName: this.workspaceOptions.entryFileName,
      files,
    });
  }

  createWorkspaceFromSnapshot(workspace = {}, fallbackWorkspace = null) {
    const fallback = fallbackWorkspace ? this.cloneWorkspace(fallbackWorkspace) : null;
    const entryFileName = workspace?.entryFileName || fallback?.entryFileName || this.workspaceOptions.entryFileName;
    const entryFileVisible = this.workspaceOptions.entryFileVisible !== false;
    const rawFiles = Array.isArray(workspace?.files)
      ? workspace.files
      : fallback?.files || [];
    const files = [];
    const usedNames = new Set();

    const pushFile = (file, index) => {
      const name = this.createUniqueWorkspaceFileName(file?.name, usedNames, index, file?.isEntry === true);
      const existingFallback = fallback?.files?.find((candidate) => candidate.name === name);
      const isEntry = file?.isEntry === true;
      const hasExplicitVisibility = typeof file?.visible === 'boolean';
      const hasFallbackVisibility = typeof existingFallback?.visible === 'boolean';
      const hasExplicitEditable = typeof file?.editable === 'boolean';
      const hasFallbackEditable = typeof existingFallback?.editable === 'boolean';
      const normalizedFile = {
        name,
        code: this.getDecodedCode(
          typeof file?.code === 'string'
            ? file.code
            : existingFallback?.code || ''
        ),
        visible: hasExplicitVisibility
          ? file.visible
          : hasFallbackVisibility
            ? existingFallback.visible
            : (isEntry ? entryFileVisible : true),
        editable: hasExplicitEditable
          ? file.editable
          : hasFallbackEditable
            ? existingFallback.editable
            : true,
        isEntry,
      };

      if (normalizedFile.isEntry) {
        normalizedFile.editable = true;
      }

      files.push(normalizedFile);
    };

    rawFiles.forEach((file, index) => pushFile(file, index));

    if (!files.some((file) => file.isEntry)) {
      const fallbackEntry = fallback?.files?.find((file) => file.isEntry) || null;
      pushFile({
        name: entryFileName,
        code: workspace?.entryCode || fallbackEntry?.code || this.defaultCode,
        visible: entryFileVisible,
        editable: true,
        isEntry: true,
      }, files.length);
    }

    files.forEach((file) => {
      if (file.name === entryFileName) {
        file.isEntry = true;
        file.editable = true;
      }
    });

    const activeFileName = this.normalizeActiveFileName(
      workspace?.activeFileName || fallback?.activeFileName,
      files,
      entryFileName,
    );

    return {
      entryFileName,
      activeFileName,
      files,
    };
  }

  cloneWorkspace(workspace = {}) {
    return {
      entryFileName: workspace.entryFileName || this.workspaceOptions.entryFileName,
      activeFileName: workspace.activeFileName || workspace.entryFileName || this.workspaceOptions.entryFileName,
      files: Array.isArray(workspace.files)
        ? workspace.files.map((file) => ({ ...file }))
        : [],
    };
  }

  normalizeActiveFileName(activeFileName, files, entryFileName) {
    const activeVisibleFile = files.find((file) => file.name === activeFileName && file.visible !== false);

    if (activeVisibleFile) {
      return activeVisibleFile.name;
    }

    return files.find((file) => file.visible !== false)?.name
      || files.find((file) => file.name === entryFileName)?.name
      || files[0]?.name
      || entryFileName;
  }

  createUniqueWorkspaceFileName(name, usedNames, index, isEntry = false) {
    const normalizedName = this.normalizeWorkspaceFileName(name, index, isEntry);

    if (!usedNames.has(normalizedName)) {
      usedNames.add(normalizedName);
      return normalizedName;
    }

    const extension = this.getWorkspaceFileExtension(normalizedName);
    const baseName = extension !== ''
      ? normalizedName.slice(0, -extension.length)
      : normalizedName;

    let suffix = 2;
    let candidate = `${baseName}_${suffix}${extension}`;

    while (usedNames.has(candidate)) {
      suffix += 1;
      candidate = `${baseName}_${suffix}${extension}`;
    }

    usedNames.add(candidate);
    return candidate;
  }

  normalizeWorkspaceFileName(name, index, isEntry = false) {
    if (isEntry) {
      return this.workspaceOptions.entryFileName;
    }

    const fallbackBaseName = `module_${index + 1}`;
    const lastSegment = String(name || '')
      .split(/[\\/]/)
      .pop()
      ?.trim() || '';
    const baseName = lastSegment.replace(/\.py$/i, '');
    const normalizedBaseName = baseName
      .replace(/[^A-Za-z0-9_]/g, '_')
      .replace(/^([^A-Za-z_]+)/, '')
      .replace(/_+/g, '_')
      .replace(/^$/, fallbackBaseName)
      .replace(/^main$/, fallbackBaseName);

    return `${normalizedBaseName}.py`;
  }

  getWorkspaceFileExtension(name = '') {
    const lastDotIndex = String(name).lastIndexOf('.');

    if (lastDotIndex <= 0) {
      return '';
    }

    return name.slice(lastDotIndex);
  }

  getVisibleFiles() {
    return this._workspace.files.filter((file) => file.visible !== false);
  }

  renderFileTabs() {
    if (!this._tabsElement) {
      return;
    }

    const visibleFiles = this.getVisibleFiles();
    this._tabsElement.hidden = visibleFiles.length <= 1;
    this._tabsElement.replaceChildren();

    visibleFiles.forEach((file) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'editor-file-tab';
      button.dataset.fileName = file.name;
      button.classList.toggle('is-active', file.name === this._workspace.activeFileName);
      button.classList.toggle('is-readonly', file.editable === false);
      button.textContent = file.name;

      if (file.editable === false) {
        button.title = `${file.name} (readonly)`;
      }

      button.addEventListener('click', () => this.setActiveFile(file.name));
      this._tabsElement.appendChild(button);
    });
  }

  setActiveFile(fileName) {
    if (fileName === this._workspace.activeFileName) {
      return;
    }

    const nextFile = this.findWorkspaceFile(fileName);

    if (!nextFile || nextFile.visible === false) {
      return;
    }

    this.persistActiveFileCode();
    this._workspace.activeFileName = nextFile.name;
    this.renderFileTabs();
    this.mountEditorForActiveFile();
  }

  mountEditorForActiveFile() {
    const activeFile = this.getActiveFile();

    if (!activeFile || !this._editorElement) {
      return;
    }

    this._editorInstance?.destroy?.();
    this._editorElement.innerHTML = '';
    this._editorInstance = new CodeMirrorInstance(
      this._editorElement ?? this.editorUID,
      activeFile.code,
      this.codingLanguage,
      {
        preCode: activeFile.isEntry ? this.getNormalizedPreCode() : '',
        postCode: activeFile.isEntry ? this.getNormalizedPostCode() : '',
        readonly: activeFile.editable === false,
        lineHeightPx: 18,
        minLines: this.getLineCount(this.getFileCode(activeFile.name, {
          includeFixedCode: true,
        })),
        showLineNumbers: true,
        resizeActionHandler: this.resizeActionHandler,
        onChangeCallback: (code) => {
          activeFile.code = this.extractEditableCode(code, activeFile);
          this.onChangeCallback(this.getCode());
        },
        theme: this.theme,
        isConsole: false,
      }
    );
  }

  persistActiveFileCode() {
    const activeFile = this.getActiveFile();

    if (!activeFile || !this._editorInstance?.getCode) {
      return;
    }

    activeFile.code = this.extractEditableCode(this._editorInstance.getCode(), activeFile);
  }

  getActiveFile() {
    if (!this._workspace) {
      return null;
    }

    return this.findWorkspaceFile(this._workspace.activeFileName)
      || this.findWorkspaceFile(this._workspace.entryFileName)
      || this._workspace.files[0]
      || null;
  }

  findWorkspaceFile(fileName) {
    return this._workspace.files.find((file) => file.name === fileName);
  }

  getFileCode(fileName, { includeFixedCode = false } = {}) {
    const file = this.findWorkspaceFile(fileName)
      || this.findWorkspaceFile(this.workspaceOptions.entryFileName);

    if (!file) {
      return '';
    }

    if (!includeFixedCode || !file.isEntry) {
      return file.code;
    }

    return `${this.getNormalizedPreCode()}${file.code}${this.getNormalizedPostCode()}`;
  }

  extractEditableCode(code, file) {
    let nextCode = String(code || '');

    if (!file?.isEntry) {
      return nextCode;
    }

    const normalizedPreCode = this.getNormalizedPreCode();
    const normalizedPostCode = this.getNormalizedPostCode();

    if (normalizedPreCode && nextCode.startsWith(normalizedPreCode)) {
      nextCode = nextCode.slice(normalizedPreCode.length);
    }

    if (normalizedPostCode && nextCode.endsWith(normalizedPostCode)) {
      nextCode = nextCode.slice(0, -normalizedPostCode.length);
    }

    return nextCode;
  }

  getNormalizedPreCode() {
    if (!this.preCode) {
      return '';
    }

    return this.preCode.endsWith('\n')
      ? this.preCode
      : `${this.preCode}\n`;
  }

  getNormalizedPostCode() {
    if (!this.postCode) {
      return '';
    }

    return this.postCode.startsWith('\n')
      ? this.postCode
      : `\n${this.postCode}`;
  }

  getLineCount(code = '') {
    const normalizedCode = String(code || '');
    return Math.max(1, normalizedCode.split(/\r\n|\r|\n/).length);
  }
}
