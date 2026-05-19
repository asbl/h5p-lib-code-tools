# Compatibility Notes

These compatibility paths are intentionally kept for existing H5P content.

## External Library URL Keys

The shared parser accepts older and newer keys, for example:

- `blockly` and `blocklyCdnUrl`
- `codeMirror` and `codeMirrorCdnUrl`
- `sqljs` and `sqlJsUrl`
- `pyodide` and `pyodideCdnUrl`
- TeaVM aliases such as `teavm`, `teavmWorker`, `teavmFrame`

New content should prefer the explicit `*CdnUrl` / TeaVM asset option names.

## Project Files

Python still accepts legacy `pyodideOptions.sourceFiles` before falling back to
`editorSettings.sourceFiles`. New content should use `editorSettings.sourceFiles`
or per-code-block `sourceFiles`.

## Blockly Packages

Package-specific Blockly managers are no longer hard-wired into LibCodeTools.
PythonQuestion registers its package managers during bundle startup. This keeps
LibCodeTools language-neutral while preserving existing Python Blockly package
content.

## Runtime Errors

Runtime code is moving toward structured result/error objects. Existing UI code
may still receive plain text error messages for backward compatibility.
