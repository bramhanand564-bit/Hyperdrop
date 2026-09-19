package com.hyperdrop

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder

class HyperdropForegroundService : Service() {
    companion object {
        const val ACTION_START = "com.hyperdrop.action.START"
        const val ACTION_PAUSE = "com.hyperdrop.action.PAUSE"
        const val ACTION_RESUME = "com.hyperdrop.action.RESUME"
        const val ACTION_STOP = "com.hyperdrop.action.STOP"
        const val ACTION_KILL = "com.hyperdrop.action.KILL"
        const val EXTRA_TASK_ID = "task_id"
        private const val CHANNEL_ID = "hyperdrop_runtime"
        private const val NOTIFICATION_ID = 1001
    }

    override fun onCreate() {
        super.onCreate()
        createChannel()
        startForeground(NOTIFICATION_ID, notification("Runtime active"))
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val taskId = intent?.getStringExtra(EXTRA_TASK_ID).orEmpty()
        when (intent?.action) {
            ACTION_START -> RuntimeState.start(taskId)
            ACTION_PAUSE -> RuntimeState.pause(taskId)
            ACTION_RESUME -> RuntimeState.resume(taskId)
            ACTION_STOP -> RuntimeState.stop(taskId)
            ACTION_KILL -> { RuntimeState.kill(); stopForeground(STOP_FOREGROUND_REMOVE); stopSelf() }
        }
        if (intent?.action != ACTION_KILL) {
            getSystemService(NotificationManager::class.java).notify(NOTIFICATION_ID, notification(RuntimeState.summary()))
        }
        return START_STICKY
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(CHANNEL_ID, "Hyperdrop Runtime", NotificationManager.IMPORTANCE_LOW)
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun notification(text: String): Notification {
        val launch = PendingIntent.getActivity(this, 0, Intent(this, MainActivity::class.java), pendingFlags())
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("Hyperdrop")
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_popup_sync)
            .setContentIntent(launch)
            .setOngoing(true)
            .build()
    }

    private fun pendingFlags(): Int = PendingIntent.FLAG_UPDATE_CURRENT or
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0

    override fun onBind(intent: Intent?): IBinder? = null
}

private object RuntimeState {
    private var state = "idle"
    private var taskId = ""
    fun start(id: String) { taskId=id; state="running" }
    fun pause(id: String) { taskId=id; state="paused" }
    fun resume(id: String) { taskId=id; state="running" }
    fun stop(id: String) { taskId=id; state="stopped" }
    fun kill() { taskId=""; state="killed" }
    fun summary(): String = if (taskId.isBlank()) "Runtime " + state else state + ": " + taskId
}
