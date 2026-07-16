from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db import connection
import logging
from component.models import PartTechnicalData, PartProjectUsage, UploadBatch
from .serializers import (
    GlobalFiltersResponseSerializer,
    ClassificationsResponseSerializer,
    CoverageResponseSerializer,
    MarketShareResponseSerializer,
    StatusMatrixResponseSerializer,
    ResultsResponseSerializer
)

logger = logging.getLogger(__name__)


# ========== FONCTIONS UTILITAIRES ==========

def parse_multisourcing_status(status_string):
    """
    Parse la colonne multisourcing_status
    Ex: "LAND ROVER=Not released, DAF=Not released, VOLKSWAGEN=Released"
    Retourne 'Released' ou 'Not released'
    """
    if not status_string:
        return 'Not released'
    
    released_count = status_string.count('=Released')
    not_released_count = status_string.count('=Not released')
    
    if released_count >= not_released_count:
        return 'Released'
    else:
        return 'Not released'


def get_ms_group_status(parts):
    """
    Détermine le statut global d'un MS group
    parts = liste de strings (multisourcing_status)
    Retourne 'Released' ou 'Not released'
    """
    released_count = 0
    not_released_count = 0
    
    for ms_status in parts:
        status = parse_multisourcing_status(ms_status or '')
        if status == 'Released':
            released_count += 1
        else:
            not_released_count += 1
    
    return 'Released' if released_count >= not_released_count else 'Not released'


def get_best_availability_for_parts(parts_data):
    """
    Détermine le meilleur statut parmi une liste de composants
    parts_data = liste de dicts avec 'ms_status' et 'compatibility'
    Retourne (status_label, color, rank)
    """
    has_released_compatible = False
    has_released_interface = False
    has_not_released_compatible = False
    has_not_released_interface = False
    
    for part in parts_data:
        ms_status = parse_multisourcing_status(part.get('ms_status', '') or '')
        compatibility = (part.get('compatibility', '') or '').lower().strip()
        
        if ms_status == 'Released' and compatibility == 'compatible':
            has_released_compatible = True
        elif ms_status == 'Released' and 'interface' in compatibility:
            has_released_interface = True
        elif ms_status == 'Not released' and compatibility == 'compatible':
            has_not_released_compatible = True
        elif ms_status == 'Not released' and 'interface' in compatibility:
            has_not_released_interface = True
    
    if has_released_compatible:
        return 'Released (Compatible)', 'green', 1
    elif has_released_interface:
        return 'Released (Compatible interface)', 'blue', 2
    elif has_not_released_compatible:
        return 'Not released (Compatible)', 'yellow', 3
    elif has_not_released_interface:
        return 'Not released (Compatible interface)', 'red', 4
    
    # Si aucun statut trouvé
    return 'No alternative', 'gray', 0

def get_color_for_cell(ms_status_raw, compatibility):
    """
    Détermine la couleur d'une cellule de la matrice
    """
    ms_status = parse_multisourcing_status(ms_status_raw or '')
    compatibility = (compatibility or '').lower().strip()
    
    if ms_status == 'Released' and compatibility == 'compatible':
        return 'green', 'released-compatible'
    elif ms_status == 'Released' and 'interface' in compatibility:
        return 'blue', 'released-interface'
    elif ms_status == 'Not released' and compatibility == 'compatible':
        return 'yellow', 'technical-compatible'
    elif ms_status == 'Not released' and 'interface' in compatibility:
        return 'red', 'technical-interface'
    
    return None, None


# ========== VIEWS ==========

