from rest_framework import serializers


class BusinessCaseTaskSerializer(serializers.Serializer):
    title = serializers.CharField()
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    due_date = serializers.DateField(required=False, allow_null=True)
    status = serializers.CharField(required=False, default='TODO')
    owner = serializers.CharField(required=False, default='Engineering')


class BusinessCaseSaveSerializer(serializers.Serializer):
    ms_number = serializers.CharField()
    current_part = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    target_part = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    scenario_type = serializers.CharField()
    full_switch = serializers.BooleanField(default=False)
    purchase_region = serializers.CharField()
    usage_market = serializers.CharField()
    notes_json = serializers.JSONField(required=False, allow_null=True)
    tasks = BusinessCaseTaskSerializer(many=True, required=False)