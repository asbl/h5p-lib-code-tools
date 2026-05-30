import {
  composeFillBlanksCode,
  parseFillBlanksTemplate,
} from './fill-blanks-code.js';

export default class FillBlanksEditorInstance {
  constructor(target, content = '', codingLanguage, options = {}) {
    this.parentElement = target instanceof HTMLElement ? target : document.getElementById(target);
    this.codingLanguage = codingLanguage;
    this.options = {
      onChangeCallback: () => { },
      resizeActionHandler: () => { },
      theme: 'light',
      readonly: false,
      blankValues: {},
      ...options,
    };
    this.templateCode = String(content || '');
    this.blankValues = { ...(this.options.blankValues || {}) };
    this.inputs = new Map();
    this.root = null;

    this.render();
  }

  getTemplateCode() {
    return this.templateCode;
  }

  getBlankValues() {
    if (this.options.readonly === true) {
      return { ...this.blankValues };
    }

    this.inputs.forEach((input, valueKey) => {
      this.blankValues[valueKey] = input.value;
    });

    return { ...this.blankValues };
  }

  getCode() {
    const code = composeFillBlanksCode(this.templateCode, this.getBlankValues());
    return code.endsWith('\n') ? code : `${code}\n`;
  }

  setCode(code) {
    const nextCode = String(code || '');
    this.templateCode = nextCode;
    this.blankValues = {};
    this.render();
  }

  setTheme(theme) {
    this.options.theme = theme === 'dark' ? 'dark' : 'light';
    this.root?.classList.remove('theme-light', 'theme-dark');
    this.root?.classList.add(`theme-${this.options.theme}`);
  }

  focus() {
    const firstInput = this.root?.querySelector?.('.fill-blanks-input');
    firstInput?.focus?.();
  }

  destroy() {
    this.inputs.clear();
    if (this.parentElement) {
      this.parentElement.innerHTML = '';
    }
    this.root = null;
  }

  render() {
    if (!this.parentElement) {
      throw new Error('FillBlanksEditorInstance target not found');
    }

    this.parentElement.innerHTML = '';
    this.inputs.clear();

    const root = document.createElement('div');
    root.className = `fill-blanks-editor theme-${this.options.theme}`;
    root.dataset.language = this.codingLanguage || 'code';

    const code = document.createElement('pre');
    code.className = 'fill-blanks-code';
    const lineNumbers = document.createElement('span');
    lineNumbers.className = 'fill-blanks-line-numbers';
    const body = document.createElement('code');
    body.className = 'fill-blanks-body';

    const parts = parseFillBlanksTemplate(this.templateCode);
    parts.forEach((part) => {
      if (part.type === 'text') {
        body.appendChild(document.createTextNode(part.text));
        return;
      }

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'fill-blanks-input';
      input.value = this.blankValues[part.valueKey] ?? this.blankValues[part.id] ?? '';
      input.placeholder = part.placeholder;
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.dataset.blankId = part.id;
      input.dataset.blankValueKey = part.valueKey;
      input.readOnly = this.options.readonly === true;
      input.setAttribute('aria-label', `Code blank ${part.index}`);
      input.style.setProperty('--blank-chars', String(Math.max(4, input.value.length, part.placeholder.length)));
      input.addEventListener('input', () => {
        if (this.options.readonly === true) {
          return;
        }

        this.blankValues[part.valueKey] = input.value;
        input.style.setProperty('--blank-chars', String(Math.max(4, input.value.length, input.placeholder.length)));
        this.options.onChangeCallback(this.getCode());
        this.options.resizeActionHandler();
      });

      this.inputs.set(part.valueKey, input);
      body.appendChild(input);
    });

    lineNumbers.textContent = this.getLineNumbersText();
    code.append(lineNumbers, body);
    root.appendChild(code);
    this.parentElement.appendChild(root);
    this.root = root;
    this.options.resizeActionHandler();
  }

  getLineNumbersText() {
    const lines = Math.max(1, this.templateCode.split(/\r\n|\r|\n/).length);
    return Array.from({ length: lines }, (_, index) => String(index + 1)).join('\n');
  }

  setFixedLines(_lines) {
    return undefined;
  }

  restoreDynamicHeight() {
    return undefined;
  }
}
