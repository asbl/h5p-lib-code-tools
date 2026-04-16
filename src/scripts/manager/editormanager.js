import CodeMirrorInstance from '../editor/codemirror/codemirror-instance.js';
import BlocklyEditorInstance from '../editor/blockly/blockly-editor-instance.js';
import { ensureBlocklyRuntime } from '../editor/blockly/blockly-runtime.js';
import { ensureCodeMirrorRuntime } from '../editor/codemirror/codemirror-runtime.js';

/**
 * Supported editor mode identifiers.
 * - 'code'   → CodeMirror (default)
 * - 'blocks' → Blockly workspace only
 * - 'both'   → Blockly workspace + read-only generated-code preview
 */
const EDITOR_MODES = ['code', 'blocks', 'both'];

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
      allowAddingFiles: workspaceOptions?.allowAddingFiles === true,
      blocklyCdnUrl: workspaceOptions?.blocklyCdnUrl || '',
      codeMirrorCdnUrl: workspaceOptions?.codeMirrorCdnUrl || '',
      sourceFiles: Array.isArray(workspaceOptions?.sourceFiles)
        ? workspaceOptions.sourceFiles
        : [],
      onOpenFileManager: typeof workspaceOptions?.onOpenFileManager === 'function'
        ? workspaceOptions.onOpenFileManager
        : () => { },
      onCloseFileManager: typeof workspaceOptions?.onCloseFileManager === 'function'
        ? workspaceOptions.onCloseFileManager
        : () => { },
    };
    this._fileManagerElement = null;
    this._isFileManagerActive = false;
    this._defaultWorkspace = this.createDefaultWorkspace();
    this._workspace = this.cloneWorkspace(this._defaultWorkspace);

    // Editor mode: 'code' | 'blocks' | 'both'
    this.editorMode = EDITOR_MODES.includes(workspaceOptions?.editorMode)
      ? workspaceOptions.editorMode
      : 'code';

    // Per-language category selection for Blockly (null = full toolbox).
    this.blocklyCategories = workspaceOptions?.blocklyCategories ?? null;

    // CodeContainer for accessing uploaded images/sounds in Blockly.
    this.codeContainer = workspaceOptions?.codeContainer ?? null;

    // Selected runtime packages for package-specific Blockly categories.
    this.blocklyPackages = Array.isArray(workspaceOptions?.blocklyPackages)
      ? workspaceOptions.blocklyPackages
      : [];
    this.blocklyCdnUrl = this.workspaceOptions.blocklyCdnUrl;
    this.codeMirrorCdnUrl = this.workspaceOptions.codeMirrorCdnUrl;
    this.codeMirrorLanguageConfig = workspaceOptions?.codeMirrorLanguageConfig || null;
    this.codeMirrorCompletionConfig = workspaceOptions?.codeMirrorCompletionConfig || null;
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

    if (this.editorMode === 'blocks' || this.editorMode === 'both') {
      await ensureBlocklyRuntime(this.blocklyCdnUrl);
    }

    if (this.editorMode !== 'blocks') {
      await ensureCodeMirrorRuntime(this.codeMirrorCdnUrl);
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
    wrapper.appendChild(editor);

    fragment.appendChild(wrapper);

    this._domFragment = fragment; // Cache setzen
    return fragment;
  }

  getFileManagerDOM() {
    if (this.workspaceOptions.allowAddingFiles !== true) {
      return null;
    }

    if (!this._fileManagerElement) {
      const fileManager = document.createElement('div');
      fileManager.className = 'editor-file-manager';
      this._fileManagerElement = fileManager;
    }

    this.renderFileManager();
    return this._fileManagerElement;
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
      this._editorInstance?.setCode(mainFile.code);
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
   * Fixes the main editor line count in fullscreen mode.
   * @param {number} lines - Fixed line count.
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
   * Focuses the active editor implementation when available.
   * @returns {void}
   */
  focus() {
    this._editorInstance?.focus?.();
  }

  /**
   * Returns the currently mounted editor implementation.
   * @returns {object|null} Active editor instance.
   */
  getActiveEditorInstance() {
    return this._editorInstance || null;
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

  setLanguageConfig(languageConfig = null) {
    this.codeMirrorLanguageConfig = languageConfig && typeof languageConfig === 'object'
      ? languageConfig
      : null;
    this._editorInstance?.setLanguageConfig?.(this.codeMirrorLanguageConfig);
  }

  setCompletionConfig(completionConfig = null) {
    this.codeMirrorCompletionConfig = completionConfig && typeof completionConfig === 'object'
      ? completionConfig
      : null;
    this._editorInstance?.setCompletionConfig?.(this.codeMirrorCompletionConfig);
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
    this.renderFileManager();

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
        visible: true,
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
    const entryFileVisible = true;
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
    const allowAddingFiles = this.workspaceOptions.allowAddingFiles === true;
    const showTabs = visibleFiles.length > 1 || allowAddingFiles;

    this._tabsElement.hidden = !showTabs;
    this._tabsElement.replaceChildren();

    visibleFiles.forEach((file) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'editor-file-tab';
      button.dataset.fileName = file.name;
      button.classList.toggle('is-active', !this._isFileManagerActive && file.name === this._workspace.activeFileName);
      button.classList.toggle('is-readonly', file.editable === false);
      button.textContent = file.name;

      if (file.editable === false) {
        button.title = `${file.name} (readonly)`;
      }

      button.addEventListener('click', () => {
        if (this._isFileManagerActive) {
          this.closeFileManager();
        }
        this.setActiveFile(file.name);
      });
      this._tabsElement.appendChild(button);
    });

    if (allowAddingFiles) {
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = 'editor-file-tab editor-file-tab-add';
      addButton.classList.toggle('is-active', this._isFileManagerActive === true);
      addButton.textContent = '+';
      addButton.title = 'Manage files';
      addButton.addEventListener('click', () => {
        if (this._isFileManagerActive) {
          this.closeFileManager();
        }
        else {
          this.openFileManager();
        }
      });
      this._tabsElement.appendChild(addButton);
    }
  }

  openFileManager() {
    this.persistActiveFileCode();
    this._isFileManagerActive = true;
    this.renderFileManager();
    this.workspaceOptions.onOpenFileManager();
    this.renderFileTabs();
  }

  closeFileManager({ skipPageChange = false } = {}) {
    this._isFileManagerActive = false;
    if (!skipPageChange) {
      this.workspaceOptions.onCloseFileManager();
    }
    this.renderFileTabs();
  }

  renderFileManager() {
    if (!this._fileManagerElement) {
      return;
    }

    this._fileManagerElement.replaceChildren();

    const header = document.createElement('div');
    header.className = 'editor-fm-header';
    const title = document.createElement('span');
    title.className = 'editor-fm-title';
    title.textContent = 'Files';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'editor-fm-close';
    closeBtn.textContent = '\u2715';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', () => this.closeFileManager());
    header.appendChild(title);
    header.appendChild(closeBtn);
    this._fileManagerElement.appendChild(header);

    const list = document.createElement('ul');
    list.className = 'editor-fm-list';

    this._workspace.files.forEach((file) => {
      const item = document.createElement('li');
      item.className = 'editor-fm-item';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'editor-fm-item-name';
      nameSpan.textContent = file.name;
      item.appendChild(nameSpan);

      if (!file.isEntry) {
        const renameBtn = document.createElement('button');
        renameBtn.type = 'button';
        renameBtn.className = 'editor-fm-btn editor-fm-rename';
        renameBtn.textContent = '\u270E';
        renameBtn.title = `Rename ${file.name}`;
        renameBtn.addEventListener('click', () => this._startFileRename(item, file.name));
        item.appendChild(renameBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'editor-fm-btn editor-fm-delete';
        deleteBtn.textContent = '\u{1F5D1}';
        deleteBtn.title = `Delete ${file.name}`;
        deleteBtn.addEventListener('click', () => this._startFileDelete(item, file.name));
        item.appendChild(deleteBtn);
      }
      else {
        const badge = document.createElement('span');
        badge.className = 'editor-fm-badge';
        badge.textContent = 'main';
        item.appendChild(badge);
      }

      list.appendChild(item);
    });

    this._fileManagerElement.appendChild(list);

    const addForm = document.createElement('div');
    addForm.className = 'editor-fm-add-form';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'editor-fm-input';
    input.placeholder = 'new_file.py';
    input.setAttribute('aria-label', 'New file name');

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'editor-fm-btn editor-fm-add';
    addBtn.textContent = '+ Add';
    addBtn.addEventListener('click', () => {
      const rawName = input.value.trim();
      if (!rawName) {
        return;
      }
      const name = this.normalizeWorkspaceFileName(rawName, this._workspace.files.length, false);
      if (this.findWorkspaceFile(name)) {
        input.classList.add('is-error');
        return;
      }
      input.classList.remove('is-error');
      this.addFileToWorkspace(name);
      input.value = '';
      this.renderFileManager();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addBtn.click();
      }
    });

    addForm.appendChild(input);
    addForm.appendChild(addBtn);
    this._fileManagerElement.appendChild(addForm);
  }

  _startFileRename(item, oldName) {
    item.replaceChildren();

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'editor-fm-input editor-fm-rename-input';
    input.value = oldName;
    input.setAttribute('aria-label', `Rename ${oldName}`);

    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button';
    confirmBtn.className = 'editor-fm-btn editor-fm-confirm';
    confirmBtn.textContent = '\u2713';
    confirmBtn.title = 'Confirm';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'editor-fm-btn editor-fm-cancel';
    cancelBtn.textContent = '\u2715';
    cancelBtn.title = 'Cancel';

    const doRename = () => {
      const rawName = input.value.trim();
      if (!rawName || rawName === oldName) {
        this.renderFileManager();
        return;
      }
      const newName = this.normalizeWorkspaceFileName(rawName, this._workspace.files.length, false);
      if (this.findWorkspaceFile(newName)) {
        input.classList.add('is-error');
        return;
      }
      this.renameWorkspaceFile(oldName, newName);
      this.renderFileManager();
    };

    confirmBtn.addEventListener('click', doRename);
    cancelBtn.addEventListener('click', () => this.renderFileManager());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        doRename();
      }
      if (e.key === 'Escape') {
        this.renderFileManager();
      }
    });

    item.appendChild(input);
    item.appendChild(confirmBtn);
    item.appendChild(cancelBtn);
    input.focus();
    input.select();
  }

  _startFileDelete(item, fileName) {
    item.replaceChildren();
    item.classList.add('is-confirming');

    const msg = document.createElement('span');
    msg.className = 'editor-fm-item-name';
    msg.textContent = `Delete \u201C${fileName}\u201D?`;

    const yesBtn = document.createElement('button');
    yesBtn.type = 'button';
    yesBtn.className = 'editor-fm-btn editor-fm-delete';
    yesBtn.textContent = 'Delete';
    yesBtn.addEventListener('click', () => {
      this.removeWorkspaceFile(fileName);
      this.renderFileManager();
    });

    const noBtn = document.createElement('button');
    noBtn.type = 'button';
    noBtn.className = 'editor-fm-btn editor-fm-cancel';
    noBtn.textContent = 'Cancel';
    noBtn.addEventListener('click', () => this.renderFileManager());

    item.appendChild(msg);
    item.appendChild(yesBtn);
    item.appendChild(noBtn);
  }

  addFileToWorkspace(name, code = '', visible = true, editable = true) {
    if (!name || this.findWorkspaceFile(name)) {
      return;
    }
    this._workspace.files.push({ name, code, visible, editable, isEntry: false });
    this.renderFileTabs();
    this.renderFileManager();
    this.onChangeCallback(this.getCode());
  }

  renameWorkspaceFile(oldName, newName) {
    const file = this.findWorkspaceFile(oldName);
    if (!file || file.isEntry || !newName || newName === oldName || this.findWorkspaceFile(newName)) {
      return;
    }
    this.persistActiveFileCode();
    file.name = newName;
    if (this._workspace.activeFileName === oldName) {
      this._workspace.activeFileName = newName;
    }
    this.renderFileTabs();
    this.renderFileManager();
    this.onChangeCallback(this.getCode());
  }

  removeWorkspaceFile(name) {
    const index = this._workspace.files.findIndex((file) => file.name === name);
    if (index === -1 || this._workspace.files[index].isEntry) {
      return;
    }

    const removedWasActive = this._workspace.activeFileName === name;
    this.persistActiveFileCode();
    this._workspace.files.splice(index, 1);

    if (removedWasActive) {
      this._workspace.activeFileName = this._workspace.entryFileName;

      if (this._editorElement) {
        this.mountEditorForActiveFile();
      }
    }

    this.renderFileTabs();
    this.renderFileManager();
    this.onChangeCallback(this.getCode());
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

    const sharedOptions = {
      preCode: activeFile.isEntry ? this.getNormalizedPreCode() : '',
      postCode: activeFile.isEntry ? this.getNormalizedPostCode() : '',
      readonly: activeFile.editable === false,
      lineHeightPx: 18,
      resizeActionHandler: this.resizeActionHandler,
      onChangeCallback: (code) => {
        activeFile.code = this.extractEditableCode(code, activeFile);
        this.onChangeCallback(this.getCode());
      },
      theme: this.theme,
      languageConfig: this.codeMirrorLanguageConfig,
      completionConfig: this.codeMirrorCompletionConfig,
    };

    if (this.editorMode === 'blocks' || this.editorMode === 'both') {
      this._editorInstance = new BlocklyEditorInstance(
        this._editorElement,
        activeFile.code,
        this.codingLanguage,
        {
          ...sharedOptions,
          editorMode: this.editorMode,
          blocklyCategories: this.blocklyCategories,
          blocklyPackages: this.blocklyPackages,
          codeContainer: this.codeContainer,
        }
      );
    }
    else {
      this._editorInstance = new CodeMirrorInstance(
        this._editorElement ?? this.editorUID,
        activeFile.code,
        this.codingLanguage,
        {
          ...sharedOptions,
          minLines: this.getLineCount(this.getFileCode(activeFile.name, {
            includeFixedCode: true,
          })),
          showLineNumbers: true,
          isConsole: false,
        }
      );
    }
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

    if (normalizedPostCode) {
      const trailingNewline = nextCode.endsWith('\n') ? '\n' : '';
      const codeWithoutTrailingNewline = trailingNewline
        ? nextCode.slice(0, -trailingNewline.length)
        : nextCode;

      if (codeWithoutTrailingNewline.endsWith(normalizedPostCode)) {
        nextCode = codeWithoutTrailingNewline.slice(0, -normalizedPostCode.length);
      }
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
