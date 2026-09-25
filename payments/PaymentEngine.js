import PaymentValidator from './PaymentValidator';
import TransactionService from './TransactionService';
import AuditLogger from '../security/AuditLogger';
export const PaymentEngine={
  async createPayment(input){
    const validation=PaymentValidator.validateCreate(input);
    if(!validation.valid) throw new Error(validation.errors.join(' '));
    await AuditLogger.log('payment.create',{userId:input.userId,source:input.source,amount:input.amount});
    return TransactionService.create(input);
  },
  async markSucceeded(transactionId,details={}){ await AuditLogger.log('payment.succeeded',{transactionId}); return TransactionService.setStatus(transactionId,'succeeded',details); },
  async markFailed(transactionId,details={}){ await AuditLogger.log('payment.failed',{transactionId}); return TransactionService.setStatus(transactionId,'failed',details); },
  async transferTokens(input){ const result=await TransactionService.transferTokens(input); await AuditLogger.log('payment.transfer',input); return result; },
  async requestWithdrawal(input){ const result=await TransactionService.requestWithdrawal(input); await AuditLogger.log('withdrawal.requested',{userId:input?.userId,amount:input?.amount}); return result; }
};
export default PaymentEngine;