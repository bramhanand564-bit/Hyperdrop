import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import EventBus from '../event-bus/EventBus';
export const NotificationManager={
  async notify(userId,notification){if(!userId) return null;return addDoc(collection(db,'users',userId,'notifications'),{...notification,read:false,createdAt:serverTimestamp()});},
  attach(){return EventBus.on('notification.requested',payload=>{if(payload.userId)this.notify(payload.userId,payload);});}
};
export default NotificationManager;