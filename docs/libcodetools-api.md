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
