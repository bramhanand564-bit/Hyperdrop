package com.hyperdrop

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.*
import java.util.concurrent.Executors

class MainActivity : Activity() {
    private val executor = Executors.newSingleThreadExecutor()
    private lateinit var status: TextView
    private lateinit var steps: TextView
    private lateinit var answer: TextView
    private lateinit var source: TextView
    private lateinit var progress: ProgressBar
    private lateinit var input: EditText
    private lateinit var engine: CognitiveEngine
    private lateinit var controller: TaskController

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        engine = CognitiveEngine(this)
        controller = TaskController(this)
        buildUi()
    }

    private fun buildUi() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(28, 24, 28, 24)
            setBackgroundColor(Color.rgb(248, 249, 250))
        }
        val title = TextView(this).apply { text = "Hyperdrop"; textSize = 30f }
        val subtitle = TextView(this).apply {
            text = "Living Runtime • Think → Research → Verify → Learn"
            textSize = 14f
            setPadding(0, 2, 0, 18)
        }
        status = TextView(this).apply { text = "● READY  |  Brain online"; textSize = 15f; setPadding(0, 8, 0, 8) }
        input = EditText(this).apply {
            hint = "Ask Hyperdrop anything…"
            textSize = 17f
            minLines = 2
            maxLines = 4
            setPadding(20, 16, 20, 16)
        }
        val ask = Button(this).apply { text = "THINK & ANSWER"; setOnClickListener { runThought() } }
        progress = ProgressBar(this).apply { visibility = View.GONE }
        answer = TextView(this).apply { text = "Answer will appear here."; textSize = 18f; setPadding(18, 18, 18, 18) }
        steps = TextView(this).apply { text = "Cognition\n• Waiting for a goal"; textSize = 14f; setPadding(18, 12, 18, 12) }
        source = TextView(this).apply { text = "Source: —"; textSize = 13f; setPadding(18, 4, 18, 12) }
        val start = Button(this).apply {
            text = "START RUNTIME"
            setOnClickListener {
                controller.start("android-runtime", "Interactive Hyperdrop session")
                status.text = "● RUNNING  |  Persistent runtime active"
            }
        }
        val kill = Button(this).apply {
            text = "KILL RUNTIME"
            setOnClickListener {
                controller.stop("android-runtime")
                RuntimeBridge(this@MainActivity).killRuntime()
                status.text = "● STOPPED  |  Runtime stopped"
            }
        }
        root.addView(title)
        root.addView(subtitle)
        root.addView(status)
        root.addView(input)
        root.addView(ask)
        root.addView(progress)
        root.addView(answer)
        root.addView(steps)
        root.addView(source)
        root.addView(start)
        root.addView(kill)
        setContentView(ScrollView(this).apply { addView(root) })
    }

    private fun runThought() {
        val goal = input.text.toString().trim()
        if (goal.isBlank()) {
            answer.text = "पहले अपना सवाल या goal लिखो भाई।"
            return
        }
        progress.visibility = View.VISIBLE
        status.text = "● THINKING  |  Understanding goal…"
        answer.text = "सोच रहा हूँ…"
        steps.text = "Cognition\n• Understand: starting"
        source.text = "Source: local knowledge / public research"
        executor.execute {
            val result = engine.think(goal)
            runOnUiThread {
                progress.visibility = View.GONE
                status.text = "● ANSWERED  |  " + if (result.remembered) "Memory reused" else "New reasoning"
                answer.text = result.answer
                steps.text = "Cognition\n" + result.steps.joinToString("\n") { "• " + it }
                source.text = "Source: " + result.source
            }
        }
    }

    override fun onDestroy() {
        executor.shutdownNow()
        super.onDestroy()
    }
}
