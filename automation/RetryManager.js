export async function withRetry(task, { retries=3, delayMs=500 }={}) {
  let lastError;
  for(let attempt=0; attempt<=retries; attempt++){
    try { return await task(attempt); } catch(e){ lastError=e; if(attempt<retries) await new Promise(r=>setTimeout(r,delayMs*Math.pow(2,attempt))); }
  }
  throw lastError;
}
export default withRetry;