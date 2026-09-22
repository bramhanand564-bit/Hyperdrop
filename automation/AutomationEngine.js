import TriggerManager from './TriggerManager';
export class AutomationEngine {
  constructor(){ this.triggerManager=new TriggerManager(); }
  registerWorkflow(workflow){ return this.triggerManager.register(workflow); }
  registerWorkflows(workflows=[]){ return workflows.map(w=>this.registerWorkflow(w)); }
  stop(){ this.triggerManager.stopAll(); }
}
export default AutomationEngine;