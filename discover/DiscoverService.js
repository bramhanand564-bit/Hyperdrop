import { db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

function distanceKm(a,b){
  const R=6371, toRad=v=>v*Math.PI/180;
  const dLat=toRad((b.lat||0)-(a.lat||0)), dLon=toRad((b.lng||b.lon||0)-(a.lng||a.lon||0));
  const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat||0))*Math.cos(toRad(b.lat||0))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
export const DiscoverService={
  async nearby({lat,lng,radiusKm=10}={}){
    if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lng))) throw new Error('Location is required.');
    const snap=await getDocs(collection(db,'discover_registry'));
    return snap.docs.map(d=>({id:d.id,...d.data()})).filter(item=>{
      if(!Number.isFinite(Number(item.lat))||!Number.isFinite(Number(item.lng))) return false;
      return distanceKm({lat,lng},{lat:item.lat,lng:item.lng})<=radiusKm;
    }).map(item=>({...item,distanceKm:distanceKm({lat,lng},{lat:item.lat,lng:item.lng})})).sort((a,b)=>a.distanceKm-b.distanceKm);
  },
  distanceKm
};
export default DiscoverService;