from django.db import models
from component.models import UploadBatch


class ImportHistory(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('processing', 'En cours'),
        ('completed', 'Terminé'),
        ('failed', 'Échec'),
    ]
    
    batch = models.OneToOneField(UploadBatch, on_delete=models.CASCADE, related_name='history')
    import_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    filename_tech = models.CharField(max_length=255, null=True, blank=True)
    filename_transport = models.CharField(max_length=255, null=True, blank=True)
    filename_project = models.CharField(max_length=255, null=True, blank=True)
    filename_prices = models.CharField(max_length=255, null=True, blank=True)
    error_details = models.TextField(null=True, blank=True)
    
    rows_read = models.IntegerField(null=True, blank=True)
    rows_after_clean = models.IntegerField(null=True, blank=True)
    duplicates_removed = models.IntegerField(null=True, blank=True)
    total_null_count = models.IntegerField(null=True, blank=True)
    imported_rows = models.IntegerField(null=True, blank=True)
    error_count = models.IntegerField(null=True, blank=True)
    warning_count = models.IntegerField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(null=True, blank=True)
    
    def __str__(self):
        return f"Historique {self.batch.batch_name} - {self.import_date.strftime('%d/%m/%Y')}"


class BusinessCase(models.Model):
    """Scénario sauvegardé dans l'historique"""
    SCENARIO_TYPES = [
        ('selective', 'Selective Switch'),
        ('full', 'Full Switch'),
    ]
    
    ms_number = models.CharField(max_length=100)
    current_part = models.CharField(max_length=100, null=True, blank=True)
    target_part = models.CharField(max_length=100, null=True, blank=True)
    scenario_type = models.CharField(max_length=20, choices=SCENARIO_TYPES)
    full_switch = models.BooleanField(default=False)
    purchase_region = models.CharField(max_length=50)
    usage_market = models.CharField(max_length=50)
    notes_json = models.JSONField(null=True, blank=True)
    status = models.CharField(max_length=20, default='saved')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"BC-{self.id} - {self.ms_number} ({self.scenario_type})"
    
    class Meta:
        ordering = ['-created_at']


class BusinessCaseTask(models.Model):
    """Tâche d'un scénario sauvegardé"""
    STATUS_CHOICES = [
        ('TODO', 'Todo'),
        ('ONGOING', 'Ongoing'),
        ('DONE', 'Done'),
    ]
    OWNER_CHOICES = [
        ('Engineering', 'Engineering'),
        ('Procurement', 'Procurement'),
        ('Program', 'Program'),
        ('Quality', 'Quality'),
        ('Customer', 'Customer'),
    ]
    
    business_case = models.ForeignKey(BusinessCase, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=255)
    note = models.TextField(blank=True, null=True)
    due_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='TODO')
    owner = models.CharField(max_length=50, choices=OWNER_CHOICES, default='Engineering')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.title} ({self.status})"
    
    class Meta:
        ordering = ['created_at']