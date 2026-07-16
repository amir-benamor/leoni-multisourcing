# authentication/urls.py

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from django.http import JsonResponse
from .views import (
    RegisterView, LoginView, LogoutView, 
    UserProfileView, UpdateProfileView, UpdatePreferencesView,
    ChangePasswordView, UserInfoView,
    AdminDashboardStatsView, PendingUsersView, AllUsersListView,
    ApproveUserView, RejectUserView, UpdateUserRoleView, ToggleUserActiveView,
    AuditLogListView,
)

# Vue pour la racine de l'API
def api_root(request):
    return JsonResponse({
        'message': 'API Authentication Service',
        'version': '1.0',
        'endpoints': {
            'auth': {
                'register': '/api/auth/register/',
                'login': '/api/auth/login/',
                'logout': '/api/auth/logout/',
                'refresh': '/api/auth/token/refresh/',
            },
            'profile': {
                'profile': '/api/auth/profile/',
                'update': '/api/auth/profile/update/',
                'preferences': '/api/auth/preferences/update/',
                'change_password': '/api/auth/change-password/',
                'info': '/api/auth/info/',
            },
            'admin': {
                'stats': '/api/auth/admin/stats/',
                'pending_users': '/api/auth/admin/pending-users/',
                'users': '/api/auth/admin/users/',
                'audit_logs': '/api/auth/admin/audit-logs/',
            }
        }
    })

urlpatterns = [
    # Racine de l'API
    path('', api_root, name='api_root'),
    
    # Authentication endpoints
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Profile endpoints
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('profile/update/', UpdateProfileView.as_view(), name='update_profile'),
    path('preferences/update/', UpdatePreferencesView.as_view(), name='update_preferences'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('info/', UserInfoView.as_view(), name='user_info'),
    
    # Admin endpoints
    path('admin/stats/', AdminDashboardStatsView.as_view(), name='admin_stats'),
    path('admin/pending-users/', PendingUsersView.as_view(), name='pending_users'),
    path('admin/users/', AllUsersListView.as_view(), name='all_users'),
    path('admin/users/<int:user_id>/approve/', ApproveUserView.as_view(), name='approve_user'),
    path('admin/users/<int:user_id>/reject/', RejectUserView.as_view(), name='reject_user'),
    path('admin/users/<int:user_id>/role/', UpdateUserRoleView.as_view(), name='update_user_role'),
    path('admin/users/<int:user_id>/toggle-active/', ToggleUserActiveView.as_view(), name='toggle_user_active'),
    
    # Audit Log
    path('admin/audit-logs/', AuditLogListView.as_view(), name='admin_audit_logs'),
]