import threading
import uuid
from typing import Dict, Any
from django.utils import timezone
from .file_importer import FileImporter

# Stockage des tâches en mémoire (pour production, utilisez Redis/Celery)
import_queue: Dict[str, Dict[str, Any]] = {}

class ImportTaskManager:
    """Gestionnaire de tâches d'import asynchrone"""
    
    @staticmethod
    def create_task(cleaned_files: Dict[str, str], batch_name: str, cleaning_stats: Dict[str, Any] = None) -> str:
        """Crée une nouvelle tâche d'import
        
        Args:
            cleaned_files: Dictionnaire des chemins des fichiers nettoyés
            batch_name: Nom du batch
            cleaning_stats: Statistiques de nettoyage (rows_read, rows_after_clean, etc.)
        """
        task_id = str(uuid.uuid4())
        
        import_queue[task_id] = {
            'status': 'Queued',
            'progress': 0,
            'total_rows': 0,
            'processed_rows': 0,
            'errors': 0,
            'warnings': 0,
            'message': 'Task queued',
            'error': None,
            'created_at': timezone.now(),
            'cleaned_files': cleaned_files,
            'batch_name': batch_name,
            'cleaning_stats': cleaning_stats  # ← Ajout des statistiques de nettoyage
        }
        
        # Démarrer l'import dans un thread séparé
        thread = threading.Thread(
            target=ImportTaskManager._run_import,
            args=(task_id, cleaned_files, batch_name, cleaning_stats)
        )
        thread.daemon = True
        thread.start()
        
        return task_id
    
    @staticmethod
    def _run_import(task_id: str, cleaned_files: Dict[str, str], batch_name: str, cleaning_stats: Dict[str, Any] = None):
        """Exécute l'import (dans un thread)"""
        try:
            import_queue[task_id]['status'] = 'Parsing'
            import_queue[task_id]['message'] = 'Starting import...'
            
            # Callback pour mettre à jour la progression
            def update_progress(status, progress, total_rows, processed_rows, errors, warnings, message):
                import_queue[task_id].update({
                    'status': status,
                    'progress': progress,
                    'total_rows': total_rows,
                    'processed_rows': processed_rows,
                    'errors': errors,
                    'warnings': warnings,
                    'message': message
                })
            
            # Lancer l'import avec les statistiques de nettoyage
            result = FileImporter.import_all_files(
                cleaned_files, 
                batch_name, 
                progress_callback=update_progress,
                cleaning_stats=cleaning_stats  # ← Passage des statistiques de nettoyage
            )
            
            import_queue[task_id]['status'] = 'Done'
            import_queue[task_id]['progress'] = 100
            import_queue[task_id]['message'] = 'Import completed successfully'
            
            # Ajouter les résultats au queue pour référence
            if result and 'stats' in result:
                import_queue[task_id]['imported_rows'] = result['stats'].get('imported', 0)
                import_queue[task_id]['error_count'] = result['stats'].get('errors', 0)
                import_queue[task_id]['warning_count'] = result['stats'].get('warnings', 0)
            
        except Exception as e:
            import_queue[task_id]['status'] = 'Failed'
            import_queue[task_id]['error'] = str(e)
            import_queue[task_id]['message'] = f'Import failed: {str(e)}'
    
    @staticmethod
    def get_task_status(task_id: str) -> Dict[str, Any]:
        """Retourne le statut d'une tâche"""
        task = import_queue.get(task_id)
        if not task:
            return {
                'status': 'Failed',
                'progress': 0,
                'total_rows': 0,
                'processed_rows': 0,
                'errors': 0,
                'warnings': 0,
                'message': 'Task not found',
                'error': 'Invalid task ID'
            }
        
        return {
            'status': task['status'],
            'progress': task['progress'],
            'total_rows': task.get('total_rows', 0),
            'processed_rows': task.get('processed_rows', 0),
            'errors': task.get('errors', 0),
            'warnings': task.get('warnings', 0),
            'message': task.get('message', ''),
            'error': task.get('error'),
            'imported_rows': task.get('imported_rows', 0),
            'error_count': task.get('error_count', 0),
            'warning_count': task.get('warning_count', 0)
        }