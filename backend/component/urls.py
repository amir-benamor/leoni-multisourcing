from django.urls import path
from .views import (
    M1PartDetailView, 
    M1PartUsageView, 
    M1PartTransportView, 
    M1PartsBatchView,
    M1MaterialGroupView,
    M2PartCommercialView,
    M2PartsBatchView,
    M2MaterialGroupView,
    M2SupplierView  
)

urlpatterns = [
    # Routes M1 (technique)
    path('m1/part/<str:leoni_part_number>/', M1PartDetailView.as_view(), name='m1-part-detail'),
    path('m1/part/<str:leoni_part_number>/usage/', M1PartUsageView.as_view(), name='m1-part-usage'),
    path('m1/part/<str:leoni_part_number>/transport/', M1PartTransportView.as_view(), name='m1-part-transport'),
    path('m1/parts/', M1PartsBatchView.as_view(), name='m1-parts-batch'),
    path('m1/material-group/<str:material_group>/', M1MaterialGroupView.as_view(), name='m1-material-group'),
    
    # Routes M2 (commercial)
    path('m2/part/<str:leoni_part_number>/', M2PartCommercialView.as_view(), name='m2-part-commercial'),
    path('m2/parts/', M2PartsBatchView.as_view(), name='m2-parts-batch'),  
    path('m2/material-group/<str:material_group>/', M2MaterialGroupView.as_view(), name='m2-material-group'),
    path('m2/supplier/<str:supplier_name>/', M2SupplierView.as_view(), name='m2-supplier'),

]