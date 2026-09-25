import { db } from '../firebaseConfig';
import { collection, addDoc, query, where, getDocs, doc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
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
  },
  async transferTokens({ senderId, recipientId, amount }) {
    if (!senderId || !recipientId) throw new Error('Sender and recipient are required.');
    if (senderId === recipientId) throw new Error('You cannot send tokens to yourself.');
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || value > 1000000) throw new Error('Enter a valid amount between 0 and 1,000,000 NAX.');

    const transferId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    await runTransaction(db, async (tx) => {
      const senderRef = doc(db, 'users', senderId);
      const recipientRef = doc(db, 'users', recipientId);
      const [senderSnap, recipientSnap] = await Promise.all([tx.get(senderRef), tx.get(recipientRef)]);
      if (!senderSnap.exists()) throw new Error('Sender wallet not found.');
      if (!recipientSnap.exists()) throw new Error('Recipient wallet not found.');
      const balance = Number(senderSnap.data()?.walletBalance || 0);
      if (balance < value) throw new Error('Insufficient NAX balance.');

      tx.update(senderRef, { walletBalance: balance - value, updatedAt: serverTimestamp() });
      tx.update(recipientRef, { walletBalance: Number(recipientSnap.data()?.walletBalance || 0) + value, updatedAt: serverTimestamp() });

      const senderTx = doc(collection(db, 'users', senderId, 'transactions'));
      const recipientTx = doc(collection(db, 'users', recipientId, 'transactions'));
      const base = { amount: value, currency: 'NAX', transferId, timestamp: serverTimestamp(), status: 'succeeded' };
      tx.set(senderTx, { ...base, title: 'NAX transfer sent', isCredit: false, counterpartyId: recipientId, time: 'Just now' });
      tx.set(recipientTx, { ...base, title: 'NAX transfer received', isCredit: true, counterpartyId: senderId, time: 'Just now' });
      const globalTx = doc(collection(db, 'transactions'));
      tx.set(globalTx, { ...base, senderId, recipientId, source: 'nax_transfer', idempotencyKey: transferId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    });

    EventBus.emit(EventTypes.PAYMENT_RECEIVED, { transactionId: transferId, senderId, recipientId, amount: value, currency: 'NAX', source: 'nax_transfer' });
    return { id: transferId, status: 'succeeded', amount: value, currency: 'NAX' };
  },

  async requestWithdrawal({ userId, amount }) {
    const value = Number(amount);
    if (!userId) throw new Error('Authentication required.');
    if (!Number.isFinite(value) || value < 100) throw new Error('Minimum withdrawal is 100 NAX.');
    const ref = await addDoc(collection(db, 'withdrawal_requests'), { userId, amount: value, currency: 'NAX', status: 'pending', createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    return { id: ref.id, status: 'pending' };
  }
};
export default TransactionService;