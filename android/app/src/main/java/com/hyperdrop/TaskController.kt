package com.hyperdrop

import android.content.Context

class TaskController(context: Context) {
    private val bridge = RuntimeBridge(context)
    private val store = TaskStore(context)

    fun start(taskId: String, goal: String): TaskState {
        val state = TaskState(taskId, "queued", 0f, goal)
        store.save(state)
        bridge.startTask(taskId)
        return state
    }

    fun pause(taskId: String): TaskState = transition(taskId, "paused") { bridge.pauseTask(taskId) }
    fun resume(taskId: String): TaskState = transition(taskId, "running") { bridge.resumeTask(taskId) }
    fun stop(taskId: String): TaskState = transition(taskId, "stopped") { bridge.stopTask(taskId) }
    fun load(taskId: String): TaskState? = store.load(taskId)

    private fun transition(taskId: String, state: String, command: () -> String): TaskState {
        val current = store.load(taskId) ?: TaskState(taskId, state, 0f)
        val next = current.copy(state = state, message = command())
        store.save(next)
        return next
    }
}
