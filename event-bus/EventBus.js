import EventEmitter from './EventEmitter';

const emitter = new EventEmitter();

export const EventBus = {
  on: (type, listener) => emitter.on(type, listener),
  off: (type, listener) => emitter.off(type, listener),
  emit: (type, payload = {}) => {
    const event = { ...payload, type, timestamp: Date.now() };
    emitter.emit(type, event);
    emitter.emit('*', event);
    return event;
  },
  clear: (type) => emitter.clear(type),
};

export default EventBus;
