const memoryVault = new Map();
export const CredentialVault = {
  set(key,value){ if(!key) throw new Error('Credential key required'); memoryVault.set(key,value); },
  get(key){ return memoryVault.get(key); },
  delete(key){ return memoryVault.delete(key); },
  clear(){ memoryVault.clear(); }
};
export default CredentialVault;