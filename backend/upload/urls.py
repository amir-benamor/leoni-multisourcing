from django.urls import path
from .views import (
    FileCleanStartView, 
    FileCleanStatusView,
    FileCleanCancelView,  # ← Ajouter
    FileImportStartView, 
    FileImportStatusView
)

urlpatterns = [
    # Nettoyage asynchrone
    path('clean/start/', FileCleanStartView.as_view(), name='clean-start'),
    path('clean/status/<str:task_id>/', FileCleanStatusView.as_view(), name='clean-status'),
    path('clean/cancel/<str:task_id>/', FileCleanCancelView.as_view(), name='clean-cancel'),  # ← Nouvelle route
    
    # Import asynchrone
    path('import/start/', FileImportStartView.as_view(), name='import-start'),
    path('import/status/<str:task_id>/', FileImportStatusView.as_view(), name='import-status'),
]