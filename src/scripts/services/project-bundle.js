/**
 * Serializes/deserializes a CodeContainer's workspace (plus images/sounds)
 * into a single downloadable/importable project bundle object. Kept
 * independent of the rest of the container so the bundle format (and its
 * own validation rules) can be reasoned about on its own.
 *
 * All calls back into the owning container go through `this.container.*`
 * rather than duplicating logic here, so subclass/test overrides of those
 * container methods (e.g. a mocked getWorkspaceSnapshot()) keep taking effect.
 */
export default class ProjectBundleService {
  /**
   * @param {object} container Owning CodeContainer instance.
   */
  constructor(container) {
    this.container = container;
  }

  /**
   * Checks whether the current project has anything worth bundling beyond
   * the single entry file (additional visible source files, images, sounds).
   * @returns {boolean} True if a project bundle would have content.
   */
  hasProjectBundleContents() {
    const container = this.container;

    if (!container.supportsProjectStorage()) {
      return false;
    }

    const workspace = container.getWorkspaceSnapshot();
    const hasAdditionalSourceFiles = Array.isArray(workspace?.files)
      && workspace.files.some((file) => file.isEntry !== true && file.visible !== false);
    const hasImages = container.getImageManager()?.isEnabled?.() === true
      && container.getImageManager().getFiles().length > 0;
    const hasSounds = container.getSoundManager()?.isEnabled?.() === true
      && container.getSoundManager().getFiles().length > 0;

    return hasAdditionalSourceFiles || hasImages || hasSounds;
  }

  /**
   * Builds a project bundle for download when the project contains multiple files.
   * @returns {object|null} Serializable project bundle or null.
   */
  getProjectBundle() {
    const container = this.container;

    if (!container.hasProjectBundleContents()) {
      return null;
    }

    const workspace = container.getWorkspaceSnapshot();

    if (!workspace) {
      return null;
    }

    return {
      type: container.options?.projectBundleType || container.getDefaultProjectBundleType(),
      version: 1,
      entryFileName: workspace.entryFileName,
      activeFileName: workspace.files.some((file) => (
        file.name === workspace.activeFileName && file.visible !== false
      ))
        ? workspace.activeFileName
        : workspace.entryFileName,
      sourceFiles: workspace.files
        .filter((file) => file.isEntry === true || file.visible !== false)
        .map((file) => ({
          name: file.name,
          code: file.code,
          visible: file.visible !== false,
          editable: file.editable !== false,
          isEntry: file.isEntry === true,
          blankValues: file.blankValues ? { ...file.blankValues } : null,
        })),
      images: container.getImageManager()?.isEnabled?.() === true
        ? container.getImageManager().serializeFiles()
        : [],
      sounds: container.getSoundManager()?.isEnabled?.() === true
        ? container.getSoundManager().serializeFiles()
        : [],
    };
  }

  /**
   * Applies a previously exported project bundle.
   * @param {object} projectBundle - Parsed project bundle.
   * @returns {boolean} True if the bundle was applied.
   */
  applyProjectBundle(projectBundle) {
    const container = this.container;

    if (!container.supportsProjectStorage()) {
      return false;
    }

    if (projectBundle?.type !== (container.options?.projectBundleType || container.getDefaultProjectBundleType())) {
      return false;
    }

    if (!Array.isArray(projectBundle?.sourceFiles) || projectBundle.sourceFiles.length === 0) {
      return false;
    }

    const workspaceFiles = Array.isArray(projectBundle?.sourceFiles)
      ? projectBundle.sourceFiles
        .filter((file) => typeof file?.name === 'string' && file.name.trim() !== '')
        .map((file) => ({
          name: file.name,
          code: typeof file.code === 'string' ? file.code : '',
          visible: file.visible !== false,
          editable: file.editable !== false,
          isEntry: file.isEntry === true,
          blankValues: file.blankValues ? { ...file.blankValues } : null,
        }))
      : [];

    if (workspaceFiles.length === 0) {
      return false;
    }

    container.setWorkspaceSnapshot({
      entryFileName: projectBundle.entryFileName || container.options?.entryFileName || container.getDefaultEntryFileName(),
      activeFileName: projectBundle.activeFileName,
      files: workspaceFiles,
    });

    if (container.getImageManager()?.isEnabled?.() === true) {
      container.getImageManager().replaceFiles(Array.isArray(projectBundle.images) ? projectBundle.images : []);
    }

    if (container.getSoundManager()?.isEnabled?.() === true) {
      container.getSoundManager().replaceFiles(Array.isArray(projectBundle.sounds) ? projectBundle.sounds : []);
    }

    return true;
  }
}
