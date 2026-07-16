from django.urls import path
from .views import PartAlternativeView

urlpatterns = [
    path('ms/<str:ms_number>/', PartAlternativeView.as_view(), name='ms-alternative'),
]