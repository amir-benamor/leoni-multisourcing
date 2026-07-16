from rest_framework import serializers
from .models import ImportHistory


class ImportHistoryListSerializer(serializers.ModelSerializer):
    """Serializer pour la liste des imports (tableau)"""
    batch_name = serializers.CharField(source='batch.batch_name', read_only=True)
    
    class Meta:
        model = ImportHistory
        fields = [
            'id',
            'batch_name',
            'import_date',
            'status',
            'filename_tech',
            'filename_transport',
            'filename_project',
            'filename_prices',
            'rows_read',
            'rows_after_clean',
            'duplicates_removed',
            'total_null_count',
            'imported_rows',
            'warning_count',
            'error_count',
            'duration_seconds',
        ]


class ImportHistoryDetailSerializer(serializers.ModelSerializer):
    """Serializer pour les détails d'un import"""
    batch_name = serializers.CharField(source='batch.batch_name', read_only=True)
    
    # Regrouper les statistiques par catégorie
    cleaning_stats = serializers.SerializerMethodField()
    import_stats = serializers.SerializerMethodField()
    files = serializers.SerializerMethodField()
    
    class Meta:
        model = ImportHistory
        fields = [
            'id',
            'batch_name',
            'import_date',
            'completed_at',
            'status',
            'error_details',
            'files',
            'cleaning_stats',
            'import_stats',
            'duration_seconds',
        ]
    
    def get_cleaning_stats(self, obj):
        return {
            'rows_read': obj.rows_read,
            'rows_after_clean': obj.rows_after_clean,
            'duplicates_removed': obj.duplicates_removed,
            'total_null_count': obj.total_null_count,
        }
    
    def get_import_stats(self, obj):
        return {
            'imported_rows': obj.imported_rows,
            'warning_count': obj.warning_count,
            'error_count': obj.error_count,
        }
    
    def get_files(self, obj):
        return {
            'tech_data': obj.filename_tech,
            'transport': obj.filename_transport,
            'project': obj.filename_project,
            'prices': obj.filename_prices,
        }