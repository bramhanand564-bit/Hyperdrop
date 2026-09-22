import { db, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export const AnalyticsService = {
  async track(event, properties = {}) {
    return addDoc(collection(db, 'analytics_events'), {
      event,
      properties,
      userId: auth.currentUser?.uid || null,
      createdAt: serverTimestamp()
    });
  },
  attach(EventBus) {
    return EventBus.on('*', payload => {
      if (payload?.type) this.track(payload.type, payload).catch(error => console.error('Analytics event error', error));
    });
  }
};
export default AnalyticsService;
