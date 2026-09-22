import { db } from '../firebaseConfig';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
export const AuditLogger={ async log(action,details={}){ try{return await addDoc(collection(db,'audit_logs'),{action,details,createdAt:serverTimestamp()});}catch(e){console.error('AuditLogger',e);return null;} } };
export default AuditLogger;