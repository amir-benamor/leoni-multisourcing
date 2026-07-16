from django.db import models
from django.utils import timezone

class UploadBatch(models.Model):
    batch_name = models.CharField(max_length=100)
    upload_date = models.DateTimeField(auto_now_add=True) # Date de création du batch
    is_recent = models.BooleanField(default=True)

    def __str__(self):
        return self.batch_name

class PartTechnicalData(models.Model):
    leoni_part_number = models.CharField(max_length=100, primary_key=True)
    fors_material_group = models.CharField(max_length=100, blank=True, null=True)
    fors_classification = models.CharField(max_length=100, blank=True, null=True)
    s4_description = models.TextField(blank=True, null=True)
    supplier_group = models.CharField(max_length=255, blank=True, null=True)
    supplier_part_number = models.CharField(max_length=100, blank=True, null=True)
    multisourcing_status = models.CharField(max_length=500, blank=True, null=True)
    compatibility_status = models.CharField(max_length=50, blank=True, null=True)
    multisourcing_number = models.CharField(max_length=100, blank=True, null=True)
    updated_at = models.DateTimeField(auto_now=True) # Date de dernière modification technique

    def __str__(self):
        return self.leoni_part_number

class PartTransportReceipt(models.Model):
    batch = models.ForeignKey(UploadBatch, on_delete=models.CASCADE, related_name='transport_receipts')
    part = models.ForeignKey(PartTechnicalData, on_delete=models.CASCADE, related_name='transport_receipts')
    lokid = models.CharField(max_length=100)
    location_region = models.CharField(max_length=100)
    location_country = models.CharField(max_length=100, blank=True, null=True)
    annual_volume = models.DecimalField(max_digits=15, decimal_places=2)
    imported_at = models.DateTimeField(default=timezone.now) # Date précise de l'import

class PartProjectUsage(models.Model):
    batch = models.ForeignKey(UploadBatch, on_delete=models.CASCADE, related_name='project_usages')
    part = models.ForeignKey(PartTechnicalData, on_delete=models.CASCADE, related_name='project_usages')
    lokid = models.CharField(max_length=100)
    oem_brand = models.CharField(max_length=100)
    project_name = models.CharField(max_length=255)
    monthly_sum_volume = models.DecimalField(max_digits=15, decimal_places=2)
    imported_at = models.DateTimeField(default=timezone.now) # Date précise de l'import

class PartPrice(models.Model):
    batch = models.ForeignKey(UploadBatch, on_delete=models.CASCADE, related_name='prices')
    part = models.ForeignKey(PartTechnicalData, on_delete=models.CASCADE, related_name='prices')
    server_id = models.CharField(max_length=100)
    lokid = models.CharField(max_length=100, blank=True, null=True)
    price_eur = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True) 
    price_date = models.DateField() # Date spécifiée dans le fichier Excel
    full_price = models.DecimalField(max_digits=15, decimal_places=4)
    currency = models.CharField(max_length=10)
    imported_at = models.DateTimeField(default=timezone.now) # Date précise de l'import