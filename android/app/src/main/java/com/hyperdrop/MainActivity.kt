package com.hyperdrop

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val bridge = RuntimeBridge(this)
        val status = TextView(this).apply { text = "Hyperdrop\nRuntime ready"; textSize = 22f }
        val start = Button(this).apply { text = "Start runtime"; setOnClickListener { bridge.startTask("android-runtime"); status.text = "Hyperdrop\nRuntime running" } }
        val kill = Button(this).apply { text = "Kill runtime"; setOnClickListener { bridge.killRuntime(); status.text = "Hyperdrop\nRuntime stopped" } }
        setContentView(LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding(32,32,32,32); addView(status); addView(start); addView(kill) })
    }
}
