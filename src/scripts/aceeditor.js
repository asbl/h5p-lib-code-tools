import ace from 'ace-builds';
import Util from './services/util';

import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/mode-python';
import 'ace-builds/src-noconflict/mode-markdown';
import 'ace-builds/src-noconflict/mode-sql';
import 'ace-builds/src-noconflict/theme-monokai';

/**
 * Draws ace-editor Widget on a div
 */
export default class AceEditor {

  constructor(parent, options) {
    // constructor
    this.l10n = options.l10n ? options.l10n : {};
    this.initialized = false; 
    this._containerDiv = undefined;
    this.parent = parent; // contains parent div 
    this.question = (options.question !== undefined) ? options.question : null;
    this.buttons = this.getButtons();
    this.pages = this.getPages(); 
    this.manualSetup = (options.manualSetup !== undefined) ? options.manualSetup : false;
    this.hasButtons = (options.hasButtons !== undefined) ? options.hasButtons : true;
    this.hasConsole = (options.hasConsole !== undefined) ? options.hasConsole : true;
    this.consoleType = (options.consoleType !== undefined) ? options.consoleType : 'textarea';
    this.fixedSize = (options.fixedSize !== undefined) ? options.fixedSize : true;
    this.evalation = (options.evaluation !== undefined) ? options.fixedSize : true;
    this.consoleHidden = options.consoleHidden ? options.consoleHidden : false;
    this.height = (options.height !== undefined) ? options.height : null;
    this.defaultCode = null;
    this.preCode = null;
    this.postCode = null;
    this.preCodeLines = 1; // number of lines displayed
    this.preCodeVisible = true;
    this.postCode = 1; // number of lines displayed
    this.postCodeVisible = true;
    this.preloadCode(options.code, options.preCode, options.postCode);
    this.lines = (this.fixedSize === true) ? options.lines : this.getCodeLines() + 1; // after preload code
    this.showLineNumbers = true;
    // DOM UIDs (needed if multiple editors are on one page.)
    this.containerUID = `h5p_ace_container_${H5P.createUUID()}`;
    this.editorUID = `h5p_ace_editor_${H5P.createUUID()}`;
    this.consoleUID = `h5p_console_${H5P.createUUID()}`;
    this.preCodeUID = `h5p_pre_code_${H5P.createUUID()}`;
    this.postCodeUID = `h5p_post_code_${H5P.createUUID()}`;
    this.parent.classList.add('h5p-ace-editor');
    this.parent.id = H5P.createUUID();
    this.Range = ace.require('ace/range').Range;
    this._editor = null; // set in this.setup()
    this.isCodingAssignment = options.isAssignment && (this.question.gradingMethod != null || this.question.gradingMethod === 'none');
    this.parent.innerHTML = this.registerDOM();
    if (!this.manualSetup) {
      Util.setupOnDocumentReady(() => this.setup()); 
    }
    
  } // end of constructor

  preloadCode(code, preCode, postCode) {
    // Code
    this.defaultCode = (code !== undefined) ? this.getDecodedCode(code) : ''; // set in setup()
    this.preCode = (preCode !== undefined && preCode != null) ? this.getDecodedCode(preCode) : null;
    if (this.preCode && !this.preCode.endsWith('\n')) {
      this.preCode += '\n';
    }
    this.preCodeLines = (this.preCode) ? this.preCode.split(/\r\n|\r|\n/).length - 1 : 0;
    this.preCodeVisible = (this.preCode) ? 'pre-code-visible' : 'pre-code-hidden';
    this.postCode = (postCode) ? this.getDecodedCode(postCode) : null;
    if (this.postCode && !this.postCode.endsWith('\n')) {
      this.postCode = this.postCode.trim(); 
    }
    this.postCodeLines = (this.postCode) ? this.postCode.split(/\r\n|\r|\n/).length : 0;
    this.postCodeVisible = (this.postCode) ? 'post-code-visible' : 'post-code-hidden';
  }

  getCodeLines() {
    return this.defaultCode.split(/\r\n|\r|\n/).length;
  }
  getPages() {
    return [{ name: 'code' }];
  }
  getButtons() {
    return [{
      identifier: 'runButton',
      name: 'run',
      label: this.l10n.run,
      class: 'run_code',
    },
    {
      identifier: 'showCodeButton',
      name: 'show_code',
      label: this.l10n.showCode,
      class: 'show_code',
      page: 'code',
    }];
  }

