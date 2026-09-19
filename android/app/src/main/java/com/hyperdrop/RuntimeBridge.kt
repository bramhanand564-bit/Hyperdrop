package com.hyperdrop

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class RuntimeBridge(private val context: Context? = null) {
    fun startTask(taskId: String): String = command(HyperdropForegroundService.ACTION_START, taskId)
    fun pauseTask(taskId: String): String = command(HyperdropForegroundService.ACTION_PAUSE, taskId)
    fun resumeTask(taskId: String): String = command(HyperdropForegroundService.ACTION_RESUME, taskId)
    fun stopTask(taskId: String): String = command(HyperdropForegroundService.ACTION_STOP, taskId)
    fun status(taskId: String): String = "get_task_status:" + taskId
    fun killRuntime(): String {
        context?.startService(Intent(context, HyperdropForegroundService::class.java).setAction(HyperdropForegroundService.ACTION_KILL))
        return "kill_runtime"
    }
    private fun command(action: String, id: String): String {
        context?.let {
            val intent = Intent(it, HyperdropForegroundService::class.java).setAction(action)
                .putExtra(HyperdropForegroundService.EXTRA_TASK_ID, id)
            ContextCompat.startForegroundService(it, intent)
        }
        return action + ":" + id
    }
}
