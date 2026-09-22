const buckets=new Map();
export const RateLimiter={
  allow(key,{limit=30,windowMs=60000}={}){
    const now=Date.now(); const current=buckets.get(key)||{start:now,count:0};
    if(now-current.start>=windowMs){ current.start=now; current.count=0; }
    current.count+=1; buckets.set(key,current); return current.count<=limit;
  },
  reset(key){ buckets.delete(key); }
};
export default RateLimiter;