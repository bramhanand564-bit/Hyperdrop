package com.hyperdrop

object IntentRouter {
    fun classify(query: String): String {
        val q = query.lowercase().trim().replace(Regex("\\s+"), " ")
        if (q in setOf("hi", "hello", "hey", "namaste", "नमस्ते") || q.startsWith("hello ") || q.startsWith("hi ")) return "GREETING"
        if (listOf("what your name", "what is your name", "who are you", "your name", "tumhara naam", "tum kaun", "aap kaun", "naam kya").any { q.contains(it) }) return "IDENTITY"
        if (listOf("what can you do", "what do you do", "kya kya kar sakte", "kya kar sakte ho", "kya karte ho", "capabilities", "tum kya kar sakte").any { q.contains(it) }) return "CAPABILITIES"
        return "GENERAL"
    }
}