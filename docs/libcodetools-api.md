# LibCodeTools Integration API

`H5P.LibCodeTools` is the shared editor/runtime platform for the code-question
content types. Content types should keep language-specific behavior in their own
bundle and register it through the stable hooks below.

## Blockly

- `H5P.registerBlocklyLanguagePack(languageOrLanguages, pack)` registers a
  language toolbox and `generate(workspace)` implementation.
- `H5P.getBlocklyLanguagePack(language)` resolves a registered pack.
- `H5P.registerBlocklyPackageManagers(managers)` registers package-specific
  Blockly categories such as Python NumPy, Matplotlib, Miniworlds and SciPy.
- `H5P.getRegisteredBlocklyPackageManagers()` is intended for diagnostics/tests.

Language packs must follow the `BlocklyLanguagePack` contract in
`src/scripts/editor/blockly/blockly-language-pack-contract.js`.

## Custom Editor Modes

- `H5P.registerCodeEditorFactory(mode, factory)` registers a custom editor
  implementation for an `editorMode` value beyond the built-in `code`,
  `blocks`, `both` and `fill-blanks` modes, e.g. a relational-algebra editor
  for SQL. `factory` must follow the same constructor contract as the
  built-in editors: `(target, content, codingLanguage, options)`, and the
  returned instance must implement `getCode()`/`setCode()` (plus `destroy()`,
  `setFixedLines()`, `restoreDynamicHeight()` and `setTheme()`).
- `H5P.getCodeEditorFactory(mode)` resolves a registered factory.
- `H5P.getRegisteredCodeEditorModes()` is intended for diagnostics/tests.

Content types register their factory during bundle startup, then pass the
matching `editorMode` string through `CodeContainer`/`EditorManager` options.
An `editorMode` without a registered factory and outside the built-in list
falls back to `code`.

## CDN Runtime Versions

Some runtime libraries (Blockly, JSZip, marked, marked-alert) are both a
local devDependency (used for tests/bundling) and loaded from a CDN at
runtime with a pinned version. `src/scripts/services/cdn-package-versions.js`
derives the CDN version from the devDependency entry in `package.json`, so
there is a single place to bump when updating one of these packages. Other
CDN-loaded libraries without a local devDependency (DOMPurify, Mermaid,
SweetAlert2, p5.js, Font Awesome) keep their pinned version as a plain string
constant in their respective `*-runtime.js` file.

## Shared Configuration Helpers

`src/scripts/services/code-question-config.js` contains small shared helpers for:

- parsing the YAML-ish `externalLibraryUrls` map,
- decoding HTML-encoded editor text,
- normalizing inherited option objects,
- normalizing editor modes.

Content types may wrap these helpers when they need language-specific defaults.

## Runtime Result Shape

`src/scripts/runtime/runtime-result.js` defines a lightweight common shape for
runtime success and error information:

```js
{
  phase: 'execution',
  stdout: '',
  stderr: '',
  value: null,
  table: null,
  exitCode: 0,
  diagnostics: []
}
```

UI-facing code may still receive legacy strings while content types migrate, but
new runtime code should keep the structured object internally.
