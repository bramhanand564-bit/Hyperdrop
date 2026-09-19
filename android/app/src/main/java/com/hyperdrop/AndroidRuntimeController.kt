package com.hyperdrop

class AndroidRuntimeController(private val serviceIntentName: String = "com.hyperdrop.HyperdropForegroundService") {
    fun runtimeServiceName(): String = serviceIntentName
    fun killRuntime(): String = "kill_runtime"
}
