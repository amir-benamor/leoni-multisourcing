from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db import transaction
from .models import ImportHistory, BusinessCase, BusinessCaseTask


class ImportHistoryListView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        histories = ImportHistory.objects.select_related('batch').order_by('-import_date')[:50]
        data = []
        for h in histories:
            data.append({
                'id': h.id, 'batch_name': h.batch.batch_name,
                'import_date': h.import_date.isoformat(),
                'completed_at': h.completed_at.isoformat() if h.completed_at else None,
                'status': h.status, 'error_details': h.error_details,
                'files': {
                    'tech_data': h.filename_tech, 'transport': h.filename_transport,
                    'project': h.filename_project, 'prices': h.filename_prices
                },
                'cleaning_stats': {
                    'rows_read': h.rows_read, 'rows_after_clean': h.rows_after_clean,
                    'duplicates_removed': h.duplicates_removed, 'total_null_count': h.total_null_count
                },
                'import_stats': {
                    'imported_rows': h.imported_rows, 'warning_count': h.warning_count,
                    'error_count': h.error_count
                },
                'duration_seconds': h.duration_seconds,
            })
        return Response({'success': True, 'data': data, 'count': len(data)})


class ImportHistoryDetailView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, history_id):
        try:
            h = ImportHistory.objects.select_related('batch').get(id=history_id)
        except ImportHistory.DoesNotExist:
            return Response({'success': False, 'error': 'Import not found'}, status=404)
        data = {
            'id': h.id, 'batch_name': h.batch.batch_name,
            'import_date': h.import_date.isoformat(),
            'completed_at': h.completed_at.isoformat() if h.completed_at else None,
            'status': h.status, 'error_details': h.error_details,
            'files': {
                'tech_data': h.filename_tech, 'transport': h.filename_transport,
                'project': h.filename_project, 'prices': h.filename_prices
            },
            'cleaning_stats': {
                'rows_read': h.rows_read, 'rows_after_clean': h.rows_after_clean,
                'duplicates_removed': h.duplicates_removed, 'total_null_count': h.total_null_count
            },
            'import_stats': {
                'imported_rows': h.imported_rows, 'warning_count': h.warning_count,
                'error_count': h.error_count
            },
            'duration_seconds': h.duration_seconds,
        }
        return Response({'success': True, 'data': data})


class BusinessCaseHistoryView(APIView):
    """Historique des business cases sauvegardés"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        ms_number = request.query_params.get('ms_number', '')
        queryset = BusinessCase.objects.filter(status='saved')
        if ms_number:
            queryset = queryset.filter(ms_number=ms_number)
        
        history = []
        for bc in queryset.order_by('-created_at')[:20]:
            history.append({
                'id': bc.id,
                'ms_number': bc.ms_number,
                'scenario_type': bc.scenario_type,
                'full_switch': bc.full_switch,
                'current_part': bc.current_part,
                'target_part': bc.target_part,
                'purchase_region': bc.purchase_region,
                'usage_market': bc.usage_market,
                'created_at': bc.created_at.isoformat(),
            })
        
        return Response({'success': True, 'data': history})


class BusinessCaseSaveView(APIView):
    """Sauvegarde un business case"""
    permission_classes = [AllowAny]
    
    @transaction.atomic
    def post(self, request):
        data = request.data
        
        bc = BusinessCase.objects.create(
            ms_number=data['ms_number'],
            current_part=data.get('current_part'),
            target_part=data.get('target_part'),
            scenario_type=data['scenario_type'],
            full_switch=data.get('full_switch', False),
            purchase_region=data['purchase_region'],
            usage_market=data['usage_market'],
            notes_json=data.get('notes_json'),
            status='saved'
        )
        
        for task_data in data.get('tasks', []):
            BusinessCaseTask.objects.create(
                business_case=bc,
                title=task_data['title'],
                note=task_data.get('note', ''),
                due_date=task_data.get('due_date'),
                status=task_data.get('status', 'TODO'),
                owner=task_data.get('owner', 'Engineering'),
            )
        
        return Response({
            'success': True,
            'data': {'id': bc.id, 'message': 'Business case saved successfully'}
        }, status=status.HTTP_201_CREATED)


class BusinessCaseDetailView(APIView):
    """Charge un business case sauvegardé"""
    permission_classes = [AllowAny]
    
    def get(self, request, bc_id):
        try:
            bc = BusinessCase.objects.get(id=bc_id)
        except BusinessCase.DoesNotExist:
            return Response({'success': False, 'error': 'Business case not found'}, status=404)
        
        tasks = []
        for task in bc.tasks.all():
            tasks.append({
                'id': task.id,
                'title': task.title,
                'note': task.note or '',
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'status': task.status,
                'owner': task.owner,
            })
        
        return Response({
            'success': True,
            'data': {
                'id': bc.id,
                'ms_number': bc.ms_number,
                'scenario_type': bc.scenario_type,
                'full_switch': bc.full_switch,
                'purchase_region': bc.purchase_region,
                'usage_market': bc.usage_market,
                'current_part': bc.current_part,
                'target_part': bc.target_part,
                'notes_json': bc.notes_json,
                'tasks': tasks,
                'created_at': bc.created_at.isoformat(),
            }
        })