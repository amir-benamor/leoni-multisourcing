# authentication/utils.py
from .models import AuditLog


def log_audit(user, category, action, entity_type, entity_id, severity='Info', notes=None, diff=None, request=None):
    """Enregistre une action dans l'audit log"""
    ip = None
    if request:
        ip = request.META.get('REMOTE_ADDR')
    
    AuditLog.objects.create(
        user=user,
        category=category,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id),
        severity=severity,
        notes=notes,
        diff=diff,
        ip_address=ip
    )