class GlobalFiltersView(APIView):
    """API pour les filtres globaux"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        customers = list(
            PartProjectUsage.objects
            .exclude(oem_brand__isnull=True)
            .exclude(oem_brand='')
            .values_list('oem_brand', flat=True)
            .distinct()
            .order_by('oem_brand')
        )
        
        regions = ['EMEA', 'AMERICAS', 'ASIA']
        
        snapshots = []
        latest_batches = UploadBatch.objects.order_by('-upload_date')[:2]
        
        for i, batch in enumerate(latest_batches):
            snapshots.append({
                'id': batch.id,
                'name': batch.batch_name,
                'is_latest': i == 0
            })
        
        if not snapshots:
            snapshots = [
                {'id': None, 'name': 'Latest import', 'is_latest': True},
                {'id': None, 'name': 'Previous import', 'is_latest': False}
            ]
        
        response_data = {
            'customers': customers,
            'regions': regions,
            'snapshots': snapshots
        }
        
        serializer = GlobalFiltersResponseSerializer(data={
            'success': True,
            'data': response_data
        })
        serializer.is_valid(raise_exception=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)


class ClassificationsView(APIView):
    """API pour les classifications"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        classifications = list(
            PartTechnicalData.objects
            .exclude(fors_material_group__isnull=True)
            .exclude(fors_material_group='')
            .values_list('fors_material_group', flat=True)
            .distinct()
            .order_by('fors_material_group')
        )
        
        response_data = {
            'classifications': classifications
        }
        
        serializer = ClassificationsResponseSerializer(data={
            'success': True,
            'data': response_data
        })
        serializer.is_valid(raise_exception=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)


