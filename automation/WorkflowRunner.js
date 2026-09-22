import ConditionEngine from './ConditionEngine';
import ActionManager from './ActionManager';
import { withRetry } from './RetryManager';
export const WorkflowRunner = {
  async run(workflow, context={}) {
    if(workflow?.enabled === false) return { skipped:true };
    if(!ConditionEngine.evaluate(workflow?.condition,context)) return { skipped:true, reason:'condition_failed' };
    await withRetry(()=>ActionManager.executeAll(workflow?.actions||[],context), { retries: workflow?.retries ?? 2 });
    return { success:true };
  }
};
export default WorkflowRunner;