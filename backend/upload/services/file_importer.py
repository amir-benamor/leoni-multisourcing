import csv
from decimal import Decimal
from django.db import transaction
from component.models import (
    UploadBatch, PartTechnicalData, PartTransportReceipt,
    PartProjectUsage, PartPrice
)
from historique.models import ImportHistory
from typing import Dict, Any, Callable
from datetime import datetime
import gc
import os
import logging

logger = logging.getLogger(__name__)

class FileImporter:
    """Import des fichiers CSV nettoyés en CASCADE avec progression"""
    
    BATCH_SIZE = 5000
    
    @classmethod
    def import_all_files(cls, cleaned_files: Dict[str, str], batch_name: str, 
                         progress_callback: Callable = None, cleaning_stats: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Import en cascade avec mise à jour de progression
        Chaque batch a sa propre transaction (pas de transaction globale)
        
        Args:
            cleaned_files: Dictionnaire des chemins des fichiers nettoyés
            batch_name: Nom du batch
            progress_callback: Callback pour la progression
            cleaning_stats: Statistiques de nettoyage (rows_read, rows_after_clean, etc.)
        """
        
        logger.info("=" * 60)
        logger.info("🚀 [FileImporter] Début de l'import")
        logger.info(f"📁 [Fichiers] {list(cleaned_files.keys())}")
        logger.info(f"🏷️ [Batch] {batch_name}")
        
        # Enregistrer le début de l'import
        start_time = datetime.now()
        
        # Création du batch (hors transaction)
        batch = UploadBatch.objects.create(
            batch_name=batch_name,
            is_recent=True
        )
        
        UploadBatch.objects.exclude(id=batch.id).update(is_recent=False)
        
        history = ImportHistory.objects.create(
            batch=batch,
            status='processing',
            filename_tech=cleaned_files.get('tech_data', '').split('/')[-1] if cleaned_files.get('tech_data') else None,
            filename_transport=cleaned_files.get('transport', '').split('/')[-1] if cleaned_files.get('transport') else None,
            filename_project=cleaned_files.get('project', '').split('/')[-1] if cleaned_files.get('project') else None,
            filename_prices=cleaned_files.get('prices', '').split('/')[-1] if cleaned_files.get('prices') else None
        )
        
        # Ajouter les statistiques de nettoyage si fournies
        if cleaning_stats:
            history.rows_read = cleaning_stats.get('rows_read', 0)
            history.rows_after_clean = cleaning_stats.get('rows_after_clean', 0)
            history.duplicates_removed = cleaning_stats.get('duplicates_removed', 0)
            history.total_null_count = cleaning_stats.get('total_null_count', 0)
            history.save()
            logger.info(f"📊 [Stats Nettoyage] Rows read: {history.rows_read}, After clean: {history.rows_after_clean}")
        
        results = {
            'tech_data': {'imported': 0, 'failed': 0},
            'transport': {'imported': 0, 'failed': 0},
            'project': {'imported': 0, 'failed': 0},
            'prices': {'imported': 0, 'failed': 0}
        }
        
        # Compteurs cumulés pour les erreurs
        total_imported = 0
        total_errors = 0
        total_warnings = 0
        
        try:
            # ========== 1. Import tech_data (0% → 25%) ==========
            if cleaned_files.get('tech_data') and os.path.exists(cleaned_files['tech_data']):
                logger.info("📊 [Phase 1/4] Import des données techniques...")
                
                if progress_callback:
                    progress_callback('Importing', 5, 0, 0, 0, 0, 'Importing technical data...')
                
                results['tech_data'] = cls._import_tech_data(cleaned_files['tech_data'], batch)
                
                total_imported += results['tech_data']['imported']
                total_errors += results['tech_data']['failed']
                
                logger.info(f"✅ [Tech Data] Importé: {results['tech_data']['imported']}, Échecs: {results['tech_data']['failed']}")
                
                if progress_callback:
                    progress_callback('Importing', 25, 0, results['tech_data']['imported'], 
                                    total_errors, total_warnings, 'Technical data imported')
                gc.collect()
            else:
                logger.warning("⚠️ [Tech Data] Fichier non trouvé, ignoré")
            
            # ========== 2. Import transport (25% → 50%) ==========
            if cleaned_files.get('transport') and os.path.exists(cleaned_files['transport']):
                logger.info("📊 [Phase 2/4] Import des données transport...")
                
                if progress_callback:
                    progress_callback('Importing', 30, 0, 0, total_errors, 0, 'Importing transport data...')
                
                results['transport'] = cls._import_transport_data(cleaned_files['transport'], batch)
                
                total_imported += results['transport']['imported']
                total_errors += results['transport']['failed']
                
                logger.info(f"✅ [Transport] Importé: {results['transport']['imported']}, Échecs: {results['transport']['failed']}")
                
                if progress_callback:
                    progress_callback('Importing', 50, 0, results['transport']['imported'],
                                    total_errors, total_warnings, 'Transport data imported')
                gc.collect()
            else:
                logger.warning("⚠️ [Transport] Fichier non trouvé, ignoré")
            
            # ========== 3. Import project (50% → 75%) ==========
            if cleaned_files.get('project') and os.path.exists(cleaned_files['project']):
                logger.info("📊 [Phase 3/4] Import des données projet...")
                
                if progress_callback:
                    progress_callback('Importing', 55, 0, 0, total_errors, 0, 'Importing project data...')
                
                results['project'] = cls._import_project_data(cleaned_files['project'], batch)
                
                total_imported += results['project']['imported']
                total_errors += results['project']['failed']
                
                logger.info(f"✅ [Project] Importé: {results['project']['imported']}, Échecs: {results['project']['failed']}")
                
                if progress_callback:
                    progress_callback('Importing', 75, 0, results['project']['imported'],
                                    total_errors, total_warnings, 'Project data imported')
                gc.collect()
            else:
                logger.warning("⚠️ [Project] Fichier non trouvé, ignoré")
            
            # ========== 4. Import prices (75% → 100%) ==========
            if cleaned_files.get('prices') and os.path.exists(cleaned_files['prices']):
                logger.info("📊 [Phase 4/4] Import des prix...")
                
                if progress_callback:
                    progress_callback('Importing', 80, 0, 0, total_errors, 0, 'Importing prices...')
                
                results['prices'] = cls._import_prices_data(cleaned_files['prices'], batch)
                
                total_imported += results['prices']['imported']
                total_errors += results['prices']['failed']
                
                logger.info(f"✅ [Prices] Importé: {results['prices']['imported']}, Échecs: {results['prices']['failed']}")
                
                if progress_callback:
                    progress_callback('Importing', 100, 0, results['prices']['imported'],
                                    total_errors, total_warnings, 'Import completed')
                gc.collect()
            else:
                logger.warning("⚠️ [Prices] Fichier non trouvé, ignoré")
            
            # ========== Mise à jour de l'historique avec les statistiques ==========
            end_time = datetime.now()
            duration_seconds = int((end_time - start_time).total_seconds())
            
            history.imported_rows = total_imported
            history.error_count = total_errors
            history.warning_count = total_warnings
            history.completed_at = end_time
            history.duration_seconds = duration_seconds
            history.status = 'completed'
            history.save()
            
            logger.info("=" * 60)
            logger.info("✅ [FileImporter] Import terminé avec succès")
            logger.info(f"📊 [Résumé] Importé: {total_imported}, Erreurs: {total_errors}, Durée: {duration_seconds}s")
            logger.info(f"📊 [Résultats détaillés] {results}")
            
            return {
                'success': True,
                'batch_id': batch.id,
                'batch_name': batch.batch_name,
                'results': results,
                'stats': {
                    'imported': total_imported,
                    'errors': total_errors,
                    'warnings': total_warnings,
                    'duration_seconds': duration_seconds
                }
            }
            
        except Exception as e:
            logger.error(f"❌ [FileImporter] Erreur lors de l'import: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            
            history.status = 'failed'
            history.error_details = str(e)
            history.completed_at = datetime.now()
            history.save()
            # Ne pas supprimer le batch, garder la trace
            raise Exception(f"Import failed: {str(e)}")
    
    @classmethod
    def _import_tech_data(cls, file_path: str, batch: UploadBatch) -> Dict[str, int]:
        """Import des données techniques - Transaction par batch"""
        imported, failed = 0, 0
        objects_to_create = []
        
        logger.info(f"📖 [Tech Data] Lecture du fichier: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    obj = PartTechnicalData(
                        leoni_part_number=row.get('leoni_part_number'),
                        fors_material_group=row.get('fors_material_group'),
                        fors_classification=row.get('fors_classification'),
                        s4_description=row.get('s4_description'),
                        supplier_group=row.get('supplier_group'),
                        supplier_part_number=row.get('supplier_part_number'),
                        multisourcing_status=row.get('multisourcing_status'),
                        compatibility_status=row.get('compatibility_status'),
                        multisourcing_number=row.get('multisourcing_number')
                    )
                    objects_to_create.append(obj)
                    imported += 1
                    
                    if len(objects_to_create) >= cls.BATCH_SIZE:
                        with transaction.atomic():
                            PartTechnicalData.objects.bulk_create(objects_to_create, ignore_conflicts=False)
                        objects_to_create = []
                        gc.collect()
                        logger.info(f"   ↳ Batch importé: {imported} lignes")
                        
                except Exception as e:
                    failed += 1
                    logger.warning(f"   ⚠️ Erreur ligne {imported + failed}: {str(e)[:100]}")
        
        if objects_to_create:
            with transaction.atomic():
                PartTechnicalData.objects.bulk_create(objects_to_create, ignore_conflicts=False)
        
        logger.info(f"📊 [Tech Data] Terminé - Importé: {imported}, Échecs: {failed}")
        return {'imported': imported, 'failed': failed}
    
    @classmethod
    def _import_transport_data(cls, file_path: str, batch: UploadBatch) -> Dict[str, int]:
        """Import des données transport - Transaction par batch"""
        imported, failed = 0, 0
        objects_to_create = []
        
        logger.info(f"📖 [Transport] Lecture du fichier: {file_path}")
        
        existing_parts = set(PartTechnicalData.objects.values_list('leoni_part_number', flat=True))
        part_cache = {}
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    part_number = row.get('part_number')
                    if not part_number or part_number not in existing_parts:
                        failed += 1
                        continue
                    
                    if part_number not in part_cache:
                        part_cache[part_number] = PartTechnicalData.objects.get(leoni_part_number=part_number)
                    
                    obj = PartTransportReceipt(
                        batch=batch,
                        part=part_cache[part_number],
                        lokid=row.get('lokid', '') or '',
                        location_country=row.get('location_country', '') or '',
                        location_region=row.get('location_region', '') or '',
                        annual_volume=Decimal(row.get('annual_volume', 0) or 0)
                    )
                    objects_to_create.append(obj)
                    imported += 1
                    
                    if len(objects_to_create) >= cls.BATCH_SIZE:
                        with transaction.atomic():
                            PartTransportReceipt.objects.bulk_create(objects_to_create)
                        objects_to_create = []
                        gc.collect()
                        logger.info(f"   ↳ Batch importé: {imported} lignes")
                        
                except Exception as e:
                    failed += 1
                    logger.warning(f"   ⚠️ Erreur ligne {imported + failed}: {str(e)[:100]}")
        
        if objects_to_create:
            with transaction.atomic():
                PartTransportReceipt.objects.bulk_create(objects_to_create)
        
        logger.info(f"📊 [Transport] Terminé - Importé: {imported}, Échecs: {failed}")
        return {'imported': imported, 'failed': failed}
    
    @classmethod
    def _import_project_data(cls, file_path: str, batch: UploadBatch) -> Dict[str, int]:
        """Import des données projet - Transaction par batch"""
        imported, failed = 0, 0
        objects_to_create = []
        
        logger.info(f"📖 [Project] Lecture du fichier: {file_path}")
        
        existing_parts = set(PartTechnicalData.objects.values_list('leoni_part_number', flat=True))
        part_cache = {}
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    part_number = row.get('part_number')
                    if not part_number or part_number not in existing_parts:
                        failed += 1
                        continue
                    
                    if part_number not in part_cache:
                        part_cache[part_number] = PartTechnicalData.objects.get(leoni_part_number=part_number)
                    
                    obj = PartProjectUsage(
                        batch=batch,
                        part=part_cache[part_number],
                        lokid=row.get('lokid', '') or '',
                        oem_brand=row.get('oem_brand', '') or '',
                        project_name=row.get('project_name', '') or '',
                        monthly_sum_volume=Decimal(row.get('monthly_sum_volume', 0) or 0)
                    )
                    objects_to_create.append(obj)
                    imported += 1
                    
                    if len(objects_to_create) >= cls.BATCH_SIZE:
                        with transaction.atomic():
                            PartProjectUsage.objects.bulk_create(objects_to_create)
                        objects_to_create = []
                        gc.collect()
                        logger.info(f"   ↳ Batch importé: {imported} lignes")
                        
                except Exception as e:
                    failed += 1
                    logger.warning(f"   ⚠️ Erreur ligne {imported + failed}: {str(e)[:100]}")
        
        if objects_to_create:
            with transaction.atomic():
                PartProjectUsage.objects.bulk_create(objects_to_create)
        
        logger.info(f"📊 [Project] Terminé - Importé: {imported}, Échecs: {failed}")
        return {'imported': imported, 'failed': failed}
    
    @classmethod
    def _import_prices_data(cls, file_path: str, batch: UploadBatch) -> Dict[str, int]:
        """Import des prix - Transaction par batch avec fallback pour les locks"""
        imported, failed = 0, 0
        objects_to_create = []
        
        logger.info(f"📖 [Prices] Lecture du fichier: {file_path}")
        
        existing_parts = set(PartTechnicalData.objects.values_list('leoni_part_number', flat=True))
        part_cache = {}
        
        # Date par défaut pour les dates manquantes
        default_date = datetime.now().date()
        
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row_num, row in enumerate(reader, start=2):
                try:
                    part_number = row.get('part_number')
                    if not part_number or part_number not in existing_parts:
                        failed += 1
                        continue
                    
                    if part_number not in part_cache:
                        part_cache[part_number] = PartTechnicalData.objects.get(leoni_part_number=part_number)
                    
                    # Gestion de la date
                    price_date_str = row.get('price_date', '')
                    price_date = default_date
                    if price_date_str and price_date_str.strip():
                        try:
                            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y%m%d']:
                                try:
                                    price_date = datetime.strptime(price_date_str.strip(), fmt).date()
                                    break
                                except ValueError:
                                    continue
                        except Exception:
                            pass
                    
                    # Récupérer price_eur depuis le CSV
                    price_eur_str = row.get('price_eur', '')
                    price_eur = None
                    if price_eur_str and price_eur_str.strip():
                        try:
                            price_eur = Decimal(price_eur_str.replace(',', '.'))
                        except:
                            price_eur = None
                    
                    # Récupérer full_price depuis le CSV
                    full_price_str = row.get('full_price', '')
                    full_price = Decimal(0)
                    if full_price_str and full_price_str.strip():
                        try:
                            full_price = Decimal(full_price_str.replace(',', '.'))
                        except:
                            full_price = Decimal(0)
                    
                    obj = PartPrice(
                        batch=batch,
                        part=part_cache[part_number],
                        server_id=row.get('server_id', '') or '',
                        price_date=price_date,
                        lokid=row.get('lokid', '') or '',
                        price_eur=price_eur,
                        full_price=full_price,
                        currency=row.get('currency', '') or ''
                    )
                    objects_to_create.append(obj)
                    imported += 1
                    
                    if len(objects_to_create) >= cls.BATCH_SIZE:
                        try:
                            with transaction.atomic():
                                PartPrice.objects.bulk_create(objects_to_create)
                            objects_to_create = []
                            gc.collect()
                            logger.info(f"   ↳ Batch importé: {imported} lignes")
                        except Exception as batch_error:
                            logger.error(f"   ❌ Batch échoué: {str(batch_error)[:100]}")
                            failed += len(objects_to_create)
                            objects_to_create = []
                        
                except Exception as e:
                    failed += 1
                    if failed <= 10:
                        logger.warning(f"   ⚠️ Ligne {row_num}: {str(e)[:100]}")
        
        if objects_to_create:
            try:
                with transaction.atomic():
                    PartPrice.objects.bulk_create(objects_to_create)
            except Exception as batch_error:
                logger.error(f"   ❌ Dernier batch échoué: {str(batch_error)[:100]}")
                failed += len(objects_to_create)
        
        logger.info(f"📊 [Prices] Terminé - Importé: {imported}, Échecs: {failed}")
        return {'imported': imported, 'failed': failed}