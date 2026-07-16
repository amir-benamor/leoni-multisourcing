from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, AuditLog
import re
import time

class UserSerializer(serializers.ModelSerializer):
    """Basic user serializer"""
    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'department', 'site', 'role', 'role_display', 'bio', 'is_approved',
            'theme', 'remember_last_scope',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'email', 'username', 'created_at', 'updated_at', 'is_approved']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    department = serializers.CharField(required=False, allow_blank=True)
    site = serializers.CharField(required=False, allow_blank=True)
    bio = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'department', 'site', 'bio']
    
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            if value is not None:
                setattr(instance, attr, value)
        instance.save()
        return instance


class UpdatePreferencesSerializer(serializers.ModelSerializer):
    """Serializer for updating user preferences"""
    theme = serializers.CharField(required=False)
    remember_last_scope = serializers.BooleanField(required=False)
    
    class Meta:
        model = User
        fields = ['theme', 'remember_last_scope']
    
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change"""
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "New passwords do not match."})
        return attrs
    
    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value


class RegisterSerializer(serializers.ModelSerializer):
    """Registration serializer - attend l'approbation admin"""
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password]
    )
    confirm_password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['email', 'first_name', 'last_name', 'password', 'confirm_password']

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        email = validated_data['email']
        base_username = email.split('@')[0]
        base_username = re.sub(r'[^a-zA-Z0-9]', '', base_username)
        username = f"{base_username}_{int(time.time())}"
        
        user = User.objects.create_user(
            username=username,
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password'],
            is_approved=False,
            role=None
        )
        return user


class LoginSerializer(serializers.Serializer):
    """Login serializer - vérifie si l'utilisateur est approuvé"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        user = authenticate(request=self.context.get('request'), username=email, password=password)
        
        if not user:
            raise serializers.ValidationError({"error": "Invalid email or password."})
        
        if not user.is_active:
            raise serializers.ValidationError({"error": "This account is inactive."})
        
        if not user.is_approved:
            raise serializers.ValidationError({"error": "Your account is pending approval by an administrator."})
        
        attrs['user'] = user
        return attrs


# ========== ADMIN SERIALIZERS ==========

class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer pour l'admin (vue complète des utilisateurs)"""
    full_name = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'role_display', 'is_approved', 'is_active', 
            'department', 'site', 'created_at', 'updated_at', 'last_login'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_login']
    
    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


class AdminApproveUserSerializer(serializers.Serializer):
    """Serializer pour approuver un utilisateur"""
    role = serializers.ChoiceField(
        choices=[User.Role.ROLE_1, User.Role.ROLE_2, User.Role.ROLE_3],
        required=True
    )
    admin_note = serializers.CharField(required=False, allow_blank=True)


class AdminRejectUserSerializer(serializers.Serializer):
    """Serializer pour rejeter un utilisateur"""
    rejection_reason = serializers.CharField(required=True)


class AdminUpdateUserRoleSerializer(serializers.Serializer):
    """Serializer pour modifier le rôle d'un utilisateur"""
    role = serializers.ChoiceField(
        choices=[User.Role.ROLE_1, User.Role.ROLE_2, User.Role.ROLE_3, User.Role.ADMIN],
        required=True
    )


# ========== AUDIT LOG SERIALIZER ==========

class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer pour les logs d'audit"""
    actor = serializers.SerializerMethodField()
    entity = serializers.SerializerMethodField()
    meta = serializers.SerializerMethodField()
    ts = serializers.DateTimeField(source='created_at')
    
    class Meta:
        model = AuditLog
        fields = ['id', 'ts', 'category', 'actor', 'action', 'entity', 'severity', 'meta']
    
    def get_actor(self, obj):
        return obj.user.email if obj.user else 'System'
    
    def get_entity(self, obj):
        return {'type': obj.entity_type, 'id': obj.entity_id}
    
    def get_meta(self, obj):
        return {
            'ip': obj.ip_address or 'N/A',
            'userAgent': 'N/A',
            'source': 'backend',
            'requestId': f'req-{obj.id}',
            'notes': obj.notes or '',
            'diff': str(obj.diff) if obj.diff else '',
        }