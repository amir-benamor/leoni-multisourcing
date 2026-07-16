from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """Custom User Model for authentication"""
    
    # ========== DÉFINITION DES RÔLES ==========
    class Role(models.TextChoices):
        ROLE_1 = 'ROLE_1', 'Role 1'
        ROLE_2 = 'ROLE_2', 'Role 2'
        ROLE_3 = 'ROLE_3', 'Role 3'
        ADMIN = 'ADMIN', 'Administrateur'
    
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    
    # Profile fields
    department = models.CharField(max_length=100, blank=True, null=True)
    site = models.CharField(max_length=100, blank=True, null=True)
    
    # ========== MODIFICATION : role avec choix limités ==========
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        blank=True,
        null=True,
        verbose_name="Rôle"
    )
    
    # ========== NOUVEAU : Champ pour l'approbation ==========
    is_approved = models.BooleanField(
        default=False,
        verbose_name="Approuvé par l'administrateur"
    )
    
    bio = models.TextField(max_length=500, blank=True, null=True)
    
    # Preferences
    theme = models.CharField(
        max_length=20, 
        choices=[('light', 'Light'), ('dark', 'Dark'), ('system', 'System')],
        default='system'
    )
    remember_last_scope = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Make email the primary identifier for login
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    def __str__(self):
        return self.email
    
    # ========== PROPRIÉTÉS UTILITAIRES ==========
    @property
    def is_admin(self):
        """Vérifie si l'utilisateur est un administrateur"""
        return self.role == self.Role.ADMIN
    
    @property
    def is_approved_user(self):
        """Vérifie si l'utilisateur est approuvé"""
        return self.is_approved
    
    class Meta:
        ordering = ['-created_at']


class AuditLog(models.Model):
    """Trace toutes les actions des utilisateurs"""
    SEVERITY_CHOICES = [
        ('Info', 'Info'),
        ('Warning', 'Warning'),
        ('Critical', 'Critical'),
    ]
    CATEGORY_CHOICES = [
        ('admin', 'Admin actions'),
        ('imports', 'Imports'),
        ('master_data', 'Master data'),
        ('auth', 'Auth'),
        ('business_case', 'Business Case'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    action = models.CharField(max_length=255)
    entity_type = models.CharField(max_length=100)
    entity_id = models.CharField(max_length=100)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='Info')
    notes = models.TextField(blank=True, null=True)
    diff = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
    
    def __str__(self):
        return f"[{self.severity}] {self.action} by {self.user} at {self.created_at}"