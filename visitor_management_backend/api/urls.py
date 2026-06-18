from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VisitorViewSet, VisitorLogViewSet, verify_settings_pwd


router = DefaultRouter()
router.register(r'visitors', VisitorViewSet)
router.register(r'logs', VisitorLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('verify-settings-pwd/', verify_settings_pwd, name='verify_pwd'),
   
]