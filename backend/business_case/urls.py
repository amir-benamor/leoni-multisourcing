from django.urls import path
from .views import BusinessCaseView, BusinessCaseRecommendView

urlpatterns = [
    path('ms/<str:ms_number>/', BusinessCaseView.as_view(), name='bc-load'),
    path('recommend/<str:ms_number>/', BusinessCaseRecommendView.as_view(), name='bc-recommend'),
]