from rest_framework import serializers
from .models import PartTechnicalData, PartProjectUsage, PartTransportReceipt


class PartIdentificationSerializer(serializers.ModelSerializer):
    """Serializer pour la partie identification d'un composant"""
    
    oem_applicability = serializers.SerializerMethodField()
    oem_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PartTechnicalData
        fields = [
            'leoni_part_number',
            'supplier_part_number',
            'supplier_group',
            'fors_material_group',
            's4_description',
            'fors_classification',
            'oem_applicability',
            'oem_count',
        ]
    
    def get_oem_applicability(self, obj):
        """Récupère la liste unique des OEM utilisant ce composant"""
        oems = PartProjectUsage.objects.filter(
            part=obj
        ).values_list('oem_brand', flat=True).distinct()
        return [oem for oem in oems if oem]
    
    def get_oem_count(self, obj):
        """Compte le nombre d'OEM uniques"""
        return len(self.get_oem_applicability(obj))


class ProjectUsageSerializer(serializers.Serializer):
    """Serializer pour un projet"""
    project_name = serializers.CharField()
    volume = serializers.IntegerField()
    percentage = serializers.FloatField()


class AccountUsageSerializer(serializers.Serializer):
    """Serializer pour un compte/client OEM"""
    oem_brand = serializers.CharField()
    total_volume = serializers.IntegerField()
    percentage = serializers.FloatField()
    projects = ProjectUsageSerializer(many=True)


class PartUsageSerializer(serializers.Serializer):
    """Serializer pour l'utilisation d'un composant"""
    usage_by_account = AccountUsageSerializer(many=True)


class TransportVolumeSerializer(serializers.Serializer):
    """Serializer pour un volume de transport (région, pays, plant)"""
    name = serializers.CharField()
    volume = serializers.IntegerField()


class PartTransportSerializer(serializers.Serializer):
    """Serializer pour les données de transport d'un composant"""
    total_annual_volume = serializers.IntegerField()
    plants = serializers.ListField(child=serializers.CharField())
    volume_by_region = TransportVolumeSerializer(many=True)
    volume_by_country = TransportVolumeSerializer(many=True)
    volume_by_plant = TransportVolumeSerializer(many=True)


class PartBatchItemSerializer(serializers.Serializer):
    """Serializer pour un élément de la réponse batch"""
    input = serializers.CharField()
    match_type = serializers.CharField(allow_null=True)
    leoni_part_number = serializers.CharField()
    supplier_part_number = serializers.CharField(allow_null=True)
    supplier_group = serializers.CharField(allow_null=True)
    fors_material_group = serializers.CharField(allow_null=True)
    s4_description = serializers.CharField(allow_null=True)
    fors_classification = serializers.CharField(allow_null=True)
    oem_applicability = serializers.ListField(child=serializers.CharField())
    oem_count = serializers.IntegerField()
    annual_volume_context = serializers.IntegerField()
    plants = serializers.ListField(child=serializers.CharField())
    volume_by_region = TransportVolumeSerializer(many=True)
    volume_by_country = TransportVolumeSerializer(many=True)
    volume_by_plant = TransportVolumeSerializer(many=True)
    usage_by_account = AccountUsageSerializer(many=True)
    error = serializers.CharField(allow_null=True, required=False)


class PartsBatchResponseSerializer(serializers.Serializer):
    """Serializer pour la réponse batch complète"""
    success = serializers.BooleanField()
    data = PartBatchItemSerializer(many=True)
    count = serializers.IntegerField()
    error = serializers.CharField(allow_null=True, required=False)


class MaterialGroupPartSerializer(serializers.Serializer):
    """Serializer pour un part dans la réponse material group"""
    leoni_part_number = serializers.CharField()
    supplier_part_number = serializers.CharField(allow_null=True)
    supplier_group = serializers.CharField(allow_null=True)
    fors_classification = serializers.CharField(allow_null=True)
    s4_description = serializers.CharField(allow_null=True)
    annual_volume_context = serializers.IntegerField()
    oem_applicability = serializers.ListField(child=serializers.CharField())
    plants = serializers.ListField(child=serializers.CharField())
    volume_by_region = TransportVolumeSerializer(many=True)
    volume_by_country = TransportVolumeSerializer(many=True)
    usage_by_account = AccountUsageSerializer(many=True)


class MaterialGroupResponseSerializer(serializers.Serializer):
    """Serializer pour la réponse material group"""
    material_group = serializers.CharField()
    total_annual_volume = serializers.IntegerField()
    parts = MaterialGroupPartSerializer(many=True)


# ========== SERIALIZERS POUR M2 (COMMERCIAL) ==========

class M2PartInfoSerializer(serializers.Serializer):
    """Serializer pour les informations de base du composant (M2)"""
    leoni_part_number = serializers.CharField()
    supplier_part_number = serializers.CharField(allow_null=True)
    supplier_group = serializers.CharField(allow_null=True)
    fors_material_group = serializers.CharField(allow_null=True)
    fors_classification = serializers.CharField(allow_null=True)
    s4_description = serializers.CharField(allow_null=True)


class M2PriceRangeSerializer(serializers.Serializer):
    """Serializer pour la fourchette de prix (M2)"""
    min = serializers.FloatField()
    max = serializers.FloatField()


class M2RegionalDataSerializer(serializers.Serializer):
    """Serializer pour les données régionales (M2)"""
    region = serializers.CharField()
    unit_price = serializers.FloatField(allow_null=True)
    volume = serializers.IntegerField()
    value = serializers.FloatField()
    price_source_server = serializers.CharField(allow_null=True)


class M2SignalItemSerializer(serializers.Serializer):
    """Serializer pour un item de signal (M2)"""
    region = serializers.CharField(required=False, allow_null=True)
    value = serializers.FloatField(required=False, allow_null=True)
    percentage = serializers.FloatField(required=False, allow_null=True)
    unit_price = serializers.FloatField(required=False, allow_null=True)
    name = serializers.CharField(required=False, allow_null=True)
    volume = serializers.IntegerField(required=False, allow_null=True)


class M2SignalsSerializer(serializers.Serializer):
    """Serializer pour les signaux commerciaux (M2)"""
    top_value_region = M2SignalItemSerializer(allow_null=True)
    highest_unit_price_region = M2SignalItemSerializer(allow_null=True)
    dominant_plant = M2SignalItemSerializer(allow_null=True)
    dominant_project = M2SignalItemSerializer(allow_null=True)


class M2BreakdownItemSerializer(serializers.Serializer):
    """Serializer pour un item de breakdown (M2)"""
    name = serializers.CharField()
    volume = serializers.IntegerField()
    percentage = serializers.FloatField()
    value = serializers.FloatField()


class M2BreakdownsSerializer(serializers.Serializer):
    """Serializer pour tous les breakdowns (M2)"""
    project_breakdown = M2BreakdownItemSerializer(many=True)
    account_breakdown = M2BreakdownItemSerializer(many=True)
    plant_breakdown = M2BreakdownItemSerializer(many=True)


class M2PartCommercialSerializer(serializers.Serializer):
    """Serializer principal pour la vue commerciale M2"""
    part_info = M2PartInfoSerializer()
    price_range = M2PriceRangeSerializer()
    active_regions = serializers.IntegerField()
    regional_data = M2RegionalDataSerializer(many=True)
    total_volume = serializers.IntegerField()
    total_value = serializers.FloatField()
    signals = M2SignalsSerializer()
    breakdowns = M2BreakdownsSerializer()