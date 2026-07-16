from rest_framework import serializers


# ========== Coverage KPIs ==========

class CoverageKpiSerializer(serializers.Serializer):
    """Serializer pour un KPI de couverture"""
    key = serializers.CharField()
    label = serializers.CharField()
    value = serializers.CharField()
    helper = serializers.CharField()
    tone = serializers.CharField()


class FiltersAppliedSerializer(serializers.Serializer):
    """Serializer pour les filtres appliqués"""
    customer = serializers.CharField()
    region = serializers.CharField()
    material_group = serializers.CharField()


class CoverageResponseSerializer(serializers.Serializer):
    """Serializer pour la réponse de couverture"""
    filters_applied = FiltersAppliedSerializer()
    coverage_kpis = CoverageKpiSerializer(many=True)


# ========== Global Filters ==========

class SnapshotOptionSerializer(serializers.Serializer):
    """Serializer pour une option de snapshot"""
    id = serializers.IntegerField(allow_null=True)
    name = serializers.CharField()
    is_latest = serializers.BooleanField()


class GlobalFiltersDataSerializer(serializers.Serializer):
    """Serializer pour les données des filtres globaux"""
    customers = serializers.ListField(child=serializers.CharField())
    regions = serializers.ListField(child=serializers.CharField())
    snapshots = SnapshotOptionSerializer(many=True)


class GlobalFiltersResponseSerializer(serializers.Serializer):
    """Serializer pour la réponse des filtres globaux"""
    success = serializers.BooleanField()
    data = GlobalFiltersDataSerializer(required=False)
    error = serializers.CharField(required=False)


# ========== Classifications ==========

class ClassificationsDataSerializer(serializers.Serializer):
    """Serializer pour les données de classifications"""
    classifications = serializers.ListField(child=serializers.CharField())


class ClassificationsResponseSerializer(serializers.Serializer):
    """Serializer pour la réponse des classifications"""
    success = serializers.BooleanField()
    data = ClassificationsDataSerializer(required=False)
    error = serializers.CharField(required=False)


# ========== Market Share ==========

class MarketShareItemSerializer(serializers.Serializer):
    """Serializer pour un item de market share ou volume"""
    name = serializers.CharField()
    value = serializers.FloatField()


class MarketShareDataSerializer(serializers.Serializer):
    """Serializer pour les données de market share"""
    market_share = MarketShareItemSerializer(many=True)
    supplier_volume = MarketShareItemSerializer(many=True)


class MarketShareResponseSerializer(serializers.Serializer):
    """Serializer pour la réponse market share"""
    success = serializers.BooleanField()
    data = MarketShareDataSerializer(required=False)
    error = serializers.CharField(required=False)


# ========== Status Matrix ==========

class MatrixCellSerializer(serializers.Serializer):
    """Serializer pour une cellule de la matrice"""
    classification = serializers.CharField(required=False, allow_null=True)
    color = serializers.CharField(required=False, allow_null=True)
    status = serializers.CharField(required=False, allow_null=True)


class MatrixRowSerializer(serializers.Serializer):
    """Serializer pour une ligne de la matrice"""
    classification = serializers.CharField()
    volume2026 = serializers.IntegerField()
    share = serializers.FloatField()
    cells = serializers.DictField(
        child=MatrixCellSerializer(required=False, allow_null=True),
        required=False
    )


class StatusMatrixDataSerializer(serializers.Serializer):
    """Serializer pour les données de la matrice"""
    suppliers = serializers.ListField(child=serializers.CharField())
    rows = MatrixRowSerializer(many=True)
    technical_alternative_pct = serializers.FloatField()
    released_alternative_pct = serializers.FloatField()
    total_volume = serializers.IntegerField()


class StatusMatrixResponseSerializer(serializers.Serializer):
    """Serializer pour la réponse de la matrice"""
    success = serializers.BooleanField()
    data = StatusMatrixDataSerializer(required=False)
    error = serializers.CharField(required=False)

# ========== Results (MS Groups) ==========

class MsGroupSerializer(serializers.Serializer):
    """Serializer pour un MS Group"""
    ms_number = serializers.CharField()
    alternatives = serializers.IntegerField()
    best_availability = serializers.CharField()
    best_availability_rank = serializers.IntegerField()
    best_availability_color = serializers.CharField()
    total_volume = serializers.IntegerField()


class ResultsDataSerializer(serializers.Serializer):
    """Serializer pour les données de résultats"""
    ms_groups = MsGroupSerializer(many=True)


class ResultsResponseSerializer(serializers.Serializer):
    """Serializer pour la réponse des résultats"""
    success = serializers.BooleanField()
    data = ResultsDataSerializer(required=False)
    error = serializers.CharField(required=False)    