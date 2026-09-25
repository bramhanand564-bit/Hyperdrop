import EventBus from '../event-bus/EventBus';

const mergePayload = (action, context) => ({
  ...context,
  ...(action?.payload || {}),
});

export const ActionManager = {
  async execute(action, context = {}) {
    if (!action?.type) throw new Error('Automation action type is required');

    switch (action.type) {
      case 'emit_event': {
        if (!action.event) throw new Error('Automation event name is required');
        EventBus.emit(action.event, mergePayload(action, context));
        return { type: action.type, event: action.event };
      }

      case 'send_notification':
      case 'notification': {
        EventBus.emit('notification.requested', mergePayload(action, context));
        return { type: 'send_notification' };
      }

      case 'analytics':
      case 'track_event': {
        EventBus.emit('analytics.event', mergePayload(action, context));
        return { type: 'analytics' };
      }

      case 'log': {
        const message = String(action.message ?? action.payload?.message ?? 'Automation executed');
        EventBus.emit('automation.log', { ...context, message });
        return { type: 'log', message };
      }

      default:
        throw new Error('Unsupported automation action: ' + String(action.type));
    }
  },

  async executeAll(actions = [], context = {}) {
    if (!Array.isArray(actions)) throw new Error('Automation actions must be an array');
    const results = [];
    for (const action of actions) {
      results.push(await ActionManager.execute(action, context));
    }
    return results;
  },
};

export default ActionManager;