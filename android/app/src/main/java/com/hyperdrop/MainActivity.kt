package com.hyperdrop

import android.app.Activity
import android.os.Bundle
import android.widget.TextView

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val status = TextView(this)
        status.text = "Hyperdrop\nRuntime ready"
        status.textSize = 22f
        setContentView(status)
    }
}
