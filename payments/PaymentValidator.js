export const PaymentValidator={
  validateCreate({amount,currency='NAX',idempotencyKey}={}){
    const errors=[];
    if(!Number.isFinite(Number(amount))||Number(amount)<=0) errors.push('Amount must be greater than zero.');
    if(!idempotencyKey) errors.push('Idempotency key is required.');
    if(!/^[A-Z]{3,8}$/.test(currency)) errors.push('Invalid currency.');
    return {valid:errors.length===0,errors};
  }
};
export default PaymentValidator;