import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
export const ExecutionLogger = { async log(entry={}) { try { await addDoc(collection(db,'automation_executions'), { ...entry, createdAt: serverTimestamp() }); } catch(e) { console.error('ExecutionLogger',e); } } };
export default ExecutionLogger;