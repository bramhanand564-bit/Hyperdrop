package com.hyperdrop

import android.content.Context

data class TaskState(
    val taskId: String,
    val state: String,
    val progress: Float,
    val message: String = ""
)

class TaskStore(context: Context) {
    private val prefs = context.getSharedPreferences("hyperdrop_tasks", Context.MODE_PRIVATE)

    fun save(state: TaskState) {
        prefs.edit()
            .putString(state.taskId + ".state", state.state)
            .putFloat(state.taskId + ".progress", state.progress)
            .putString(state.taskId + ".message", state.message)
            .apply()
    }

    fun load(taskId: String): TaskState? {
        val key = taskId + ".state"
        if (!prefs.contains(key)) return null
        return TaskState(
            taskId,
            prefs.getString(key, "unknown") ?: "unknown",
            prefs.getFloat(taskId + ".progress", 0f),
            prefs.getString(taskId + ".message", "") ?: ""
        )
    }
}
