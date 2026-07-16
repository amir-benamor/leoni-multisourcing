from rest_framework import serializers

class FileUploadSerializer(serializers.Serializer):
    """Sérializer pour l'upload des fichiers"""
    file_tech = serializers.FileField(required=True)
    file_transport = serializers.FileField(required=True)
    file_project = serializers.FileField(required=True)
    file_prices = serializers.FileField(required=True)
    batch_name = serializers.CharField(max_length=100, required=True)

class CleaningStatsSerializer(serializers.Serializer):
    """Sérializer pour les statistiques de nettoyage globales"""
    rows_read = serializers.IntegerField()
    rows_after_clean = serializers.IntegerField()
    duplicates_removed = serializers.IntegerField()
    total_null_count = serializers.IntegerField()

class ImportStatusSerializer(serializers.Serializer):
    """Sérializer pour le statut d'import"""
    status = serializers.CharField()  # Queued, Parsing, Validating, Importing, Done, Failed
    progress = serializers.IntegerField()
    total_rows = serializers.IntegerField()
    processed_rows = serializers.IntegerField()
    errors = serializers.IntegerField()
    warnings = serializers.IntegerField()
    message = serializers.CharField()
    error = serializers.CharField(allow_null=True)