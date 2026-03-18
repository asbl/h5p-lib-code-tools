import { config, dom, library } from '@fortawesome/fontawesome-svg-core';
import {
  faDownLeftAndUpRightToCenter,
  faFloppyDisk,
  faImage,
  faMaximize,
  faMoon,
  faNoteSticky,
  faPlay,
  faStop,
  faSun,
  faUpload,
} from '@fortawesome/free-solid-svg-icons';
import '@fortawesome/fontawesome-svg-core/styles.css';

export const FONT_AWESOME_ICONS = [
  faPlay,
  faStop,
  faFloppyDisk,
  faUpload,
  faMaximize,
  faDownLeftAndUpRightToCenter,
  faNoteSticky,
  faImage,
  faMoon,
  faSun,
];

let isInitialized = false;

/**
 * Registers the Font Awesome icons used by the shared UI and enables DOM watching.
 */
export function initializeFontAwesome() {
  if (isInitialized) {
    return;
  }

  config.autoAddCss = false;
  library.add(...FONT_AWESOME_ICONS);

  if (typeof document !== 'undefined') {
    dom.watch();
  }

  isInitialized = true;
}