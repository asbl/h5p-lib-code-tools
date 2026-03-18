import { describe, expect, it, vi } from 'vitest';

import ObserverManager from '../src/scripts/manager/observermanager.js';
import StateManager, { STATE_EVENTS, STATES } from '../src/scripts/manager/statemanager.js';
import StateRunObserver from '../src/scripts/manager/observer/staterunobserver.js';
import StateStopObserver from '../src/scripts/manager/observer/statestopobserver.js';

describe('StateManager', () => {
  it('tracks transitions and emits lifecycle events', () => {
    const manager = new StateManager();
    const onChange = vi.fn();
    const onStart = vi.fn();
    const onPause = vi.fn();
    const onResume = vi.fn();
    const onStop = vi.fn();

    manager.on(STATE_EVENTS.CHANGE, onChange);
    manager.on(STATE_EVENTS.START, onStart);
    manager.on(STATE_EVENTS.PAUSE, onPause);
    manager.on(STATE_EVENTS.RESUME, onResume);
    manager.on(STATE_EVENTS.STOP, onStop);

    expect(manager.start()).toBe(true);
    expect(manager.pause()).toBe(true);
    expect(manager.resume()).toBe(true);
    expect(manager.stop()).toBe(true);
    expect(manager.isStopped()).toBe(true);

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls).toEqual([
      [{ from: STATES.STOPPED, to: STATES.RUNNING }],
      [{ from: STATES.RUNNING, to: STATES.PAUSED }],
      [{ from: STATES.PAUSED, to: STATES.RUNNING }],
      [{ from: STATES.RUNNING, to: STATES.STOPPED }],
    ]);
  });

  it('rejects invalid initial states and supports removing listeners', () => {
    expect(() => new StateManager('invalid')).toThrow('Invalid initial state: invalid');

    const manager = new StateManager();
    const callback = vi.fn();
    manager.on(STATE_EVENTS.START, callback);
    manager.off(STATE_EVENTS.START, callback);
    manager.start();

    expect(callback).not.toHaveBeenCalled();
  });
});

describe('ObserverManager', () => {
  it('starts, unregisters, and disconnects observers', () => {
    const manager = new ObserverManager();
    const first = { start: vi.fn(), stop: vi.fn() };
    const second = { start: vi.fn(), stop: vi.fn() };

    manager.register('first', first);
    manager.register('second', second);

    expect(first.start).toHaveBeenCalledTimes(1);
    expect(second.start).toHaveBeenCalledTimes(1);

    manager.unregister('first');
    expect(first.stop).toHaveBeenCalledTimes(1);

    manager.disconnectAll();
    expect(second.stop).toHaveBeenCalledTimes(1);
    expect(manager.observers.size).toBe(0);
  });

  it('rejects duplicate observer registrations', () => {
    const manager = new ObserverManager();
    const observer = { start: vi.fn(), stop: vi.fn() };

    manager.register('duplicate', observer);

    expect(() => manager.register('duplicate', observer)).toThrow("Observer 'duplicate' is already registered.");
  });
});

describe('State observers', () => {
  it('reacts to state manager start and stop events', () => {
    const stateManager = new StateManager();
    const onRun = vi.fn();
    const onStop = vi.fn();
    const runObserver = new StateRunObserver(stateManager, onRun);
    const stopObserver = new StateStopObserver(stateManager, onStop);

    runObserver.start();
    stopObserver.start();

    stateManager.start();
    stateManager.stop();

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);

    runObserver.stop();
    stopObserver.stop();

    stateManager.start();
    stateManager.stop();

    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});