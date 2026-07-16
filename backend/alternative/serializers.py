from rest_framework import serializers


class OEMDetailSerializer(serializers.Serializer):
    """Détail d'un OEM"""
    oem = serializers.CharField()
    status = serializers.CharField()


class OEMSummarySerializer(serializers.Serializer):
    """Résumé OEM"""
    total = serializers.IntegerField()
    released = serializers.IntegerField()
    percentage = serializers.FloatField()
    details = OEMDetailSerializer(many=True)


class PriceRangeSerializer(serializers.Serializer):
    """Fourchette de prix"""
    min = serializers.FloatField()
    max = serializers.FloatField()


class AlternativePartSerializer(serializers.Serializer):
    """Un composant alternatif"""
    leoni_part_number = serializers.CharField()
    supplier_group = serializers.CharField()
    supplier_part_number = serializers.CharField(allow_null=True, allow_blank=True)
    fors_material_group = serializers.CharField(allow_null=True, allow_blank=True)
    compatibility_status = serializers.CharField(allow_null=True, allow_blank=True)
    multisourcing_status = serializers.CharField(allow_null=True, allow_blank=True)
    multisourcing_status_parsed = serializers.CharField(allow_null=True, allow_blank=True)
    multisourcing_number = serializers.CharField(allow_null=True, allow_blank=True)
    s4_description = serializers.CharField(allow_null=True, allow_blank=True)
    annual_volume = serializers.IntegerField()
    unit_price = serializers.FloatField(allow_null=True)
    full_price = serializers.FloatField(allow_null=True)
    currency = serializers.CharField(allow_null=True, allow_blank=True)
    price_range = PriceRangeSerializer()
    oem_summary = OEMSummarySerializer()


class VolumeShareSerializer(serializers.Serializer):
    """Volume par fournisseur"""
    supplier = serializers.CharField()
    volume = serializers.IntegerField()
    percentage = serializers.FloatField()


class VolumeRegionSerializer(serializers.Serializer):
    """Volume par région"""
    region = serializers.CharField()
    volume = serializers.IntegerField()


class PartAlternativeSerializer(serializers.Serializer):
    """Serializer principal"""
    ms_number = serializers.CharField()
    total_volume = serializers.IntegerField()
    current_part = AlternativePartSerializer(allow_null=True)
    alternatives = AlternativePartSerializer(many=True)
    volume_share = VolumeShareSerializer(many=True)
    volume_by_region = VolumeRegionSerializer(many=True)


class PartAlternativeResponseSerializer(serializers.Serializer):
    """Serializer de réponse"""
    success = serializers.BooleanField()
    data = PartAlternativeSerializer(required=False)
    error = serializers.CharField(required=False)