  _getButtonsHTML() {
    let html = '';
    this.buttons.forEach((element) => {
      let additionalClass = (element.additionalClass !== undefined) ? element.additionalClass : '';
      html += `<button class="${element.identifier} ${element.class} button button-${element.class} ${additionalClass}" id="${element.identifier}"  type="button">${element.label}</button>`;
    });
    return html;
  }

  async setupObservers() {
    let showCodeButton = this.getButton('showCodeButton');
    showCodeButton.style.display = 'none';
    /* Show/Hide run and showCode-Button
     */
    let buttonsObserver = new MutationObserver((_mutationList, _observer) => {
      let runButton = this.getButton('runButton');
      let showCodeButton = this.getButton('showCodeButton');
      
      if (runButton && showCodeButton) {
        if (this.getPage('code').style.display === 'none') {
          showCodeButton.style.display = 'block';
          runButton.style.display = 'none';
        }
        else {
          showCodeButton.style.display = 'none';
          runButton.style.display = 'block';
        }
      }
    });
    buttonsObserver.observe(this.getPage('code'), { attributes: true, attributeFilter: ['style'] });
  }

  async setupPages() {
    if (this.instructions) {
      this.addPage('instructions', this.instructions, 'instructions', true);
      this.buttons.push({
        identifier: 'instructions',
        label: this.l10n.instructions,
        name: 'instructions',
        class: 'instructions',
        page: 'instructions',
      });
    }
  }

  setupEditorInstance(options) {
    const editor = ace.edit(options.uid);
    editor.setTheme('ace/theme/monokai');
    if (this.fixedSize) {
      editor.setOptions({
        readOnly: options.readonly,
        highlightActiveLine: false,
        highlightGutterLine: false,
        minLines: options.lines,
        maxLines: options.lines,
        tabSize: 4,
        useSoftTabs: true,
        showGutter: this.showLineNumbers
      });
    }
    else {
      editor.setOptions({
        readOnly: options.readonly,
        highlightActiveLine: false,
        highlightGutterLine: false,
        minLines: this.lines,
        maxLines: this.lines,
        tabSize: 4,
        useSoftTabs: true,
        showGutter: this.showLineNumbers
      });
    }
    
    editor.textInput.getElement().tabIndex = -1;
    if (options.readonly) {
      editor.textInput.getElement().disabled = true;
    }
    editor.setOption('showLineNumbers', this.showLineNumbers);
    editor.setFontSize('18px');
    editor.session.setMode(this.getMode());
    if (options.content) {
      editor.session.setValue(options.content, -1);
    }
    editor.clearSelection();
    if (options.firstLineNumber) {
      editor.setOption('firstLineNumber', this.preCodeLines + 1);
    }
    return editor;
  }

  async setupEditors() {
    if (this.preCodeLines) {
      this._pre = this.setupEditorInstance({
        uid: this.preCodeUID, 
        readonly: true, 
        lines: this.preCodeLines,
        content: this.preCode
      });
    }
    this._editor = this.setupEditorInstance({
      uid: this.editorUID, 
      readonly: false, 
      lines: this.height,
      firstLineNumber: this.preCodeLines + 1,
      content: this.defaultCode
    });
    if (this.postCodeLines) {
      this._post = this.setupEditorInstance({
        uid: this.postCodeUID, 
        readonly: true, 
        lines: this.postCodeLines,
        content: this.postCode
      });
    }
    this.getContainer().getElementsByClassName('page-code')[0].offsetHeight;
    // needed for Widget.
    this._editor.getSession().on('change', () => {
      this.onChange(this);
    });
    this.registerKeys();
  }

  registerKeys() {
    // Bind keys to editor
    this._editor.commands.addCommand({
      name: 'RUN Shortcut',
      exec: () => {
        this.run();
      },
      bindKey: { mac: 'CMD-ENTER', win: 'CTRL-ENTER' }
    });
  }

  onChange() {

  }
  getContainer() {
    if (this._containerDiv === undefined) {
      this._containerDiv = document.getElementById(this.containerUID);
    }
    return this._containerDiv;
  }

