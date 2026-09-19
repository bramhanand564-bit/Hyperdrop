package com.hyperdrop

data class TaskState(
    val taskId: String,
    val state: String,
    val progress: Float,
    val message: String = ""
)
