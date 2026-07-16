import os
import shutil
import logging
import uuid
import threading
from datetime import datetime
from django.conf import settings
from django.core.files.storage import default_storage
from django.core.files.uploadedfile import UploadedFile
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

from .serializers import FileUploadSerializer
from .services.file_cleaner import FileCleaner
from .services.task_manager import ImportTaskManager

# Configuration du logger
logger = logging.getLogger(__name__)

# Stockage des tâches de nettoyage
cleaning_queue = {}

class CleaningTaskManager:
    """Gestionnaire de tâches de nettoyage asynchrone avec progression détaillée"""
    
    @staticmethod
    def create_task(saved_files: dict, cleaned_dir: str, batch_name: str) -> str:
        """Crée une nouvelle tâche de nettoyage"""
        task_id = str(uuid.uuid4())
        
        cleaning_queue[task_id] = {
            'status': 'Queued',
            'progress': 0,
            'message': 'Cleaning task queued',
            'error': None,
            'result': None,
            'created_at': datetime.now().isoformat(),
            'saved_files': saved_files,
            'cleaned_dir': cleaned_dir,
            'batch_name': batch_name,
            'current_file': None
        }
        
        # Démarrer le nettoyage dans un thread séparé
        thread = threading.Thread(
            target=CleaningTaskManager._run_cleaning,
            args=(task_id, saved_files, cleaned_dir, batch_name),
            daemon=True
        )
        thread.start()
        
        logger.info(f"🧹 [CleaningTask] Tâche créée: {task_id}")
        return task_id
    
    @staticmethod
    def _run_cleaning(task_id: str, saved_files: dict, cleaned_dir: str, batch_name: str):
        """Exécute le nettoyage avec progression par fichier (25% par fichier)"""
        stats = {
            'rows_read': 0,
            'rows_after_clean': 0,
            'duplicates_removed': 0,
            'total_null_count': 0,
            'output_files': {}
        }
        
        try:
            # ========== Étape 1: tech_data (0% → 25%) ==========
            if saved_files.get('tech_data'):
                cleaning_queue[task_id]['status'] = 'Cleaning'
                cleaning_queue[task_id]['progress'] = 5
                cleaning_queue[task_id]['message'] = 'Processing technical data...'
                cleaning_queue[task_id]['current_file'] = 'technical_data'
                logger.info(f"📊 [CleaningTask] Étape 1/4: Nettoyage des données techniques (0% → 25%)")
                
                stats_tech, output_tech = FileCleaner._clean_tech_data(saved_files['tech_data'], cleaned_dir)
                
                stats['rows_read'] += stats_tech['rows_read']
                stats['rows_after_clean'] += stats_tech['rows_after_clean']
                stats['duplicates_removed'] += stats_tech['duplicates_removed']
                stats['total_null_count'] += stats_tech['total_null_count']
                stats['output_files']['tech_data'] = output_tech
                
                cleaning_queue[task_id]['progress'] = 25
                cleaning_queue[task_id]['message'] = 'Technical data completed'
                logger.info(f"✅ [CleaningTask] Données techniques terminées: {stats_tech['rows_read']} lignes")
            
            # ========== Étape 2: transport (25% → 50%) ==========
            if saved_files.get('transport'):
                cleaning_queue[task_id]['progress'] = 30
                cleaning_queue[task_id]['message'] = 'Processing transport data...'
                cleaning_queue[task_id]['current_file'] = 'transport'
                logger.info(f"📊 [CleaningTask] Étape 2/4: Nettoyage des données transport (25% → 50%)")
                
                stats_transport, output_transport = FileCleaner._clean_transport_data(saved_files['transport'], cleaned_dir)
                
                stats['rows_read'] += stats_transport['rows_read']
                stats['rows_after_clean'] += stats_transport['rows_after_clean']
                stats['duplicates_removed'] += stats_transport['duplicates_removed']
                stats['total_null_count'] += stats_transport['total_null_count']
                stats['output_files']['transport'] = output_transport
                
                cleaning_queue[task_id]['progress'] = 50
                cleaning_queue[task_id]['message'] = 'Transport data completed'
                logger.info(f"✅ [CleaningTask] Données transport terminées: {stats_transport['rows_read']} lignes")
            
            # ========== Étape 3: project (50% → 75%) ==========
            if saved_files.get('project'):
                cleaning_queue[task_id]['progress'] = 55
                cleaning_queue[task_id]['message'] = 'Processing project data...'
                cleaning_queue[task_id]['current_file'] = 'project'
                logger.info(f"📊 [CleaningTask] Étape 3/4: Nettoyage des données projet (50% → 75%)")
                
                stats_project, output_project = FileCleaner._clean_project_data(saved_files['project'], cleaned_dir)
                
                stats['rows_read'] += stats_project['rows_read']
                stats['rows_after_clean'] += stats_project['rows_after_clean']
                stats['duplicates_removed'] += stats_project['duplicates_removed']
                stats['total_null_count'] += stats_project['total_null_count']
                stats['output_files']['project'] = output_project
                
                cleaning_queue[task_id]['progress'] = 75
                cleaning_queue[task_id]['message'] = 'Project data completed'
                logger.info(f"✅ [CleaningTask] Données projet terminées: {stats_project['rows_read']} lignes")
            
            # ========== Étape 4: prices (75% → 100%) ==========
            if saved_files.get('prices'):
                cleaning_queue[task_id]['progress'] = 80
                cleaning_queue[task_id]['message'] = 'Processing prices... (this may take a while)'
                cleaning_queue[task_id]['current_file'] = 'prices'
                logger.info(f"📊 [CleaningTask] Étape 4/4: Nettoyage des prix (75% → 100%)")
                
                stats_prices, output_prices = FileCleaner._clean_prices_data(saved_files['prices'], cleaned_dir)
                
                stats['rows_read'] += stats_prices['rows_read']
                stats['rows_after_clean'] += stats_prices['rows_after_clean']
                stats['duplicates_removed'] += stats_prices['duplicates_removed']
                stats['total_null_count'] += stats_prices['total_null_count']
                stats['output_files']['prices'] = output_prices
                
                cleaning_queue[task_id]['progress'] = 100
                cleaning_queue[task_id]['message'] = 'Prices completed'
                logger.info(f"✅ [CleaningTask] Données prix terminées: {stats_prices['rows_read']} lignes")
            
            # ========== Finalisation ==========
            cleaning_queue[task_id]['status'] = 'Completed'
            cleaning_queue[task_id]['message'] = f'Cleaning completed successfully'
            cleaning_queue[task_id]['current_file'] = None
            cleaning_queue[task_id]['result'] = {
                'stats': {
                    'rows_read': stats['rows_read'],
                    'rows_after_clean': stats['rows_after_clean'],
                    'duplicates_removed': stats['duplicates_removed'],
                    'total_null_count': stats['total_null_count']
                },
                'cleaned_files': stats['output_files'],
                'batch_name': batch_name
            }
            
            # Supprimer les fichiers temporaires
            for file_path in saved_files.values():
                if os.path.exists(file_path):
                    os.remove(file_path)
                    logger.info(f"🗑️ [CleaningTask] Fichier temporaire supprimé: {os.path.basename(file_path)}")
            
            temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_uploads')
            shutil.rmtree(temp_dir, ignore_errors=True)
            
            logger.info(f"✅ [CleaningTask] Tâche {task_id} terminée avec succès")
            logger.info(f"📊 [CleaningTask] Résumé final: {stats['rows_read']} lignes lues, {stats['rows_after_clean']} après nettoyage")
            
        except Exception as e:
            cleaning_queue[task_id]['status'] = 'Failed'
            cleaning_queue[task_id]['error'] = str(e)
            cleaning_queue[task_id]['message'] = f'Cleaning failed: {str(e)}'
            logger.error(f"❌ [CleaningTask] Tâche {task_id} échouée: {str(e)}")
            import traceback
            logger.error(f"📋 [Traceback] {traceback.format_exc()}")
    
    @staticmethod
    def get_task_status(task_id: str) -> dict:
        """Retourne le statut d'une tâche de nettoyage"""
        task = cleaning_queue.get(task_id)
        if not task:
            return {
                'status': 'Failed',
                'progress': 0,
                'message': 'Task not found',
                'error': 'Invalid task ID'
            }
        
        response = {
            'status': task['status'],
            'progress': task['progress'],
            'message': task['message'],
            'error': task.get('error'),
            'current_file': task.get('current_file')
        }
        
        # Si la tâche est terminée, ajouter les résultats
        if task['status'] == 'Completed' and task.get('result'):
            response['result'] = task['result']
        
        return response


