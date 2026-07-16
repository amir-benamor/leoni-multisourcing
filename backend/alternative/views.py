from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db import connection
from .serializers import PartAlternativeSerializer


def parse_multisourcing_status(status_string):
    """Parse la colonne multisourcing_status"""
    if not status_string:
        return 'Not released'
    
    released_count = status_string.count('=Released')
    not_released_count = status_string.count('=Not released')
    
    return 'Released' if released_count >= not_released_count else 'Not released'


def parse_oem_details(status_string):
    """Retourne le détail par OEM"""
    if not status_string:
        return []
    
    details = []
    parts = status_string.split(',')
    for part in parts:
        part = part.strip()
        if '=' in part:
            oem, status_val = part.split('=', 1)
            details.append({
                'oem': oem.strip(),
                'status': status_val.strip()
            })
    return details


class PartAlternativeView(APIView):
    """
    API pour l'analyse des alternatives d'un MS group
    GET /api/alternative/ms/{ms_number}/?region=EMEA&current_part=P001
    """
    permission_classes = [AllowAny]
    
    REGION_SERVER_PRIORITY = {
        'ASIA': {
            'primary': ['FORS-83', 'FORS-82', 'FORS-84', 'FORS-39'],
            'fallback': ['FORS-00', 'SIGIP-00']
        },
        'EMEA': {
            'primary': ['FORS-00', 'SIGIP-00'],
            'fallback': []
        },
        'AMERICAS': {
            'primary': ['FORS-00', 'SIGIP-00'],
            'fallback': []
        }
    }
    
    def get(self, request, ms_number):
        region = request.query_params.get('region', 'EMEA')
        current_part = request.query_params.get('current_part', '')
        
        # 1. Récupérer tous les composants du MS group
        parts_query = """
            SELECT 
                pt.leoni_part_number,
                pt.supplier_group,
                pt.supplier_part_number,
                pt.fors_material_group,
                pt.compatibility_status,
                pt.multisourcing_status,
                pt.multisourcing_number,
                pt.s4_description,
                COALESCE(SUM(tr.annual_volume), 0) as annual_volume
            FROM component_parttechnicaldata pt
            LEFT JOIN component_parttransportreceipt tr 
                ON pt.leoni_part_number = tr.part_id
            WHERE pt.multisourcing_number = %s
            GROUP BY pt.leoni_part_number, pt.supplier_group, pt.supplier_part_number,
                     pt.fors_material_group, pt.compatibility_status, 
                     pt.multisourcing_status, pt.multisourcing_number, pt.s4_description
        """
        
        with connection.cursor() as cursor:
            cursor.execute(parts_query, [ms_number])
            rows = cursor.fetchall()
        
        if not rows:
            return Response({
                'success': False,
                'error': f'MS group not found: {ms_number}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        part_numbers = [row[0] for row in rows]
        placeholders = ','.join(['%s'] * len(part_numbers))
        
        # 2. Récupérer TOUS les prix de tous les composants du MS group
        all_prices_query = f"""
            SELECT 
                pp.part_id,
                pp.price_eur,
                pp.full_price,
                pp.currency,
                pp.server_id,
                pp.price_date
            FROM component_partprice pp
            WHERE pp.part_id IN ({placeholders})
            ORDER BY pp.price_date DESC
        """
        
        with connection.cursor() as cursor:
            cursor.execute(all_prices_query, part_numbers)
            all_price_rows = cursor.fetchall()
        
        # Indexer les prix par part_id (garder le plus récent par server_id)
        prices_by_part = {}
        for row in all_price_rows:
            pn = row[0]
            server_id = (row[4] or '').strip()
            
            if pn not in prices_by_part:
                prices_by_part[pn] = {}
            
            if server_id and server_id not in prices_by_part[pn]:
                prices_by_part[pn][server_id] = {
                    'price_eur': float(row[1])/1000 if row[1] else None,
                    'full_price': float(row[2])/1000 if row[2] else None,
                    'currency': row[3] or 'EUR',
                    'server_id': server_id,
                    'price_date': row[5]
                }
        
        # 3. Fonction pour trouver le meilleur prix pour une région
        def get_best_price_for_region(part_prices):
            region_config = self.REGION_SERVER_PRIORITY.get(region, {
                'primary': ['FORS-00', 'SIGIP-00'],
                'fallback': []
            })
            
            best_info = None
            best_date = None
            
            # Étape 1 : Chercher dans les serveurs primaires
            for server in region_config['primary']:
                if server in part_prices:
                    price_info = part_prices[server]
                    if price_info['price_eur'] is not None:
                        if best_date is None or price_info['price_date'] > best_date:
                            best_info = price_info
                            best_date = price_info['price_date']
            
            # Étape 2 : Fallback
            if best_info is None and region_config['fallback']:
                for server in region_config['fallback']:
                    if server in part_prices:
                        price_info = part_prices[server]
                        if price_info['price_eur'] is not None:
                            if best_date is None or price_info['price_date'] > best_date:
                                best_info = price_info
                                best_date = price_info['price_date']
            
            # Étape 3 : Si toujours pas trouvé → premier prix disponible (tous serveurs)
            if best_info is None:
                for server, price_info in part_prices.items():
                    if price_info['price_eur'] is not None:
                        if best_date is None or price_info['price_date'] > best_date:
                            best_info = price_info
                            best_date = price_info['price_date']
            
            return best_info
        
        # 4. Fourchettes de prix (min/max toutes régions)
        price_range_query = f"""
            SELECT 
                pp.part_id,
                MIN(pp.price_eur) as min_price,
                MAX(pp.price_eur) as max_price
            FROM component_partprice pp
            WHERE pp.part_id IN ({placeholders})
            GROUP BY pp.part_id
        """
        
        with connection.cursor() as cursor:
            cursor.execute(price_range_query, part_numbers)
            range_rows = cursor.fetchall()
        
        price_ranges = {}
        for row in range_rows:
            price_ranges[row[0]] = {
                'min': float(row[1])/1000 if row[1] else 0,
                'max': float(row[2])/1000 if row[2] else 0
            }
        
        # 5. Volumes par région pour le MS group
        volume_region_query = """
            SELECT 
                tr.location_region,
                SUM(tr.annual_volume) as total_volume
            FROM component_parttransportreceipt tr
            JOIN component_parttechnicaldata pt ON tr.part_id = pt.leoni_part_number
            WHERE pt.multisourcing_number = %s
            GROUP BY tr.location_region
            ORDER BY total_volume DESC
        """
        
        with connection.cursor() as cursor:
            cursor.execute(volume_region_query, [ms_number])
            vol_region_rows = cursor.fetchall()
        
        volume_by_region = []
        for row in vol_region_rows:
            volume_by_region.append({
                'region': row[0] or 'Unknown',
                'volume': int(row[1]) if row[1] else 0
            })
        
        # 6. Construire les alternatives
        alternatives = []
        total_volume = 0
        volume_by_supplier = {}
        
        for row in rows:
            pn = row[0]
            supplier = row[1] or 'Unknown'
            annual_volume = int(row[8]) if row[8] else 0
            total_volume += annual_volume
            
            if supplier not in volume_by_supplier:
                volume_by_supplier[supplier] = 0
            volume_by_supplier[supplier] += annual_volume
            
            # OEM details
            ms_status = row[5] or ''
            oem_details = parse_oem_details(ms_status)
            total_oems = len(oem_details)
            released_oems = sum(1 for o in oem_details if o['status'] == 'Released')
            
            # Prix avec logique M2 améliorée
            part_prices = prices_by_part.get(pn, {})
            best_price_info = get_best_price_for_region(part_prices)
            price_range = price_ranges.get(pn, {'min': 0, 'max': 0})
            
            alternatives.append({
                'leoni_part_number': pn,
                'supplier_group': supplier,
                'supplier_part_number': row[2] or '',
                'fors_material_group': row[3] or '',
                'compatibility_status': row[4] or '',
                'multisourcing_status': ms_status,
                'multisourcing_status_parsed': parse_multisourcing_status(ms_status),
                'multisourcing_number': row[6] or '',
                's4_description': row[7] or '',
                'annual_volume': annual_volume,
                'unit_price': best_price_info['price_eur']/1000 if best_price_info else None,
                'full_price': best_price_info['full_price']/1000 if best_price_info else None,
                'currency': best_price_info['currency'] if best_price_info else 'EUR',
                'price_range': price_range,
                'oem_summary': {
                    'total': total_oems,
                    'released': released_oems,
                    'percentage': round((released_oems / total_oems) * 100, 1) if total_oems > 0 else 0,
                    'details': oem_details
                }
            })
        
        # 7. Volume share par supplier
        volume_share = []
        for supplier, vol in volume_by_supplier.items():
            percentage = round((vol / total_volume) * 100, 1) if total_volume > 0 else 0
            volume_share.append({
                'supplier': supplier,
                'volume': vol,
                'percentage': percentage
            })
        volume_share.sort(key=lambda x: x['volume'], reverse=True)
        
        # 8. Current part
        current_part_data = None
        if current_part:
            for alt in alternatives:
                if alt['leoni_part_number'] == current_part:
                    current_part_data = alt
                    break
        
        if not current_part_data and alternatives:
            current_part_data = alternatives[0]
        
        response_data = {
            'ms_number': ms_number,
            'total_volume': total_volume,
            'current_part': current_part_data,
            'alternatives': alternatives,
            'volume_share': volume_share,
            'volume_by_region': volume_by_region
        }
        
        serializer = PartAlternativeSerializer(data=response_data)
        serializer.is_valid(raise_exception=True)
        
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)