  /**
   * Registers aceEditor to parent div.
   * 
   * Must be called AFTER Dom is attached to container.
   */
  async setup() {
    /* Setup pages and buttons */
    await this.setupEditors();
    await this.setupPages();
    await this.setupButtons();
    await this.setupObservers();
    await this.showPage('code'); // Show code page; Hide other pages
    this.initialized = true;
  }

  /**
   * Displays a page; Hide other pages
   * @param  {string} pageName The name of the page (e.g. "code", "canvas", ...)
   */
  async showPage(pageName) {
    let container = this.getContainer();
    let page = null; //set in loop
    this.pages.forEach((element) => {
      page = container.getElementsByClassName('page-' + element.name)[0];
      if (page !== undefined) {
        // hide other pages
        if (element.name !== pageName) {
          page.style.display = 'none';
        }
        else {
          // show page
          page.style.display = 'block';
          page.style.height = this.pageHeight + 'px';
        }
      }
      if (this.question) {
        this.question.trigger('resize');
      }
    });
  }

  showButton(buttonName) {
    const button = this.getButton(buttonName);
    if (button) {
      button.style.visibility = 'visible';
    }
  }

  hideButton(buttonName) {
    const button = this.getButton(buttonName);
    if (button) {
      button.style.visibility = 'visible';
    }
  }