class FileCleanStartView(APIView):
    """API pour démarrer le nettoyage asynchrone"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        logger.info("=" * 60)
        logger.info("📥 [Nettoyage Async] Réception de la requête")
        logger.info(f"📋 [Headers] Content-Type: {request.content_type}")
        
        # Vérifier les fichiers reçus
        logger.info("📁 [Fichiers reçus] Liste des fichiers dans la requête:")
        for key, file in request.FILES.items():
            if isinstance(file, UploadedFile):
                logger.info(f"   - {key}: {file.name} (taille: {file.size} bytes, type: {file.content_type})")
        
        serializer = FileUploadSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"❌ [Erreur validation] {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Création des dossiers
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_uploads')
        cleaned_dir = os.path.join(settings.MEDIA_ROOT, 'cleaned_files')
        os.makedirs(temp_dir, exist_ok=True)
        os.makedirs(cleaned_dir, exist_ok=True)
        
        saved_files = {}
        
        try:
            # Sauvegarde des fichiers temporaires
            files = {
                'tech_data': request.FILES.get('file_tech'),
                'transport': request.FILES.get('file_transport'),
                'project': request.FILES.get('file_project'),
                'prices': request.FILES.get('file_prices')
            }
            
            for key, file in files.items():
                if file:
                    logger.info(f"💾 [Sauvegarde] {key} - Début sauvegarde...")
                    file_path = default_storage.save(
                        os.path.join(temp_dir, f"{key}_{file.name}"),
                        file
                    )
                    full_path = os.path.join(settings.MEDIA_ROOT, file_path)
                    saved_files[key] = full_path
                    logger.info(f"✅ [Sauvegarde] {key} sauvegardé: {full_path}")
            
            batch_name = serializer.validated_data['batch_name']
            
            # Créer la tâche de nettoyage asynchrone
            task_id = CleaningTaskManager.create_task(saved_files, cleaned_dir, batch_name)
            
            logger.info(f"✅ [Nettoyage Async] Tâche créée: {task_id}")
            logger.info("=" * 60)
            
            return Response({
                'success': True,
                'task_id': task_id,
                'message': 'Cleaning started successfully'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ [Erreur] {str(e)}")
            shutil.rmtree(temp_dir, ignore_errors=True)
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FileCleanStatusView(APIView):
    """API pour vérifier le statut du nettoyage asynchrone"""
    permission_classes = [AllowAny]
    
    def get(self, request, task_id):
        logger.info(f"🔄 [Polling Nettoyage] Vérification statut task {task_id}")
        status_data = CleaningTaskManager.get_task_status(task_id)
        
        # Si la tâche est terminée, retourner les résultats
        if status_data.get('status') == 'Completed' and status_data.get('result'):
            result = status_data['result']
            logger.info(f"✅ [Nettoyage] Terminé - Stats: {result['stats']}")
            return Response({
                'status': 'Completed',
                'progress': 100,
                'message': status_data.get('message'),
                'stats': result['stats'],
                'cleaned_files': result['cleaned_files'],
                'batch_name': result['batch_name']
            })
        
        logger.info(f"📊 [Nettoyage] Statut: {status_data.get('status')} - Progression: {status_data.get('progress')}% - Fichier: {status_data.get('current_file')}")
        
        return Response({
            'status': status_data.get('status'),
            'progress': status_data.get('progress'),
            'message': status_data.get('message'),
            'error': status_data.get('error'),
            'current_file': status_data.get('current_file')
        }, status=status.HTTP_200_OK)


class FileImportStartView(APIView):
    """API pour démarrer l'import asynchrone"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        logger.info("=" * 60)
        logger.info("🚀 [Import Start] Démarrage de l'import asynchrone")
        
        # Récupérer les données du body de la requête
        cleaned_files = request.data.get('cleaned_files')
        batch_name = request.data.get('batch_name')
        cleaning_stats = request.data.get('cleaning_stats')  # ← Récupérer les stats de nettoyage
        
        logger.info(f"📁 [Cleaned files reçus] {cleaned_files}")
        logger.info(f"🏷️ [Batch name] {batch_name}")
        logger.info(f"📊 [Cleaning stats reçues] {cleaning_stats}")
        
        if not cleaned_files or not batch_name:
            logger.error("❌ [Erreur] Aucun fichier nettoyé fourni")
            return Response({
                'success': False,
                'error': 'No cleaned files provided. Please run cleaning first.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Passer les statistiques de nettoyage à la tâche d'import
            task_id = ImportTaskManager.create_task(cleaned_files, batch_name, cleaning_stats)
            logger.info(f"✅ [Tâche créée] Task ID: {task_id}")
            
            logger.info("=" * 60)
            
            return Response({
                'task_id': task_id
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"❌ [Erreur] {str(e)}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FileImportStatusView(APIView):
    """API pour vérifier le statut d'un import"""
    permission_classes = [AllowAny]
    
    def get(self, request, task_id):
        logger.info(f"🔄 [Polling Import] Vérification statut task {task_id}")
        status_data = ImportTaskManager.get_task_status(task_id)
        logger.info(f"📊 [Statut] {status_data.get('status')} - Progression: {status_data.get('progress')}%")
        return Response(status_data, status=status.HTTP_200_OK)


class FileCleanCancelView(APIView):
    """API pour annuler un nettoyage en cours"""
    permission_classes = [AllowAny]
    
    def post(self, request, task_id):
        logger.info(f"❌ [Annulation] Demande d'annulation pour task {task_id}")
        
        task = cleaning_queue.get(task_id)
        if not task:
            return Response({
                'success': False,
                'error': 'Task not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Marquer la tâche comme annulée
        cleaning_queue[task_id]['status'] = 'Cancelled'
        cleaning_queue[task_id]['message'] = 'Cleaning cancelled by user'
        cleaning_queue[task_id]['error'] = 'Cancelled by user'
        
        # Nettoyer les fichiers temporaires
        saved_files = task.get('saved_files', {})
        for file_path in saved_files.values():
            if file_path and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    logger.info(f"🗑️ [Annulation] Fichier temporaire supprimé: {file_path}")
                except Exception as e:
                    logger.error(f"Erreur suppression {file_path}: {e}")
        
        # Nettoyer le dossier temp_uploads
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp_uploads')
        shutil.rmtree(temp_dir, ignore_errors=True)
        
        logger.info(f"✅ [Annulation] Tâche {task_id} annulée avec succès")
        
        return Response({
            'success': True,
            'message': 'Cleaning cancelled successfully'
        }, status=status.HTTP_200_OK)