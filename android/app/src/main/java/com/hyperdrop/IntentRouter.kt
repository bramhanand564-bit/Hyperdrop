package com.hyperdrop

object IntentRouter {
    fun classify(query: String): String {
        val q = normalize(query)
        if (isGreeting(q)) return "GREETING"
        if (isIdentity(q)) return "IDENTITY"
        if (isCapabilities(q)) return "CAPABILITIES"
        if (isSmallTalk(q)) return "SMALL_TALK"
        return "GENERAL"
    }

    private fun normalize(query: String): String =
        query.lowercase()
            .replace(Regex("[^\\p{L}\\p{N}\\s]"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()

    private fun isGreeting(q: String): Boolean =
        q in setOf("hi", "hello", "hey", "namaste", "नमस्ते") ||
            q.startsWith("hello ") || q.startsWith("hi ") || q.startsWith("hey ")

    private fun isIdentity(q: String): Boolean =
        listOf(
            "who are you", "what is your name", "what your name", "your name",
            "tum kaun", "tum kon", "tum kon ho", "tum kaun ho",
            "aap kaun", "aap kon", "aap kon ho",
            "naam kya", "tumhara naam", "tumahara naam", "tumhara name",
            "tumahara name"
        ).any { q.contains(it) }

    private fun isCapabilities(q: String): Boolean =
        listOf(
            "what can you do", "what do you do", "what can u do",
            "show me some example", "show me examples", "give me examples",
            "examples of what you can do", "kya kya kar sakte",
            "kya kar sakte ho", "kya karte ho", "capabilities",
            "tum kya kar sakte", "kya kya karte ho"
        ).any { q.contains(it) }

    private fun isSmallTalk(q: String): Boolean =
        listOf(
            "kya haal", "kya hal", "kaise ho", "kaisa ho", "how are you",
            "how r you", "how r u", "haal kya", "sab theek", "sab thik"
        ).any { q.contains(it) }
}