export const ConditionEngine = {
  evaluate(condition, context={}) {
    if(!condition) return true;
    if(Array.isArray(condition.all)) return condition.all.every(c=>ConditionEngine.evaluate(c,context));
    if(Array.isArray(condition.any)) return condition.any.some(c=>ConditionEngine.evaluate(c,context));
    const value = condition.path ? condition.path.split('.').reduce((a,k)=>a?.[k],context) : undefined;
    switch(condition.operator){
      case 'eq': return value === condition.value;
      case 'neq': return value !== condition.value;
      case 'gt': return Number(value) > Number(condition.value);
      case 'gte': return Number(value) >= Number(condition.value);
      case 'lt': return Number(value) < Number(condition.value);
      case 'lte': return Number(value) <= Number(condition.value);
      case 'contains': return String(value ?? '').includes(String(condition.value ?? ''));
      default: return false;
    }
  }
};
export default ConditionEngine;