  getDecodedCode(code) {
    if (code) {
      code = code.replace(/&lt;/g, '<');
      code = code.replace(/&gt;/g, '>');
      code = code.replace(/&quot;/g, '"');
      code = code.replace(/&#39;/g, '\'');
      code = code.replace(/&#039;/g, '\'');
      code = code.replace(/&amp;/g, '&');
      return code;
    }
    return '';
  }

  reset() {
    this.clearConsole();
  }

  getDOM() {
    return this.parent;
  }

  /**
   * Gets code from editor
   * @returns {string} program code in ace-editor
   */
  getCode() {
    let returnHtml = '';
    let code = (this._editor.getValue() !== undefined) ? this._editor.getValue() : '';
    if (this.postCode !== '' && !code.endsWith('\n')) {
      code += '\n';
    }
    if (this._editor !== undefined) {
      if (this._pre !== undefined) {
        returnHtml += this._pre.getValue();
      }

      returnHtml += code;

      if (this._post !== undefined) {
        returnHtml += this._post.getValue();
      }

    }
    return returnHtml;
  }

  /**
   * Clears the console
   */
  clearConsole() {
    document.getElementById(this.consoleUID).value = '';
  }

  async setupButtons() {
    const container = this.getContainer();
    const navbar = container.getElementsByClassName('navbar')[0];
    const html =  this._getButtonsHTML();
    navbar.innerHTML = html;
    this.addButtonListeners();
  }

  _addListenerForButton(button, listener, event) {
    if (button && !button.isInitialized) {
      button.isInitialized = true;
      button.addEventListener(event, listener);
    }
  }

  run() {
    const runtime = this.question.factory.createManualRuntime(this);
    runtime.run();
  }

  /**
   * Add Listener for Run-Button
   * @private
   */
  _addRunListener() {
    const listener = () => {
      this.showPage('code');
      this.run();
    };
    const runButton = this.getButton('runButton');
    this._addListenerForButton(runButton, listener, 'click');
  }

  /**
   * Add Listener for Pages-Buttons
   * @private
   */
  _addPagesListener() {
    const container = this.getContainer();
    this.buttons.forEach((element) => {
      
      if (!element.isInitialized && element.page !== undefined) {
        element.isInitialized = true;
        container.getElementsByClassName(element.class)[0].addEventListener('click', () => {
          this.showPage(element.page);
        });
      }
    });
  }
  
  addButtonListeners() {
    this._addRunListener();
    this._addPagesListener();
  }

  /**
   * Returns the page with pageName or the currently displayed page
   * @param {string} pageName  pageName of Page
   * @returns {*} HTMLElement of page.
   */
  getPage(pageName) {
    if (pageName) {
      const container = this.getContainer();
      return container.getElementsByClassName('page-' + pageName)[0];
    }
    else {
      const container = this.getContainer();
      const pages = container.getElementsByClassName('page');
      let currentPage = null;
      Array.from(pages).forEach((element) => {
        if (element.style.display === 'block');
        currentPage = element; 
      });
      return currentPage;
    }
  }

  getPageName() {
    const page = this.getPage();
    const classList = page.classList;
    let clsString = '';
    classList.forEach((element) => {
      if (element.startsWith('page-')) {
        clsString = element.split('-')[1];
      }
    });
    return clsString;
  }

  addInstructions(instructions) {
    this.instructions = instructions.innerHTML;
  }

  getButton(buttonIdentifier) {
    const container = this.getContainer();
    const button = container.getElementsByClassName(buttonIdentifier)[0];
    return button;
  }

  /**
   * Add a Page
   * @param {string} pageName The name of page
   * @param {string} content The content as string
   * @param {string} additionalClass The html-class as string
   * @param {boolean} front Should the page added before other pages?
   * @returns {HTMLCollection} div Element with the page-content
   */
  addPage(pageName, content, additionalClass, front = false) {
    this.pages.push({ name: pageName, });
    const container = this.getContainer();
    const pageDiv = document.createElement('div');
    pageDiv.classList.add('page', `page-${pageName}`);
    if (additionalClass) {
      pageDiv.classList.add(additionalClass);
    }
    pageDiv.innerHTML = content;
    const pages = container.getElementsByClassName('pages')[0];
    if (!front) {
      pages.append(pageDiv);
    }
    else {
      pages.prepend(pageDiv);
    }
    pageDiv.style.display = 'none';
    return pageDiv;
  }

  /**
   * Gets console as div
   * @returns {HTMLElement} Console container with class 'console.body'
   */
  getConsole() {
    const container = document.getElementById(this.containerUID);
    const c = container.getElementsByClassName('console-body')[0];
    return c;
  }
  /**
   * Gets console wrapper as div
   * @returns {HTMLElement} Console container with class 'console.body'
   */
  getConsoleWrapper() {
    const container = document.getElementById(this.containerUID);
    const c = container.getElementsByClassName('console-wrapper')[0];
    return c;
  }

  /**
   * Hides console as div
   */
  hideConsole() {
    const c = this.getConsoleWrapper();
    c.classList.add('hidden');
  }

    
  /**
   * Shows the console
   */
  showConsole() {
    const c = this.getConsoleWrapper();
    c.classList.remove('hidden');
  }


  stop() {
    this.stopSignal = true;
  }

  getContainerClasses() {
    let classes = '';
    if (this.hasButtons) {
      classes += 'has_buttons';
    }
    else {
      classes += 'not_has_buttons';
    }
    if (this.hasConsole) {
      classes += ' has_console';
    }
    else {
      classes += ' not_has_console';
    }
    return classes;
  }

  registerDOM() {
    let html = `<div  id="${this.containerUID}" class="ace_container ace-container ${this.getContainerClasses()}"><nav class="navbar">
    <div class="spinner"><div class="inner"></div></div>
    </nav>
    <div class="pages">
    <div class="page page-code">
      <div class="pre_wrapper ${this.preCodeVisible}">
        <div class="h5p_ace_pre_header ace_editor_pre_header">Pre Code</div>
        <div id = "${this.preCodeUID}" class="h5p_ace_pre ace_editor_pre"></div>
      </div>
        <div id = "${this.editorUID}" class="h5p_ace_editor ace_editor"></div>
      <div class="post_wrapper ${this.postCodeVisible}">
        <div class="h5p_ace_post_header ace_editor_post_header">Post Code</div>
        <div id = "${this.postCodeUID}" class="h5p_ace_post ace_editor_post"></div>
      </div>`;

    if (this.consoleType === 'textarea') {
      html += `
      <div class="console_wrapper console-wrapper hidden">
        <div id="h5p_ace_console_header" class="ace console console-header">Console</div>
        <textarea readonly id = "${this.consoleUID}" class="ace console console-body"></textarea>
      </div>
    </div>`;
    }
    else if (this.consoleType === 'div') {
      html += `
    <div class="console_wrapper console-wrapper hidden">
      <div id="h5p_ace_console_header" class="ace console console-header">Console</div>
      <div readonly id = "${this.consoleUID}" class="ace console console-body"></div>
    </div>
  </div>`;
    }
    this.pages.forEach((element) => {
      if (element.name !== 'code') {
        html += `<div class="page page-${element.name}"></div>`;
      }
    });
    html += '</div>'; // pages
    html += '</div>'; // container
    return html;
  }
}
