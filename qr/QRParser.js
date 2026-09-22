export const QRParser={parse(value){
  const raw=String(value||'').trim();
  const match=raw.match(/^nax:\/\/(app|bot|pay|user|store)\/(.+)$/i);
  if(match) return {scheme:'nax',type:match[1].toLowerCase(),id:decodeURIComponent(match[2])};
  if(/^https:\/\//i.test(raw)) return {scheme:'https',type:'external',url:raw};
  return null;
}};
export default QRParser;