import { describe, expect, it, vi } from 'vitest';

import ButtonManager from '../src/scripts/manager/buttonmanager.js';
import ObserverManager from '../src/scripts/manager/observermanager.js';
import PageManager from '../src/scripts/manager/pagemanager.js';
import StateManager from '../src/scripts/manager/statemanager.js';
import UIRegistryManager from '../src/scripts/manager/uiregistrymanager.js';

/**
 * Creates a minimal code-container test harness for UI registry tests.
 * @returns {object} Test harness with managers and spies.
 */
function createContainer() {
  const root = document.createElement('div');
  const resizeActionHandler = vi.fn();
  const buttonManager = new ButtonManager(root, true, {
    run: 'Run',
    stop: 'Stop',
    showCode: 'Code',
    save: 'Save',
    load: 'Load',
  });
  const pageManager = new PageManager(root, {}, resizeActionHandler);
  const observerManager = new ObserverManager();
  const stateManager = new StateManager();

  const container = {
    buttonManager,
    pageManager,
    observerManager,
    stateManager,
    imagesButtonClicked: false,
    imagesPageShown: false,
    runStateObserved: false,
    getButtonManager() {
      return this.buttonManager;
    },
    getPageManager() {
      return this.pageManager;
    },
    getObserverManager() {
      return this.observerManager;
    },
    getStateManager() {
      return this.stateManager;
    },
    onImagesButtonClick() {
      this.imagesButtonClicked = true;
    },
    onImagesPageShow() {
      this.imagesPageShown = true;
    },
    onRunStateStart() {
      this.runStateObserved = true;
    },
  };

  return {
    buttonManager,
    container,
    observerManager,
    pageManager,
    resizeActionHandler,
    stateManager,
  };
}

describe('UIRegistryManager', () => {
  it('registers pages, buttons, and observers from declarative definitions', async () => {
    const {
      buttonManager,
      container,
      observerManager,
      pageManager,
      stateManager,
    } = createContainer();

    await pageManager.setupPages();
    await buttonManager.setupButtons();

    const registryManager = new UIRegistryManager(container);

    registryManager.register({
      pages: [
        {
          name: 'images',
          content: document.createElement('div'),
          additionalClass: 'images',
          visible: false,
        },
      ],
      buttons: [
        {
          identifier: 'images',
          label: () => 'Images',
          class: 'images',
        },
      ],
      observers: [
        {
          name: 'button:images:clicked',
          type: 'button-click',
          button: 'images',
          callback: 'onImagesButtonClick',
        },
        {
          name: 'page:images:show',
          type: 'page-show',
          page: 'images',
          callback: 'onImagesPageShow',
        },
        {
          name: 'state:run:images',
          type: 'state-run',
          callback: 'onRunStateStart',
        },
      ],
    });

    buttonManager.getButton('images').click();
    pageManager.showPage('images');
    stateManager.start();

    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(container.imagesButtonClicked).toBe(true);
    expect(container.imagesPageShown).toBe(true);
    expect(container.runStateObserved).toBe(true);

    observerManager.disconnectAll();
  });

  it('skips conditional registrations when the predicate resolves to false', async () => {
    const { buttonManager, container, pageManager } = createContainer();

    await pageManager.setupPages();
    await buttonManager.setupButtons();

    const registryManager = new UIRegistryManager(container);

    registryManager.register({
      buttons: [
        {
          when: () => false,
          identifier: 'images',
          label: 'Images',
          class: 'images',
        },
      ],
      pages: [
        {
          when: false,
          name: 'images',
          content: '',
          additionalClass: 'images',
        },
      ],
    });

    expect(buttonManager.getButton('images')).toBeNull();
    expect(pageManager.getPageObj('images')).toBeUndefined();
  });
});