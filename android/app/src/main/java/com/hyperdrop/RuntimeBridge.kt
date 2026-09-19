package com.hyperdrop

class RuntimeBridge {
    fun startTask(goal: String): String = "start_task:$goal"
    fun pauseTask(taskId: String): String = "pause_task:$taskId"
    fun resumeTask(taskId: String): String = "resume_task:$taskId"
    fun stopTask(taskId: String): String = "stop_task:$taskId"
    fun status(taskId: String): String = "get_task_status:$taskId"
    fun killRuntime(): String = "kill_runtime"
}
