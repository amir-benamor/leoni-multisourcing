from django.urls import path
from .views import (
    ImportHistoryListView,
    ImportHistoryDetailView,
    BusinessCaseHistoryView,
    BusinessCaseSaveView,
    BusinessCaseDetailView,
)

urlpatterns = [
    path('imports/', ImportHistoryListView.as_view(), name='history-imports'),
    path('imports/<int:history_id>/', ImportHistoryDetailView.as_view(), name='history-import-detail'),
    path('business-cases/', BusinessCaseHistoryView.as_view(), name='history-business-cases'),
    path('business-cases/save/', BusinessCaseSaveView.as_view(), name='history-business-case-save'),
    path('business-cases/<int:bc_id>/', BusinessCaseDetailView.as_view(), name='history-business-case-detail'),
]