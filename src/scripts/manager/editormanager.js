import AceEditorInstance from '../editor/aceeditor-instance';

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

    // Dom Elements
    this.editorUID = editorUID;
    this.preCodeUID = preCodeUID;
    this.postCodeUID = postCodeUID;

    // On Code-Change Callback
    this.onChangeCallback = onChangeCallback;

    this.resizeActionHandler = resizeActionHandler || (() => { });
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
    if (this.preCodeLines) {
      this._preCodeEditorInstance = new AceEditorInstance(
        this.preCodeUID,
        this.preCode,
        this.codingLanguage,
        {
          firstLine: 1,
          readonly: true,
          highlightActiveLine: false,
          resizeActionHandler: this.resizeActionHandler,
          showLineNumbers: true
        },
      );
      this._preCodeEditorInstance.createEditor({});
    }

    this._mainEditorInstance = new AceEditorInstance(
      this.editorUID,
      this.defaultCode,
      this.codingLanguage,
      {
        firstLine: this.preCodeLines + 1,
        readonly: false,
        highlightActiveLine: true,
        onChangeCallback: this.onChangeCallback,
        resizeActionHandler: this.resizeActionHandler,
        showLineNumber: true
      },
    );
    this._mainEditorInstance.createEditor();

    this._postCodeEditorInstance = new AceEditorInstance(
      this.postCodeUID,
      this.postCode,
      this.codingLanguage,
      {
        showLineNumbers: true,
        readonly: true,
        highlightActiveLine: false,
        resizeActionHandler: this.resizeActionHandler,
      },
    );
    if (this.postCodeLines) {
      this._postCodeEditorInstance.createEditor();
    }
  }

  getDOM() {
    const fragment = document.createDocumentFragment();

    const wrapper = document.createElement('div');
    wrapper.className = 'container container-code';

    const preWrapper = document.createElement('div');
    preWrapper.className = `pre_wrapper ${this.preCodeVisible}`;

    const preHeader = document.createElement('div');
    preHeader.className =
      'h5p_code_editor_pre_header code_editor_editor_pre_header';
    preHeader.textContent = 'Pre Code';
    preWrapper.appendChild(preHeader);

    const preCode = document.createElement('div');
    preCode.id = this.preCodeUID;
    preCode.className = 'h5p_code_editor_pre code_editor_pre';
    preCode.style.height = `${this.preCodeLines * 18}px`;
    preCode.style.width = '100%';
    preCode.classList.add(this.preCodeVisible);
    preWrapper.appendChild(preCode);

    const editor = document.createElement('div');
    editor.id = this.editorUID;
    editor.className = 'h5p_editor_container editor_container';
    editor.style.width = '100%';

    const postWrapper = document.createElement('div');
    postWrapper.className = `post_wrapper ${this.postCodeVisible}`;

    const postHeader = document.createElement('div');
    postHeader.className =
      'h5p_code_editor_post_header code_editor_post_header';
    postHeader.textContent = 'Post Code';
    postWrapper.appendChild(postHeader);

    const postCode = document.createElement('div');
    postCode.id = this.postCodeUID;
    postCode.className = 'h5p_code_editor_post code_editor_post';
    postCode.classList.add(this.postCodeVisible);
    postCode.style.height = `${this.postCodeLines * 18}px`;
    postCode.style.width = '100%';
    postWrapper.appendChild(postCode);

    wrapper.appendChild(preWrapper);
    wrapper.appendChild(editor);
    wrapper.appendChild(postWrapper);

    fragment.appendChild(wrapper);

    return fragment;
  }

  /**
   * Returns combined code from pre, main, and post editors
   * @returns {string} combined code from pre, main, and post editors
   */
  getCode() {
    let code = this._mainEditorInstance.getCode();
    if (this._preCodeEditorInstance)
      code = this._preCodeEditorInstance.getCode() + code;
    if (this._postCodeEditorInstance)
      code += this._postCodeEditorInstance.getCode();
    return code;
  }

  setCode(code) {
    this._mainEditorInstance.setCode(code);
  }

  /**
   * Returns the number of lines in the main code
   * @returns {number} number of lines
   */
  getCodeLines() {
    return this.defaultCode.split(/\r\n|\r|\n/).length;
  }
}
