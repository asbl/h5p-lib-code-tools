// statemanager.js

export const STATES = Object.freeze({
  RUNNING: 'running',
  STOPPED: 'stopped',
  PAUSED: 'paused'
});

export const STATE_EVENTS = Object.freeze({
  CHANGE: 'state:change',
  START: 'state:start',
  STOP: 'state:stop',
  PAUSE: 'state:pause',
  RESUME: 'state:resume'
});

export default class StateManager {
  /**
   * @param {string} initialState
   */
  constructor(initialState = STATES.STOPPED) {
    if (!Object.values(STATES).includes(initialState)) {
      throw new Error(`Invalid initial state: ${initialState}`);
    }

    this.state = initialState;

    // Event-Listener Storage
    this.listeners = {
      [STATE_EVENTS.CHANGE]: new Set(),
      [STATE_EVENTS.START]: new Set(),
      [STATE_EVENTS.STOP]: new Set(),
      [STATE_EVENTS.PAUSE]: new Set(),
      [STATE_EVENTS.RESUME]: new Set()
    };
  }

  /**
   * Event-API für Observer
   * @param event
   * @param callback
   */
  on(event, callback) {
    this.listeners[event]?.add(callback);
  }

  off(event, callback) {
    this.listeners[event]?.delete(callback);
  }

  emit(event, payload) {
    this.listeners[event]?.forEach((cb) => cb(payload));
  }

  getState() {
    return this.state;
  }

  setState(nextState) {
    if (this.state === nextState) return;

    const prev = this.state;
    this.state = nextState;

    this.emit(STATE_EVENTS.CHANGE, { from: prev, to: nextState });
  }

  start() {
    if (this.state === STATES.RUNNING) return false;
    this.setState(STATES.RUNNING);
    this.emit(STATE_EVENTS.START);
    return true;
  }

  stop() {
    if (this.state === STATES.STOPPED) return false;

    this.setState(STATES.STOPPED);
    this.emit(STATE_EVENTS.STOP);
    return true;
  }

  pause() {
    if (this.state !== STATES.RUNNING) return false;

    this.setState(STATES.PAUSED);
    this.emit(STATE_EVENTS.PAUSE);
    return true;
  }

  resume() {
    if (this.state !== STATES.PAUSED) return false;

    this.setState(STATES.RUNNING);
    this.emit(STATE_EVENTS.RESUME);
    return true;
  }

  // Hilfsmethoden
  isRunning() {
    return this.state === STATES.RUNNING;
  }

  isStopped() {
    return this.state === STATES.STOPPED;
  }

  isPaused() {
    return this.state === STATES.PAUSED;
  }
}
