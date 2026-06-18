"""
ASGI config for core project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
# 🆕 Unga app name 'api' nu assume pandren, illana unga app name-ah mathunga
import api.routing 

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

# Intha application thaan HTTP and WebSocket rendu vishayathaiyum handle pannum
application = ProtocolTypeRouter({
    # Normal HTTP requests (REST API)
    "http": get_asgi_application(),
    
    # WebSocket requests (Real-time updates)
    "websocket": AuthMiddlewareStack(
        URLRouter(
            api.routing.websocket_urlpatterns
        )
    ),
})