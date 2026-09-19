"""Central execution policy for confirmation, credentials and dry-run boundaries."""
from core.agent.credential_boundary import reject_inline_secret
from core.agent.permissions_v2 import decide

def authorize(tool: str, arguments: dict, granted: bool, confirmed: bool=False):
    reject_inline_secret(arguments)
    return decide(tool, granted, confirmed)
