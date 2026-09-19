# Android Bridge Contract

The Android layer remains thin and never owns intelligence.

Commands: start_task, pause_task, resume_task, stop_task, get_task_status, grant_permission, revoke_permission, kill_runtime.

Events: task_progress, task_completed, task_failed, permission_required, handoff_required, runtime_state_changed.

Sensitive permissions must never be granted silently.