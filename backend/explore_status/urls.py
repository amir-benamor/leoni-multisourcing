from django.urls import path
from .views import (
    GlobalFiltersView, ClassificationsView, 
    CoverageKpisView, MarketShareView, StatusMatrixView,ResultsView
)

urlpatterns = [
    path('filters/', GlobalFiltersView.as_view(), name='global-filters'),
    path('classifications/', ClassificationsView.as_view(), name='classifications'),
    path('status/coverage/', CoverageKpisView.as_view(), name='coverage-kpis'),
    path('status/market-share/', MarketShareView.as_view(), name='market-share'),
    path('status/matrix/', StatusMatrixView.as_view(), name='status-matrix'),
    path('status/results/', ResultsView.as_view(), name='results'),
]