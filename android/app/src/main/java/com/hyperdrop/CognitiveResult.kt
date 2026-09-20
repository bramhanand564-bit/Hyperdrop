package com.hyperdrop

data class CognitiveResult(
    val answer: String,
    val steps: List<String>,
    val source: String = "",
    val remembered: Boolean = false
)
