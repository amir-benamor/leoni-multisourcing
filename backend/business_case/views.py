from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db import connection
from .recommender import recommend_best_scenario


class BusinessCaseView(APIView):
    """Charge les données d'un MS group"""
    permission_classes = [AllowAny]
    
    REGION_SERVER_PRIORITY = {
        'ASIA': {'primary': ['FORS-83', 'FORS-82', 'FORS-84', 'FORS-39'], 'fallback': ['FORS-00', 'SIGIP-00']},
        'EMEA': {'primary': ['FORS-00', 'SIGIP-00'], 'fallback': []},
        'AMERICAS': {'primary': ['FORS-00', 'SIGIP-00'], 'fallback': []}
    }
    
    def _load_ms_group(self, ms_number, usage_market):
        parts_query = """
            SELECT pt.leoni_part_number, pt.supplier_group, pt.supplier_part_number,
                   pt.fors_material_group, pt.compatibility_status, pt.multisourcing_status,
                   pt.multisourcing_number, pt.s4_description,
                   COALESCE(SUM(CASE WHEN tr.location_region = %s THEN tr.annual_volume ELSE 0 END), 0) as usage_volume,
                   COALESCE(SUM(tr.annual_volume), 0) as total_volume
            FROM component_parttechnicaldata pt
            LEFT JOIN component_parttransportreceipt tr ON pt.leoni_part_number = tr.part_id
            WHERE pt.multisourcing_number = %s
            GROUP BY pt.leoni_part_number, pt.supplier_group, pt.supplier_part_number,
                     pt.fors_material_group, pt.compatibility_status, 
                     pt.multisourcing_status, pt.multisourcing_number, pt.s4_description
        """
        with connection.cursor() as cursor:
            cursor.execute(parts_query, [usage_market, ms_number])
            return cursor.fetchall()
    
    def _load_prices(self, part_numbers):
        if not part_numbers: return {}
        placeholders = ','.join(['%s'] * len(part_numbers))
        query = f"""
            SELECT pp.part_id, pp.price_eur, pp.full_price, pp.currency, pp.server_id, pp.price_date
            FROM component_partprice pp WHERE pp.part_id IN ({placeholders})
            ORDER BY pp.price_date DESC
        """
        with connection.cursor() as cursor:
            cursor.execute(query, part_numbers)
            rows = cursor.fetchall()
        prices = {}
        for row in rows:
            pn, server_id = row[0], (row[4] or '').strip()
            if pn not in prices: prices[pn] = {}
            if server_id and server_id not in prices[pn]:
                prices[pn][server_id] = {
                    'price_eur': float(row[1])/1000 if row[1] else None,
                    'full_price': float(row[2])/1000 if row[2] else None,
                    'currency': row[3] or 'EUR', 'server_id': server_id, 'price_date': row[5]
                }
        return prices
    
    def _get_best_price(self, part_prices, region):
        region_config = self.REGION_SERVER_PRIORITY.get(region, {'primary': ['FORS-00', 'SIGIP-00'], 'fallback': []})
        best_info, best_date = None, None
        for server in region_config['primary']:
            if server in part_prices:
                p = part_prices[server]
                if p['price_eur'] and (best_date is None or p['price_date'] > best_date):
                    best_info, best_date = p, p['price_date']
        if best_info is None and region_config['fallback']:
            for server in region_config['fallback']:
                if server in part_prices:
                    p = part_prices[server]
                    if p['price_eur'] and (best_date is None or p['price_date'] > best_date):
                        best_info, best_date = p, p['price_date']
        if best_info is None:
            for server, p in part_prices.items():
                if p['price_eur'] and (best_date is None or p['price_date'] > best_date):
                    best_info, best_date = p, p['price_date']
        return best_info
    
    def get(self, request, ms_number):
        purchase_region = request.query_params.get('purchase_region', 'EMEA')
        usage_market = request.query_params.get('usage_market', 'EMEA')
        rows = self._load_ms_group(ms_number, usage_market)
        
        if not rows:
            return Response({'success': False, 'error': f'MS group not found: {ms_number}'}, status=404)
        
        part_numbers = [row[0] for row in rows]
        prices_by_part = self._load_prices(part_numbers)
        parts, total_volume_all = [], 0
        market_share = {}
        
        for row in rows:
            pn = row[0]
            usage_volume = int(row[8]) if row[8] else 0
            total_vol = int(row[9]) if row[9] else 0
            total_volume_all += total_vol
            ms_status = row[5] or ''
            released = ms_status.count('=Released')
            not_released = ms_status.count('=Not released')
            part_prices = prices_by_part.get(pn, {})
            best_price_info = self._get_best_price(part_prices, purchase_region)
            supplier = row[1] or 'Unknown'
            market_share[supplier] = market_share.get(supplier, 0) + usage_volume
            
            parts.append({
                'leoni_part_number': pn, 'supplier_group': supplier,
                'supplier_part_number': row[2] or '', 'fors_material_group': row[3] or '',
                'compatibility_status': row[4] or '', 'multisourcing_status': ms_status,
                'multisourcing_number': row[6] or '', 's4_description': row[7] or '',
                'usage_volume': usage_volume, 'total_volume': total_vol,
                'unit_price': best_price_info['price_eur'] if best_price_info else None,
                'full_price': best_price_info['full_price'] if best_price_info else None,
                'currency': best_price_info['currency'] if best_price_info else 'EUR',
                'oem_total': released + not_released, 'oem_released': released,
                'oem_not_released': not_released,
            })
        
        total_usage = sum(market_share.values())
        market_share_data = [
            {'supplier': s, 'volume': v, 'percentage': round((v/total_usage)*100, 1) if total_usage > 0 else 0}
            for s, v in sorted(market_share.items(), key=lambda x: x[1], reverse=True)
        ]
        
        return Response({'success': True, 'data': {
            'ms_number': ms_number, 'parts': parts, 'total_volume': total_volume_all,
            'suppliers': list(set(p['supplier_group'] for p in parts)),
            'market_share': market_share_data,
        }})


class BusinessCaseRecommendView(APIView):
    """Recommande le meilleur scénario"""
    permission_classes = [AllowAny]
    
    def get(self, request, ms_number):
        purchase_region = request.query_params.get('purchase_region', 'EMEA')
        usage_market = request.query_params.get('usage_market', 'EMEA')
        
        bc_view = BusinessCaseView()
        rows = bc_view._load_ms_group(ms_number, usage_market)
        
        if not rows:
            return Response({'success': False, 'error': f'MS group not found: {ms_number}'}, status=404)
        
        part_numbers = [row[0] for row in rows]
        prices_by_part = bc_view._load_prices(part_numbers)
        
        parts = []
        for row in rows:
            pn = row[0]; ms_status = row[5] or ''
            released = ms_status.count('=Released')
            not_released = ms_status.count('=Not released')
            part_prices = prices_by_part.get(pn, {})
            best_price = bc_view._get_best_price(part_prices, purchase_region)
            parts.append({
                'leoni_part_number': pn,
                'supplier_group': row[1] or 'Unknown',
                'usage_volume': int(row[8]) if row[8] else 0,
                'total_volume': int(row[9]) if row[9] else 0,
                'unit_price': best_price['price_eur'] if best_price else None,
                'oem_total': released + not_released,
                'oem_released': released,
                'oem_not_released': not_released,
            })
        
        result = recommend_best_scenario(parts, purchase_region, usage_market)
        
        return Response({'success': True, 'data': {
            'ms_number': ms_number, 'purchase_region': purchase_region,
            'usage_market': usage_market, **result
        }})