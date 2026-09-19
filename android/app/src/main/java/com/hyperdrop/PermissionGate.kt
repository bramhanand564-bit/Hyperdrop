package com.hyperdrop

class PermissionGate {
    fun requiresConfirmation(tool: String): Boolean =
        tool in setOf("browser_login","upload","download","send_message","purchase","delete")
}
