# Hyperdrop Android Runtime — V0.2

This is the thin Android shell around Hyperdrop Core.

Responsibilities:
- task lifecycle and progress UI
- foreground/background worker integration
- permission and confirmation UI
- secure secret handoff
- notifications
- kill switch
- connection to the core runtime

The Android app does not become the reasoning engine. Core intelligence remains behind the runtime bridge.
