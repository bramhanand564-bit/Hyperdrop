package com.hyperdrop

class TaskController(private val bridge: RuntimeBridge = RuntimeBridge()) {
    fun start(taskId: String, goal: String): TaskState =
        TaskState(taskId, "queued", 0f, bridge.startTask(goal))

    fun pause(taskId: String): TaskState =
        TaskState(taskId, "paused", 0f, bridge.pauseTask(taskId))

    fun resume(taskId: String): TaskState =
        TaskState(taskId, "running", 0f, bridge.resumeTask(taskId))

    fun stop(taskId: String): TaskState =
        TaskState(taskId, "stopped", 0f, bridge.stopTask(taskId))
}
