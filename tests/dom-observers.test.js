import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BaseObserver from '../src/scripts/manager/observer/baseobserver.js';
import ButtonClickedObserver from '../src/scripts/manager/observer/buttonclickedobserver.js';
import PageHasChangedObserver from '../src/scripts/manager/observer/pagehaschangedobserver.js';
import PageHideObserver from '../src/scripts/manager/observer/pagehideobserver.js';
import PageIsEmptyObserver from '../src/scripts/manager/observer/pageisemptyobserver.js';
import PageIsVisibleObserver from '../src/scripts/manager/observer/pageisvisibleobserver.js';
import PageShowObserver from '../src/scripts/manager/observer/pageshowobserver.js';

const waitForObserverTick = () => new Promise((resolve) => window.setTimeout(resolve, 0));

describe('BaseObserver', () => {
  it('starts and stops a subclass observer', () => {
    const disconnect = vi.fn();

    class TestObserver extends BaseObserver {
      createObserver() {
        return { disconnect };
      }
    }

    const target = document.createElement('div');
    const observer = new TestObserver(target, vi.fn());

    observer.start();
    expect(observer.observer).not.toBeNull();

    observer.stop();
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(observer.observer).toBeNull();
  });

  it('warns on invalid targets and callbacks', () => {
    class TestObserver extends BaseObserver {
      createObserver() {
        return { disconnect: vi.fn() };
      }
    }

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    new TestObserver('not-an-element', vi.fn()).start();
    new TestObserver(document.createElement('div'), 'not-a-function').start();

    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('DOM observer subclasses', () => {
  let intersectionObserverInstances;

  beforeEach(() => {
    intersectionObserverInstances = [];

    vi.stubGlobal('IntersectionObserver', class IntersectionObserver {
      constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.observe = vi.fn();
        this.disconnect = vi.fn();
        intersectionObserverInstances.push(this);
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('handles button click registration and cleanup', () => {
    const button = document.createElement('button');
    const callback = vi.fn();
    const observer = new ButtonClickedObserver(button, callback);

    observer.start();
    button.click();
    observer.stop();
    button.click();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('fires page show and hide callbacks on visibility changes', async () => {
    const showPage = document.createElement('div');
    showPage.style.display = 'none';
    const hidePage = document.createElement('div');
    hidePage.style.display = 'block';

    const onShow = vi.fn();
    const onHide = vi.fn();
    const showObserver = new PageShowObserver(showPage, onShow);
    const hideObserver = new PageHideObserver(hidePage, onHide);

    showObserver.start();
    hideObserver.start();

    showPage.style.display = 'block';
    await waitForObserverTick();
    hidePage.style.display = 'none';
    await waitForObserverTick();

    expect(onShow).toHaveBeenCalledTimes(1);
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it('tracks whether a page is empty and reacts to content changes', async () => {
    const page = document.createElement('div');
    const onEmptyChange = vi.fn();
    const onChanged = vi.fn();
    const emptyObserver = new PageIsEmptyObserver(page, onEmptyChange);
    const changedObserver = new PageHasChangedObserver(page, onChanged);

    emptyObserver.start();
    changedObserver.start();

    expect(onEmptyChange).toHaveBeenCalledWith(true, page);

    page.appendChild(document.createElement('span'));
    await waitForObserverTick();

    expect(onChanged).toHaveBeenCalled();
    expect(onEmptyChange).toHaveBeenLastCalledWith(false, page);
  });

  it('uses IntersectionObserver for visible page tracking', () => {
    const page = document.createElement('div');
    const callback = vi.fn();
    const observer = new PageIsVisibleObserver(page, callback);

    observer.start();
    expect(intersectionObserverInstances).toHaveLength(1);
    expect(intersectionObserverInstances[0].observe).toHaveBeenCalledWith(page);

    intersectionObserverInstances[0].callback([{ isIntersecting: true }]);
    expect(callback).toHaveBeenCalledWith([{ isIntersecting: true }]);
  });
});