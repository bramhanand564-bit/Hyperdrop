import EventBus from '../event-bus/EventBus';
import WorkflowRunner from './WorkflowRunner';
import ExecutionLogger from './ExecutionLogger';
export class TriggerManager {
  constructor(){ this.unsubscribers=[]; }
  register(workflow){
    const eventType=workflow?.trigger?.event;
    if(!eventType) return ()=>{};
    const unsubscribe=EventBus.on(eventType, async payload=>{
      const started=Date.now();
      try { const result=await WorkflowRunner.run(workflow,payload); await ExecutionLogger.log({workflowId:workflow.id||null,ownerId:workflow.ownerId||null,eventType,result,status:result?.success?'succeeded':(result?.skipped?'skipped':'completed'),durationMs:Date.now()-started}); }
      catch(error){ await ExecutionLogger.log({workflowId:workflow.id||null,eventType,status:'failed',error:error?.message,durationMs:Date.now()-started}); }
    });
    this.unsubscribers.push(unsubscribe);
    return unsubscribe;
  }
  stopAll(){ this.unsubscribers.forEach(u=>u()); this.unsubscribers=[]; }
}
export default TriggerManager;