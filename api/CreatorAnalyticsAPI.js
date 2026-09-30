import { auth, db } from '../firebaseConfig';
import { collection, doc, getDocs, increment, runTransaction, serverTimestamp, query, where } from 'firebase/firestore';

const creatorRef = creatorId => collection(db, 'creator_analytics', creatorId, 'apps');
const botRef = creatorId => collection(db, 'creator_analytics', creatorId, 'bots');

const uid = () => auth?.currentUser?.uid || null;

const clean = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120);

const record = async ({ sourceType='app', sourceId, creatorId, event='open', actorId, name='' }) => {
  if (!sourceId || !creatorId || !actorId || actorId !== uid()) return false;
  const collectionRef = sourceType === 'bot' ? botRef(creatorId) : creatorRef(creatorId);
  const summaryRef = doc(collectionRef, clean(sourceId));
  const userRef = doc(summaryRef, 'users', clean(actorId));
  await runTransaction(db, async transaction => {
    const summarySnap = await transaction.get(summaryRef);
    const userSnap = await transaction.get(userRef);
    const existing = summarySnap.exists() ? summarySnap.data() : {};
    const field = event === 'action' ? 'actions' :
      event === 'share' ? 'shares' :
      event === 'session' ? 'sessions' : 'opens';
    const update = {
      creatorId,
      sourceId,
      sourceType,
      name: String(name || '').slice(0, 100),
      [field]: increment(1),
      updatedAt: serverTimestamp(),
    };
    if (!userSnap.exists()) {
      update.uniqueUsers = increment(1);
      transaction.set(userRef, { actorId, firstSeenAt: serverTimestamp(), lastSeenAt: serverTimestamp() });
    } else {
      transaction.update(userRef, { lastSeenAt: serverTimestamp() });
    }
    transaction.set(summaryRef, update, { merge: true });
  });
  return true;
};

const recordAppEvent = (app, event='open') => {
  const creatorId = app?.creatorId;
  const sourceId = app?.id || app?.sourceId;
  if (!creatorId || !sourceId) return Promise.resolve(false);
  return record({ sourceType:'app', sourceId, creatorId, event, actorId:uid(), name:app?.name || app?.title || 'Nax App' }).catch(() => false);
};

const recordBotEvent = (bot, event='session') => {
  const creatorId = bot?.developerId || bot?.ownerId || bot?.creatorId;
  if (!creatorId || !bot?.id) return Promise.resolve(false);
  return record({ sourceType:'bot', sourceId:bot.id, creatorId, event, actorId:uid(), name:bot?.name || 'Bot' }).catch(() => false);
};

const getCreatorAnalytics = async creatorId => {
  const id = creatorId || uid();
  if (!id || id !== uid()) throw new Error('Creator authentication required.');
  const [appsSnap, botsSnap, createdAppsSnap, createdBotsSnap] = await Promise.all([
    getDocs(creatorRef(id)),
    getDocs(botRef(id)),
    getDocs(query(collection(db, 'nax_apps'), where('creatorId', '==', id))),
    getDocs(query(collection(db, 'bots'), where('developerId', '==', id))),
  ]);
  const appAnalytics = Object.fromEntries(appsSnap.docs.map(d => [d.id, { id:d.id, ...d.data(), sourceType:'app' }]));
  const botAnalytics = Object.fromEntries(botsSnap.docs.map(d => [d.id, { id:d.id, ...d.data(), sourceType:'bot' }]));
  const apps = createdAppsSnap.docs.map(d => ({ ...(appAnalytics[d.id] || {}), id:d.id, name:d.data().name || d.data().title || 'Nax App', creatorId:id, sourceType:'app' }));
  const bots = createdBotsSnap.docs.map(d => ({ ...(botAnalytics[d.id] || {}), id:d.id, name:d.data().name || 'Bot', developerId:id, sourceType:'bot' }));
  const all = [...apps, ...bots];
  const total = key => all.reduce((sum,item) => sum + Number(item[key] || 0), 0);
  return {
    creatorId:id,
    apps,
    bots,
    totals:{ assets:all.length, apps:apps.length, bots:bots.length, opens:total('opens'), sessions:total('sessions'), actions:total('actions'), shares:total('shares'), uniqueUsers:total('uniqueUsers') },
  };
};

export const CreatorAnalyticsAPI = { recordAppEvent, recordBotEvent, getCreatorAnalytics };
export default CreatorAnalyticsAPI;