class CoverageKpisView(APIView):
    """API pour les KPIs de couverture"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        customer = request.query_params.get('customer', '')
        region = request.query_params.get('region', '')
        material_group = request.query_params.get('material_group', '')
        
        if not customer or not region:
            return Response({
                'success': False,
                'error': 'Customer and region are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        query = """
            SELECT 
                pt.multisourcing_number,
                pt.multisourcing_status,
                pt.leoni_part_number
            FROM component_parttechnicaldata pt
            INNER JOIN component_partprojectusage pu 
                ON pt.leoni_part_number = pu.part_id
            INNER JOIN component_parttransportreceipt tr 
                ON pt.leoni_part_number = tr.part_id
            WHERE pu.oem_brand = %s
              AND tr.location_region = %s
              AND pt.multisourcing_number IS NOT NULL
              AND pt.multisourcing_number != ''
        """
        
        params = [customer, region]
        
        if material_group:
            query += " AND pt.fors_material_group = %s"
            params.append(material_group)
        
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()
        
        # Organiser par MS group avec dédoublonnage
        ms_groups = {}
        seen_parts = set()
        
        for row in rows:
            ms_number = row[0] or ''
            ms_status = row[1] or ''
            part_number = row[2] or ''
            
            key = f"{ms_number}_{part_number}"
            if key in seen_parts:
                continue
            seen_parts.add(key)
            
            if ms_number not in ms_groups:
                ms_groups[ms_number] = []
            ms_groups[ms_number].append(ms_status)
        
        ms_groups_in_scope = len(ms_groups)
        single_source_critical = 0
        released_ready = 0
        
        for ms_number, statuses in ms_groups.items():
            if len(statuses) <= 1:
                single_source_critical += 1
            
            group_status = get_ms_group_status(statuses)
            if group_status == 'Released':
                released_ready += 1
        
        response_data = {
            'filters_applied': {
                'customer': customer,
                'region': region,
                'material_group': material_group or 'All'
            },
            'coverage_kpis': [
                {
                    'key': 'scope',
                    'label': 'MS groups in scope',
                    'value': str(ms_groups_in_scope),
                    'helper': 'Current multisourcing perimeter',
                    'tone': 'neutral'
                },
                {
                    'key': 'critical',
                    'label': 'Single-source critical',
                    'value': str(single_source_critical),
                    'helper': 'Groups with no alternative available',
                    'tone': 'critical'
                },
                {
                    'key': 'released-ready',
                    'label': 'Released-ready MS groups',
                    'value': str(released_ready),
                    'helper': 'Groups with released alternative coverage',
                    'tone': 'positive'
                }
            ]
        }
        
        serializer = CoverageResponseSerializer(data=response_data)
        serializer.is_valid(raise_exception=True)
        
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)


class MarketShareView(APIView):
    """API pour les parts de marché"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        customer = request.query_params.get('customer', '')
        region = request.query_params.get('region', '')
        material_group = request.query_params.get('material_group', '')
        
        if not customer or not region:
            return Response({
                'success': False,
                'error': 'Customer and region are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        market_share_query = """
            SELECT 
                pt.supplier_group as supplier,
                COUNT(DISTINCT pt.leoni_part_number) as part_count
            FROM component_parttechnicaldata pt
            INNER JOIN component_partprojectusage pu 
                ON pt.leoni_part_number = pu.part_id
            INNER JOIN component_parttransportreceipt tr 
                ON pt.leoni_part_number = tr.part_id
            WHERE pu.oem_brand = %s
              AND tr.location_region = %s
              AND pt.supplier_group IS NOT NULL
              AND pt.supplier_group != ''
        """
        
        params = [customer, region]
        
        if material_group:
            market_share_query += " AND pt.fors_material_group = %s"
            params.append(material_group)
        
        market_share_query += """
            GROUP BY pt.supplier_group
            ORDER BY part_count DESC
        """
        
        volume_query = """
            SELECT 
                pt.supplier_group as supplier,
                SUM(tr.annual_volume) as total_volume
            FROM component_parttechnicaldata pt
            INNER JOIN component_partprojectusage pu 
                ON pt.leoni_part_number = pu.part_id
            INNER JOIN component_parttransportreceipt tr 
                ON pt.leoni_part_number = tr.part_id
            WHERE pu.oem_brand = %s
              AND tr.location_region = %s
              AND pt.supplier_group IS NOT NULL
              AND pt.supplier_group != ''
        """
        
        volume_params = [customer, region]
        
        if material_group:
            volume_query += " AND pt.fors_material_group = %s"
            volume_params.append(material_group)
        
        volume_query += """
            GROUP BY pt.supplier_group
            ORDER BY total_volume DESC
        """
        
        with connection.cursor() as cursor:
            cursor.execute(market_share_query, params)
            market_rows = cursor.fetchall()
            
            total_parts = sum(row[1] for row in market_rows) if market_rows else 0
            
            market_share = []
            for row in market_rows:
                supplier = row[0] or 'Unknown'
                part_count = row[1] or 0
                percentage = round((part_count / total_parts) * 100, 1) if total_parts > 0 else 0
                market_share.append({
                    'name': supplier,
                    'value': percentage
                })
            
            cursor.execute(volume_query, volume_params)
            volume_rows = cursor.fetchall()
            
            supplier_volume = []
            for row in volume_rows:
                supplier = row[0] or 'Unknown'
                volume = int(row[1]) if row[1] else 0
                supplier_volume.append({
                    'name': supplier,
                    'value': volume
                })
        
        response_data = {
            'market_share': market_share,
            'supplier_volume': supplier_volume
        }
        
        serializer = MarketShareResponseSerializer(data={
            'success': True,
            'data': response_data
        })
        serializer.is_valid(raise_exception=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)


class StatusMatrixView(APIView):
    """API pour la matrice de statut"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        customer = request.query_params.get('customer', '')
        region = request.query_params.get('region', '')
        material_group = request.query_params.get('material_group', '')
        
        if not customer or not region:
            return Response({
                'success': False,
                'error': 'Customer and region are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        query = """
            SELECT DISTINCT
                pt.leoni_part_number,
                pt.fors_classification,
                pt.supplier_group,
                pt.multisourcing_number,
                pt.multisourcing_status,
                pt.compatibility_status,
                COALESCE(SUM(tr.annual_volume), 0) as total_volume
            FROM component_parttechnicaldata pt
            INNER JOIN component_partprojectusage pu 
                ON pt.leoni_part_number = pu.part_id
            INNER JOIN component_parttransportreceipt tr 
                ON pt.leoni_part_number = tr.part_id
            WHERE pu.oem_brand = %s
              AND tr.location_region = %s
              AND pt.supplier_group IS NOT NULL
              AND pt.supplier_group != ''
        """
        
        params = [customer, region]
        
        if material_group:
            query += " AND pt.fors_material_group = %s"
            params.append(material_group)
        
        query += """
            GROUP BY pt.leoni_part_number, pt.fors_classification, pt.supplier_group,
                     pt.multisourcing_number, pt.multisourcing_status, pt.compatibility_status
        """
        
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()
        
        if not rows:
            response_data = {
                'suppliers': [],
                'rows': [],
                'technical_alternative_pct': 0,
                'released_alternative_pct': 0,
                'total_volume': 0
            }
            serializer = StatusMatrixResponseSerializer(data={
                'success': True,
                'data': response_data
            })
            serializer.is_valid(raise_exception=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        
        parts_by_ms = {}
        all_suppliers = set()
        classification_volumes = {}
        total_volume = 0
        seen_parts = set()
        
        for row in rows:
            part_number = row[0]
            classification = row[1] or 'Unknown'
            supplier = row[2] or 'Unknown'
            ms_number = row[3] or ''
            ms_status = row[4] or ''
            compatibility = row[5] or ''
            volume = int(row[6]) if row[6] else 0
            
            key = f"{ms_number}_{part_number}"
            if key in seen_parts:
                continue
            seen_parts.add(key)
            
            all_suppliers.add(supplier)
            
            if classification not in classification_volumes:
                classification_volumes[classification] = 0
            classification_volumes[classification] += volume
            total_volume += volume
            
            if ms_number not in parts_by_ms:
                parts_by_ms[ms_number] = []
            
            parts_by_ms[ms_number].append({
                'part_number': part_number,
                'classification': classification,
                'supplier': supplier,
                'ms_status': ms_status,
                'compatibility': compatibility,
                'volume': volume
            })
        
        suppliers_list = sorted(list(all_suppliers))
        matrix_rows = []
        
        color_priority = {'green': 1, 'blue': 2, 'yellow': 3, 'red': 4}
        
        volume_by_class_green_yellow = {}
        volume_by_class_green_blue = {}
        
        for classification, class_volume in sorted(classification_volumes.items(), key=lambda x: x[1], reverse=True):
            share = round((class_volume / total_volume) * 100, 2) if total_volume > 0 else 0
            
            cells = {}
            
            for supplier in suppliers_list:
                best_color = None
                best_classification = None
                best_status = None
                
                for ms_number, parts in parts_by_ms.items():
                    has_classification = any(p['classification'] == classification for p in parts)
                    
                    if not has_classification:
                        continue
                    
                    for part in parts:
                        if part['supplier'] == supplier:
                            color, cell_status = get_color_for_cell(part['ms_status'], part['compatibility'])
                            
                            if color and (best_color is None or color_priority.get(color, 99) < color_priority.get(best_color, 99)):
                                best_color = color
                                best_classification = part['classification']
                                best_status = cell_status
                
                if best_color:
                    cells[supplier] = {
                        'classification': best_classification,
                        'color': best_color,
                        'status': best_status
                    }
                    
                    if classification not in volume_by_class_green_yellow:
                        volume_by_class_green_yellow[classification] = 0
                        volume_by_class_green_blue[classification] = 0
                    
                    if best_color in ['green', 'yellow']:
                        volume_by_class_green_yellow[classification] += class_volume
                    
                    if best_color in ['green', 'blue']:
                        volume_by_class_green_blue[classification] += class_volume
                else:
                    cells[supplier] = None
            
            matrix_rows.append({
                'classification': classification,
                'volume2026': class_volume,
                'share': share,
                'cells': cells
            })
        
        total_green_yellow = sum(volume_by_class_green_yellow.values())
        total_green_blue = sum(volume_by_class_green_blue.values())
        
        technical_alternative_pct = round((total_green_yellow / total_volume) * 100, 2) if total_volume > 0 else 0
        released_alternative_pct = round((total_green_blue / total_volume) * 100, 2) if total_volume > 0 else 0
        
        response_data = {
            'suppliers': suppliers_list,
            'rows': matrix_rows,
            'technical_alternative_pct': technical_alternative_pct,
            'released_alternative_pct': released_alternative_pct,
            'total_volume': total_volume
        }
        
        serializer = StatusMatrixResponseSerializer(data={
            'success': True,
            'data': response_data
        })
        serializer.is_valid(raise_exception=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)


class ResultsView(APIView):
    """API pour les résultats MS Groups"""
    permission_classes = [AllowAny]
    
    def get(self, request):
        customer = request.query_params.get('customer', '')
        region = request.query_params.get('region', '')
        material_group = request.query_params.get('material_group', '')
        
        if not customer or not region:
            return Response({
                'success': False,
                'error': 'Customer and region are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        query = """
            SELECT 
                pt.multisourcing_number,
                pt.leoni_part_number,
                pt.multisourcing_status,
                pt.compatibility_status,
                SUM(tr.annual_volume) as total_volume
            FROM component_parttechnicaldata pt
            INNER JOIN component_partprojectusage pu 
                ON pt.leoni_part_number = pu.part_id
            INNER JOIN component_parttransportreceipt tr 
                ON pt.leoni_part_number = tr.part_id
            WHERE pu.oem_brand = %s
              AND tr.location_region = %s
              AND pt.multisourcing_number IS NOT NULL
              AND pt.multisourcing_number != ''
        """
        
        params = [customer, region]
        
        if material_group:
            query += " AND pt.fors_material_group = %s"
            params.append(material_group)
        
        query += """
            GROUP BY pt.multisourcing_number, pt.leoni_part_number, 
                     pt.multisourcing_status, pt.compatibility_status
            ORDER BY pt.multisourcing_number
        """
        
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()
        
        # Organiser par MS Group avec dédoublonnage
        ms_groups_data = {}
        ms_volumes = {}
        seen_parts = set()
        
        for row in rows:
            ms_number = row[0] or 'Unknown'
            part_number = row[1] or ''
            ms_status = row[2] or ''
            compatibility = row[3] or ''
            volume = int(row[4]) if row[4] else 0
            
            key = f"{ms_number}_{part_number}"
            if key in seen_parts:
                continue
            seen_parts.add(key)
            
            if ms_number not in ms_groups_data:
                ms_groups_data[ms_number] = []
                ms_volumes[ms_number] = 0
            
            ms_groups_data[ms_number].append({
                'part_number': part_number,
                'ms_status': ms_status,
                'compatibility': compatibility
            })
            ms_volumes[ms_number] += volume
        
        # Calculer pour chaque MS Group
        ms_groups = []
        
        for ms_number, parts_data in ms_groups_data.items():
            part_count = len(parts_data)
            total_volume = ms_volumes.get(ms_number, 0)
            
            best_availability, best_color, best_rank = get_best_availability_for_parts(parts_data)
            
            ms_groups.append({
                'ms_number': ms_number,
                'alternatives': part_count,
                'best_availability': best_availability,
                'best_availability_rank': best_rank,
                'best_availability_color': best_color,
                'total_volume': total_volume
            })
        
        ms_groups.sort(key=lambda x: x['total_volume'], reverse=True)
        
        response_data = {
            'ms_groups': ms_groups
        }
        
        serializer = ResultsResponseSerializer(data={
            'success': True,
            'data': response_data
        })
        serializer.is_valid(raise_exception=True)
        
        return Response(serializer.data, status=status.HTTP_200_OK)