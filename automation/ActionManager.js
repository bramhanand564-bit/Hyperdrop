import EventBus from '../event-bus/EventBus';
export const ActionManager = {
  async execute(action, context={}) {
    switch(action?.type){
      case 'emit_event': EventBus.emit(action.event, { ...context, ...(action.payload||{}) }); return true;
      case 'send_notification': EventBus.emit('notification.requested', { ...context, ...(action.payload||{}) }); return true;
      case 'analytics': EventBus.emit('analytics.event', { ...context, ...(action.payload||{}) }); return true;
      default: throw new Error('Unsupported automation action: '+String(action?.type));
    }
  },
  async executeAll(actions=[], context={}) { for(const action of actions) await ActionManager.execute(action,context); }
};
export default ActionManager;