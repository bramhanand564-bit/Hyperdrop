import EventEmitter from './EventEmitter';

const emitter = new EventEmitter();

export const EventBus = {
  on: (type, listener) => emitter.on(type, listener),
  off: (type, listener) => emitter.off(type, listener),
  emit: (type, payload={}) => emitter.emit(type, { ...payload, type, timestamp: Date.now() }); emitter.emit('*', { ...payload, type, timestamp: Date.now() }),
  clear: (type) => emitter.clear(type),
};

export default EventBus;