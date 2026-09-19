package com.hyperdrop

import android.app.Service
import android.content.Intent
import android.os.IBinder

class HyperdropForegroundService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Real persistent worker orchestration will be attached through the bridge.
        return START_STICKY
    }
}
