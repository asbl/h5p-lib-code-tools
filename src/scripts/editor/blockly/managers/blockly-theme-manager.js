import * as Blockly from 'blockly';

/**
 * Handles Blockly theme creation and host-container theme classes.
 */
export default class BlocklyThemeManager {
  constructor(parentElement) {
    this.parentElement = parentElement;
  }

  /**
   * Builds the workspace theme for a given mode.
   * @param {string} theme Theme variant.
   * @returns {Blockly.Theme} Blockly theme.
   */
  getWorkspaceTheme(theme) {
    return theme === 'dark'
      ? this._makeDarkTheme()
      : Blockly.Themes.Zelos;
  }

  /**
   * Applies light/dark classes on the host container.
   * @param {string} theme Theme variant.
   */
  applyContainerTheme(theme) {
    if (!this.parentElement) {
      return;
    }

    this.parentElement.classList.toggle('blockly-theme-dark', theme === 'dark');
    this.parentElement.classList.toggle('blockly-theme-light', theme !== 'dark');
  }

  /**
   * Creates the custom Blockly dark theme.
   * @returns {Blockly.Theme} Dark Blockly theme.
   */
  _makeDarkTheme() {
    return Blockly.Theme.defineTheme('dark', {
      base: Blockly.Themes.Zelos,
      componentStyles: {
        workspaceBackgroundColour: '#1e1e1e',
        toolboxBackgroundColour: '#2d2d2d',
        toolboxForegroundColour: '#ccc',
        flyoutBackgroundColour: '#252526',
        flyoutForegroundColour: '#ccc',
        insertionMarkerColour: '#fff',
        insertionMarkerOpacity: 0.3,
        scrollbarColour: '#555',
        scrollbarOpacity: 0.7,
      },
    });
  }
}
