from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta
from .serializers import (
    UserSerializer, RegisterSerializer, LoginSerializer,
    UpdateProfileSerializer, UpdatePreferencesSerializer, ChangePasswordSerializer,
    AdminUserSerializer, AdminApproveUserSerializer, 
    AdminRejectUserSerializer, AdminUpdateUserRoleSerializer,
    AuditLogSerializer
)
from .models import AuditLog
from .utils import log_audit

User = get_user_model()


# ========== PERMISSION ADMIN ==========
class IsAdminUser(permissions.BasePermission):
    """Permission pour les administrateurs uniquement"""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'


# ========== VUES AUTHENTIFICATION ==========

class RegisterView(generics.CreateAPIView):
    """User registration view - attend l'approbation admin"""
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        return Response({
            'message': 'Votre compte a été créé. Un administrateur doit approuver votre demande avant de pouvoir vous connecter.',
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """User login view - vérifie si l'utilisateur est approuvé"""
    permission_classes = (permissions.AllowAny,)
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        refresh = RefreshToken.for_user(user)
        
        # Audit log
        log_audit(user, 'auth', 'Login successful', 'user', user.email, 'Info', request=request)
        
        return Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data,
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """User logout view"""
    permission_classes = (permissions.IsAuthenticated,)
    
    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            
            # Audit log
            log_audit(request.user, 'auth', 'Logout', 'user', request.user.email, 'Info', request=request)
            
            return Response({"message": "Logout successful"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(generics.RetrieveUpdateAPIView):
    """Get and update user profile"""
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)
    
    def get_object(self):
        return self.request.user


class UpdateProfileView(generics.UpdateAPIView):
    """Update user profile"""
    serializer_class = UpdateProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Audit log
        log_audit(request.user, 'auth', 'Profile updated', 'user', request.user.email, 'Info', request=request)
        
        return Response({
            'message': 'Profile updated successfully',
            'user': UserSerializer(instance).data
        })


class UpdatePreferencesView(generics.UpdateAPIView):
    """Update user preferences"""
    serializer_class = UpdatePreferencesSerializer
    permission_classes = (permissions.IsAuthenticated,)
    
    def get_object(self):
        return self.request.user
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'message': 'Preferences updated successfully',
            'user': UserSerializer(instance).data
        })


class ChangePasswordView(APIView):
    """Change user password"""
    permission_classes = (permissions.IsAuthenticated,)
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        new_password = serializer.validated_data['new_password']
        user.set_password(new_password)
        user.save()
        
        # Audit log
        log_audit(user, 'auth', 'Password changed', 'user', user.email, 'Warning', request=request)
        
        return Response({
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)


class UserInfoView(APIView):
    """Get user info including about data"""
    permission_classes = (permissions.IsAuthenticated,)
    
    def get(self, request):
        user = request.user
        return Response({
            'user': UserSerializer(user).data,
            'about': {
                'version': 'v0.1',
                'environment': 'Development',
                'build_info': '3/26/2026'
            }
        })


# ========== VUES ADMIN ==========

class AdminDashboardStatsView(APIView):
    """Statistiques pour le dashboard admin"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        now = timezone.now()
        last_month = now - timedelta(days=30)
        
        stats = {
            'total_users': User.objects.count(),
            'pending_approvals': User.objects.filter(is_approved=False, is_active=True).count(),
            'new_users_last_month': User.objects.filter(created_at__gte=last_month).count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'users_by_role': {
                'ROLE_1': User.objects.filter(role='ROLE_1').count(),
                'ROLE_2': User.objects.filter(role='ROLE_2').count(),
                'ROLE_3': User.objects.filter(role='ROLE_3').count(),
                'ADMIN': User.objects.filter(role='ADMIN').count(),
            },
            'users_by_department': list(
                User.objects.exclude(department__isnull=True)
                .values('department')
                .annotate(count=Count('id'))
                .order_by('-count')[:10]
            ),
        }
        return Response(stats)


class PendingUsersView(generics.ListAPIView):
    """Liste des utilisateurs en attente d'approbation"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminUserSerializer
    
    def get_queryset(self):
        return User.objects.filter(is_approved=False, is_active=True).order_by('-created_at')


class AllUsersListView(generics.ListAPIView):
    """Liste de tous les utilisateurs avec filtres"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    serializer_class = AdminUserSerializer
    
    def get_queryset(self):
        queryset = User.objects.all().order_by('-created_at')
        
        role = self.request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
        
        is_approved = self.request.query_params.get('is_approved')
        if is_approved is not None:
            queryset = queryset.filter(is_approved=is_approved.lower() == 'true')
        
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(username__icontains=search)
            )
        
        return queryset


class ApproveUserView(APIView):
    """Approuver un utilisateur et lui attribuer un rôle"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = AdminApproveUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        role = serializer.validated_data['role']
        admin_note = serializer.validated_data.get('admin_note', '')
        
        user.is_approved = True
        user.role = role
        user.save()
        
        # Audit log
        log_audit(request.user, 'admin', f'User approved: {user.email}', 'user', user.email, 'Warning', f'Role: {role}', request=request)
        
        return Response({
            'message': f'Utilisateur {user.email} approuvé avec succès',
            'user': AdminUserSerializer(user).data
        })


class RejectUserView(APIView):
    """Rejeter un utilisateur"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def delete(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = AdminRejectUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = user.email
        reason = serializer.validated_data['rejection_reason']
        user.delete()
        
        # Audit log
        log_audit(request.user, 'admin', f'User rejected: {email}', 'user', email, 'Critical', reason, request=request)
        
        return Response({'message': f'Demande de {email} rejetée et supprimée'})


class UpdateUserRoleView(APIView):
    """Modifier le rôle d'un utilisateur"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = AdminUpdateUserRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        new_role = serializer.validated_data['role']
        user.role = new_role
        user.save()
        
        # Audit log
        log_audit(request.user, 'admin', f'Role updated: {user.email}', 'user', user.email, 'Warning', f'New role: {new_role}', request=request)
        
        return Response({
            'message': f'Rôle de {user.email} mis à jour',
            'user': AdminUserSerializer(user).data
        })


class ToggleUserActiveView(APIView):
    """Activer/Désactiver un utilisateur"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def patch(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        if user.id == request.user.id:
            return Response({'error': 'Vous ne pouvez pas désactiver votre propre compte'}, status=status.HTTP_400_BAD_REQUEST)
        
        user.is_active = not user.is_active
        user.save()
        
        status_text = "activé" if user.is_active else "désactivé"
        
        # Audit log
        log_audit(request.user, 'admin', f'User {status_text}: {user.email}', 'user', user.email, 'Warning', request=request)
        
        return Response({
            'message': f'Utilisateur {user.email} {status_text}',
            'user': AdminUserSerializer(user).data
        })


# ========== AUDIT LOG ==========

class AuditLogListView(APIView):
    """Liste des logs d'audit pour l'admin"""
    permission_classes = [permissions.IsAuthenticated, IsAdminUser]
    
    def get(self, request):
        queryset = AuditLog.objects.select_related('user').order_by('-created_at')
        
        category = request.query_params.get('category')
        if category and category != 'all':
            queryset = queryset.filter(category=category)
        
        severity = request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)
        
        time_range = request.query_params.get('time_range')
        if time_range:
            now = timezone.now()
            if time_range == '24h':
                since = now - timedelta(hours=24)
            elif time_range == '7d':
                since = now - timedelta(days=7)
            elif time_range == '30d':
                since = now - timedelta(days=30)
            else:
                since = None
            
            if since:
                queryset = queryset.filter(created_at__gte=since)
        
        queryset = queryset[:100]
        serializer = AuditLogSerializer(queryset, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data
        })