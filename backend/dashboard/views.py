# dashboard/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db import connection


def parse_multisourcing_status(status_string):
    """Parse la colonne multisourcing_status"""
    if not status_string:
        return 'Not released'
    released_count = status_string.count('=Released')
    not_released_count = status_string.count('=Not released')
    return 'Released' if released_count >= not_released_count else 'Not released'


def get_best_availability(parts_data):
    """Détermine le meilleur statut parmi les composants d'un MS group"""
    if len(parts_data) <= 1:
        return 'Unsecured', 'gray', 0
    
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
    
    return 'Unsecured', 'gray', 0


class DashboardView(APIView):
    """
    API Dashboard - Vue exécutive
    GET /api/dashboard/?customer=BMW&region=EMEA
    """
    permission_classes = [AllowAny]
    
    def get(self, request):
        customer = request.query_params.get('customer', '')
        region = request.query_params.get('region', '')
        
        if not customer or not region:
            return Response({
                'success': False,
                'error': 'Customer and region are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Requête principale : tous les composants filtrés
        query = """
            SELECT 
                pt.leoni_part_number,
                pt.supplier_group,
                pt.multisourcing_number,
                pt.multisourcing_status,
                pt.compatibility_status,
                COALESCE(SUM(tr.annual_volume), 0) as annual_volume
            FROM component_parttechnicaldata pt
            INNER JOIN component_partprojectusage pu 
                ON pt.leoni_part_number = pu.part_id
            INNER JOIN component_parttransportreceipt tr 
                ON pt.leoni_part_number = tr.part_id
            WHERE pu.oem_brand = %s
              AND tr.location_region = %s
              AND pt.multisourcing_number IS NOT NULL
              AND pt.multisourcing_number != ''
            GROUP BY pt.leoni_part_number, pt.supplier_group, pt.multisourcing_number,
                     pt.multisourcing_status, pt.compatibility_status
        """
        
        with connection.cursor() as cursor:
            cursor.execute(query, [customer, region])
            rows = cursor.fetchall()
        
        if not rows:
            return Response({
                'success': True,
                'data': {
                    'kpis': [],
                    'maturity': [],
                    'maturityTotalGroups': 0,
                    'marketShare': [],
                    'concentrationHotspots': []
                }
            })
        
        # Organiser par MS group
        ms_groups = {}
        supplier_parts = {}
        total_volume = 0
        
        for row in rows:
            pn = row[0]
            supplier = row[1] or 'Unknown'
            ms_number = row[2] or ''
            ms_status = row[3] or ''
            compatibility = row[4] or ''
            volume = int(row[5]) if row[5] else 0
            
            total_volume += volume
            
            # Par MS group
            if ms_number not in ms_groups:
                ms_groups[ms_number] = {
                    'parts': [],
                    'total_volume': 0,
                    'supplier_volumes': {}
                }
            ms_groups[ms_number]['parts'].append({
                'ms_status': ms_status,
                'compatibility': compatibility,
                'volume': volume,
                'supplier': supplier
            })
            ms_groups[ms_number]['total_volume'] += volume
            
            if supplier not in ms_groups[ms_number]['supplier_volumes']:
                ms_groups[ms_number]['supplier_volumes'][supplier] = 0
            ms_groups[ms_number]['supplier_volumes'][supplier] += volume
            
            # Par supplier (market share)
            if supplier not in supplier_parts:
                supplier_parts[supplier] = 0
            supplier_parts[supplier] += 1
        
        # ========== KPIs ==========
        ms_groups_count = len(ms_groups)
        single_source_count = sum(1 for ms, data in ms_groups.items() if len(data['parts']) <= 1)
        
        kpis = [
            {
                'key': 'msGroups',
                'title': 'MS groups in scope',
                'value': str(ms_groups_count),
                'helper': 'Current multisourcing perimeter',
                'tone': 'neutral',
            },
            {
                'key': 'criticalSingleSource',
                'title': 'Critical single-source items',
                'value': str(single_source_count),
                'helper': 'Groups with no alternative available',
                'tone': 'critical',
            },
            {
                'key': 'totalVolume',
                'title': 'Total annual volume',
                'value': f'{total_volume / 1_000_000:.1f}M',
                'helper': 'Annual volume in the selected scope',
                'tone': 'positive',
            },
        ]
        
        # ========== Maturity (Donut) ==========
        released_ready = 0
        technical_only = 0
        unsecured = 0
        
        for ms_number, data in ms_groups.items():
            if len(data['parts']) <= 1:
                unsecured += 1
            else:
                best, color, rank = get_best_availability(data['parts'])
                if best == 'Released (Compatible)':
                    released_ready += 1
                else:
                    technical_only += 1
        
        total_groups = ms_groups_count
        
        maturity = [
            {
                'name': 'Released-ready',
                'value': round((released_ready / total_groups) * 100, 1) if total_groups > 0 else 0,
                'count': released_ready,
                'color': '#3460AA'
            },
            {
                'name': 'Technical-only',
                'value': round((technical_only / total_groups) * 100, 1) if total_groups > 0 else 0,
                'count': technical_only,
                'color': '#84ADDD'
            },
            {
                'name': 'Unsecured',
                'value': round((unsecured / total_groups) * 100, 1) if total_groups > 0 else 0,
                'count': unsecured,
                'color': '#DBE7F7'
            }
        ]
        
        # ========== Market Share ==========
        total_parts = sum(supplier_parts.values())
        market_share = []
        for supplier, count in sorted(supplier_parts.items(), key=lambda x: x[1], reverse=True)[:5]:
            market_share.append({
                'supplier': supplier,
                'share': round((count / total_parts) * 100, 1) if total_parts > 0 else 0
            })
        
        # ========== Concentration Hotspots ==========
        # Dans dashboard/views.py, section Concentration Hotspots

        # Remplacer [:20] par [:10] et supprimer le filtre "single source"
        hotspots = []
        for ms_number, data in sorted(ms_groups.items(), key=lambda x: x[1]['total_volume'], reverse=True)[:10]:
            # Dominant supplier
            dominant = max(data['supplier_volumes'].items(), key=lambda x: x[1])
            dominant_supplier = dominant[0]
            dominant_volume = dominant[1]
            supplier_share = round((dominant_volume / data['total_volume']) * 100, 1) if data['total_volume'] > 0 else 0
            
            best, color, rank = get_best_availability(data['parts'])
            
            hotspots.append({
                'msNumber': ms_number,
                'dominantSupplier': dominant_supplier,
                'supplierShare': supplier_share,
                'bestAvailability': best,
                'annualVolume': data['total_volume'],
                'href': f'/app/explore?ms={ms_number}'
            })
        
        return Response({
            'success': True,
            'data': {
                'kpis': kpis,
                'maturity': maturity,
                'maturityTotalGroups': total_groups,
                'marketShare': market_share,
                'concentrationHotspots': hotspots
            }
        }, status=status.HTTP_200_OK)