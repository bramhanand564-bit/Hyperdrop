import { db } from '../firebaseConfig';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import EventBus from '../event-bus/EventBus';
import { EventTypes } from '../event-bus/EventTypes';

export const TransactionService={
  async create({userId,amount,currency='NAX',source,idempotencyKey,metadata={}}){
    const existing=await getDocs(query(collection(db,'transactions'),where('idempotencyKey','==',idempotencyKey)));
    if(!existing.empty) return {id:existing.docs[0].id,...existing.docs[0].data(),replayed:true};
    const ref=await addDoc(collection(db,'transactions'),{userId,amount:Number(amount),currency,source,idempotencyKey,status:'pending',metadata,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
    EventBus.emit(EventTypes.PAYMENT_CREATED,{transactionId:ref.id,userId,amount:Number(amount),currency,source});
    return {id:ref.id,status:'pending'};
  },
  async setStatus(transactionId,status,details={}){
    await updateDoc(doc(db,'transactions',transactionId),{status,...details,updatedAt:serverTimestamp()});
    const type=status==='succeeded'?EventTypes.PAYMENT_RECEIVED:EventTypes.PAYMENT_FAILED;
    EventBus.emit(type,{transactionId,status,...details});
    return {id:transactionId,status};
  }
};
export default TransactionService;