import BaseObserver from './baseobserver';
import { STATE_EVENTS, STATES } from '../statemanager';

export default class StateStopObserver extends BaseObserver {
  constructor(stateManager, callback) {
    super(null, callback);
    this.stateManager = stateManager;
    this.handler = null;
  }

  start() {
    this.handler = () => this.callback();
    this.stateManager.on(STATE_EVENTS.STOP, this.handler);

    this.observer = {
      disconnect: () => this.stop()
    };
  }

  stop() {
    if (this.handler) {
      this.stateManager.off(STATE_EVENTS.STOP, this.handler);
      this.handler = null;
    }
    this.observer = null;
  }
}
