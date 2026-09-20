package com.hyperdrop

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URLEncoder
import java.net.URL
import java.util.Locale
import kotlin.math.abs

class CognitiveEngine(context: Context) {
    private val prefs = context.getSharedPreferences("hyperdrop_brain", Context.MODE_PRIVATE)

    fun think(input: String): CognitiveResult {
        val goal = input.trim()
        if (goal.isBlank()) return CognitiveResult("बताओ भाई, क्या करना है?", listOf("Understand: empty goal"))
        val steps = mutableListOf("Understand: goal received")
        val key = normalize(goal)
        val remembered = prefs.getString("memory:" + key, null)
        if (!remembered.isNullOrBlank()) {
            steps += "Memory: matching lesson found"
            steps += "Verify: reused stored result"
            return CognitiveResult(remembered, steps, "local memory", true)
        }

        val math = solveMath(goal)
        if (math != null) {
            steps += "Knowledge: deterministic calculation"
            steps += "Verify: calculation completed"
            remember(key, math)
            steps += "Memory: lesson stored"
            return CognitiveResult(math, steps, "local reasoning")
        }

        val lower = goal.lowercase(Locale.ROOT)
        if (lower in setOf("hi", "hello", "hey", "namaste", "नमस्ते")) {
            steps += "Knowledge: conversation intent recognized"
            return CognitiveResult("नमस्ते भाई 👋 मैं Hyperdrop हूँ। अपना goal दो।", steps, "local cognition")
        }

        steps += "Knowledge: no trusted local answer"
        steps += "Research: public web lookup"
        val researched = researchWikipedia(goal)
        if (researched != null) {
            steps += "Verify: source result received"
            val answer = researched.first + ": " + stripHtml(researched.second)
            remember(key, answer)
            steps += "Memory: researched lesson stored"
            return CognitiveResult(answer, steps, "Wikipedia public API")
        }

        steps += "Research: no usable result"
        return CognitiveResult("मुझे अभी भरोसेमंद जानकारी नहीं मिली।", steps, "no verified source")
    }

    private fun solveMath(input: String): String? {
        val expression = input.replace(" ", "").replace("×", "*").replace("÷", "/")
        if (!expression.matches(Regex("""[-+]?\d+(\.\d+)?([+*/][-+]?\d+(\.\d+)?)+"""))) return null
        return try {
            val tokens = Regex("""[+-]?\d+(?:\.\d+)?|[*/]""").findAll(expression).map { it.value }.toList()
            if (tokens.size < 3) return null
            var value = tokens[0].toDouble()
            var i = 1
            while (i < tokens.size) {
                val n = tokens[i + 1].toDouble()
                value = when (tokens[i]) {
                    "+" -> value + n
                    "-" -> value - n
                    "*" -> value * n
                    "/" -> if (abs(n) < 1e-12) return null else value / n
                    else -> return null
                }
                i += 2
            }
            "उत्तर: " + if (value % 1.0 == 0.0) value.toLong() else value
        } catch (_: Exception) {
            null
        }
    }

    private fun researchWikipedia(query: String): Pair<String, String>? {
        return try {
            val encoded = URLEncoder.encode(query, "UTF-8")
            val url = URL("https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encoded + "&format=json&utf8=1&srlimit=1")
            val connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            connection.connectTimeout = 7000
            connection.readTimeout = 7000
            connection.setRequestProperty("User-Agent", "Hyperdrop/0.4 (Android)")
            connection.connect()
            if (connection.responseCode !in 200..299) {
                connection.disconnect()
                return null
            }
            val body = connection.inputStream.bufferedReader().use { it.readText() }
            connection.disconnect()
            val search = JSONObject(body).getJSONObject("query").getJSONArray("search")
            if (search.length() == 0) return null
            val item = search.getJSONObject(0)
            item.getString("title") to item.getString("snippet")
        } catch (_: Exception) {
            null
        }
    }

    private fun stripHtml(text: String): String {
        return text.replace(Regex("<[^>]*>"), "")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&amp;", "&")
            .trim()
    }

    private fun normalize(text: String): String {
        return text.lowercase(Locale.ROOT)
            .replace(Regex("\\s+"), " ")
            .trim()
            .take(180)
    }

    private fun remember(key: String, answer: String) {
        prefs.edit().putString("memory:" + key, answer).apply()
    }
}
