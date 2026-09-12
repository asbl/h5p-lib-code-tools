# Changelog

Notable changes to H5P.LibCodeTools, following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

History before 6.94.0 was not reconstructed from git log; use `git log` for
that period. From here on, add an entry under **Unreleased** with each
notable change, then move it under a version heading when `library.json` is
bumped.

## Unreleased

### Added

- `registerCodeEditorFactory(mode, factory)` / `getCodeEditorFactory(mode)`
  registry for custom editor modes (e.g. a relational-algebra editor for
  SQL), exposed as `H5P.registerCodeEditorFactory` /
  `H5P.getCodeEditorFactory` / `H5P.getRegisteredCodeEditorModes`. Mirrors
  the existing Blockly language-pack/package-manager registries so content
  types register once at bundle startup instead of passing a factory
  through `CodeContainer`/`EditorManager` options on every instantiation.
- `src/scripts/services/cdn-package-versions.js` derives the pinned CDN
  version for Blockly, JSZip, marked and marked-alert from their
  devDependency entry in `package.json`, removing the previous duplicate,
  independently-maintained version strings in each `*-runtime.js` file.

### Fixed

- `Markdown` tracked whether `marked` extensions/DOMPurify hooks were
  configured with a single module-level flag. A second `Markdown` instance
  loading a different marked runtime (e.g. a self-hosted mirror via a
  custom `markdownCdnUrl`) would silently skip configuration because an
  earlier instance had already flipped the flag. Configuration state is now
  keyed off the actual `marked` runtime instance.
- The `editorFactories` option intended to support custom editor modes was
  threaded through `CodeContainer`/`EditorManager` but never actually
  consulted when mounting an editor, so any custom `editorMode` silently
  fell back to `code`. Replaced by the `registerCodeEditorFactory` registry
  above.
- `PageManager.pageIsActive()` threw when called with a page name that was
  never registered, instead of returning `false` like the sibling `isEmpty()`
  method.

### Tests

- Added coverage for `ButtonManager`, `PageManager`, `CanvasManager` and
  `SoundManager` branches that had no test (empty/disabled managers,
  front-inserted pages, missing-page lookups, `hasVisibleCanvas()` edge
  cases, and `SoundManager`'s own preview/rename/find/remove behavior).

## [6.94.0]

### Changed

- Replaced `marked-admonition-extension` with `marked-alert` for Markdown
  admonition/GFM-alert rendering, with a legacy compatibility shim for
  existing content.
- Rendered links in Markdown output now get `target="_blank"` and
  `rel="noopener noreferrer"` via a DOMPurify hook.

### Added

- Mermaid diagram rendering for ` ```mermaid ` code blocks in Markdown.
