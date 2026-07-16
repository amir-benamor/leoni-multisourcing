from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Admin Django (désactivé car vous avez votre propre interface admin)
    # path('admin/', admin.site.urls),
    
    # API Authentication (login, register, profile, etc.)
    path('api/auth/', include('authentication.urls')),
    path('api/upload/', include('upload.urls')),
    path('api/history/', include('historique.urls')),
    path('api/', include('component.urls')),
    path('api/explore/', include('explore_status.urls')),
    path('api/alternative/', include('alternative.urls')),
    path('api/business-case/', include('business_case.urls')),
    path('api/dashboard/', include('dashboard.urls')),
]

# Serve media files in development (fichiers uploadés)
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)