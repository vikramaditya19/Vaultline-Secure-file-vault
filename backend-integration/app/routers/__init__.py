# Routers package
# Makes it easy to import all routers at once

from . import auth
from . import files
from . import sharing

__all__ = ["auth", "files", "sharing"]
