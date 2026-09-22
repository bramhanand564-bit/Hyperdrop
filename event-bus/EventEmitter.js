export class EventEmitter {
  constructor(){ this.listeners = new Map(); }
  on(type, listener){
    if(typeof listener !== 'function') return () => {};
    if(!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
    return () => this.off(type, listener);
  }
  off(type, listener){ const set=this.listeners.get(type); if(!set) return; set.delete(listener); if(!set.size) this.listeners.delete(type); }
  emit(type, payload={}){ const set=this.listeners.get(type); if(!set) return; for(const listener of [...set]) { try { listener(payload); } catch(e) { console.error('Event listener error', type, e); } } }
  clear(type){ if(type) this.listeners.delete(type); else this.listeners.clear(); }
}
export default EventEmitter;