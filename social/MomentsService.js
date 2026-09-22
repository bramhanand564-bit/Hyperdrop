import { db, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import EventBus from '../event-bus/EventBus';
import { EventTypes } from '../event-bus/EventTypes';
export const MomentsService={
  async create(moment){const userId=auth.currentUser?.uid;if(!userId) throw new Error('Authentication required.');const ref=await addDoc(collection(db,'moments'),{...moment,userId,likes:0,shares:0,createdAt:serverTimestamp()});EventBus.emit(EventTypes.MOMENT_CREATED,{momentId:ref.id,userId});return {id:ref.id};},
  async feed(max=50){const snap=await getDocs(query(collection(db,'moments'),orderBy('createdAt','desc'),limit(max)));return snap.docs.map(d=>({id:d.id,...d.data()}));},
  async like(momentId){await updateDoc(doc(db,'moments',momentId),{likes:increment(1)});EventBus.emit(EventTypes.MOMENT_LIKED,{momentId,userId:auth.currentUser?.uid});}
};
export default MomentsService;