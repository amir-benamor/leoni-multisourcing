from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.db.models import Sum, Q
from django.db import connection
from .models import PartTechnicalData, PartProjectUsage, PartTransportReceipt, PartPrice
from .serializers import (
    PartIdentificationSerializer, 
    PartUsageSerializer, 
    PartTransportSerializer,
    MaterialGroupResponseSerializer,
    M2PartCommercialSerializer
)


class M1PartDetailView(APIView):
    """
    API pour la consultation d'un composant par LEONI Part Number
    GET /api/m1/part/{leoni_part_number}/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, leoni_part_number):
        try:
            part = PartTechnicalData.objects.get(leoni_part_number=leoni_part_number)
        except PartTechnicalData.DoesNotExist:
            return Response({
                'success': False,
                'error': f'Part not found: {leoni_part_number}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = PartIdentificationSerializer(part)
        
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)


class M1PartUsageView(APIView):
    """
    API pour l'utilisation d'un composant par client/projet
    GET /api/m1/part/{leoni_part_number}/usage/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, leoni_part_number):
        try:
            part = PartTechnicalData.objects.get(leoni_part_number=leoni_part_number)
        except PartTechnicalData.DoesNotExist:
            return Response({
                'success': False,
                'error': f'Part not found: {leoni_part_number}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        usage_data = self.get_usage_data(part)
        
        serializer = PartUsageSerializer(usage_data)
        
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    @staticmethod
    def get_usage_data(part):
        """Récupère les données d'utilisation pour un composant"""
        usages = PartProjectUsage.objects.filter(part=part)
        
        if not usages.exists():
            return {'usage_by_account': []}
        
        oem_projects = {}
        
        for usage in usages:
            oem = usage.oem_brand
            if not oem:
                continue
            
            volume = int(usage.monthly_sum_volume) if usage.monthly_sum_volume else 0
            project_name = usage.project_name if usage.project_name else "Unnamed Project"
            
            if oem not in oem_projects:
                oem_projects[oem] = {
                    'total_volume': 0,
                    'projects': []
                }
            
            oem_projects[oem]['total_volume'] += volume
            
            existing_project = None
            for p in oem_projects[oem]['projects']:
                if p['project_name'] == project_name:
                    existing_project = p
                    break
            
            if existing_project:
                existing_project['volume'] += volume
            else:
                oem_projects[oem]['projects'].append({
                    'project_name': project_name,
                    'volume': volume
                })
        
        usage_by_account = []
        for oem, data in oem_projects.items():
            total_volume = data['total_volume']
            
            projects = []
            for project in data['projects']:
                project_percentage = round((project['volume'] / total_volume) * 100, 1) if total_volume > 0 else 0
                projects.append({
                    'project_name': project['project_name'],
                    'volume': project['volume'],
                    'percentage': project_percentage
                })
            
            projects.sort(key=lambda x: x['volume'], reverse=True)
            
            usage_by_account.append({
                'oem_brand': oem,
                'total_volume': total_volume,
                'percentage': 100,
                'projects': projects
            })
        
        usage_by_account.sort(key=lambda x: x['total_volume'], reverse=True)
        
        return {'usage_by_account': usage_by_account}


class M1PartTransportView(APIView):
    """
    API pour les données de transport d'un composant
    GET /api/m1/part/{leoni_part_number}/transport/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, leoni_part_number):
        try:
            part = PartTechnicalData.objects.get(leoni_part_number=leoni_part_number)
        except PartTechnicalData.DoesNotExist:
            return Response({
                'success': False,
                'error': f'Part not found: {leoni_part_number}'
            }, status=status.HTTP_404_NOT_FOUND)
        
        transport_data = self.get_transport_data(part)
        
        serializer = PartTransportSerializer(transport_data)
        
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    @staticmethod
    def get_transport_data(part):
        """Récupère les données de transport pour un composant"""
        transport_data = PartTransportReceipt.objects.filter(part=part)
        
        if not transport_data.exists():
            return {
                'total_annual_volume': 0,
                'plants': [],
                'volume_by_region': [],
                'volume_by_country': [],
                'volume_by_plant': []
            }
        
        region_volumes = {}
        country_volumes = {}
        plant_volumes = {}
        plants_set = set()
        total_volume = 0
        
        for item in transport_data:
            volume = int(item.annual_volume) if item.annual_volume else 0
            region = item.location_region
            country = item.location_country
            plant = item.lokid
            
            total_volume += volume
            
            if plant:
                plants_set.add(plant)
            
            if region:
                region_volumes[region] = region_volumes.get(region, 0) + volume
            
            if country:
                country_volumes[country] = country_volumes.get(country, 0) + volume
            
            if plant:
                plant_volumes[plant] = plant_volumes.get(plant, 0) + volume
        
        volume_by_region = [
            {'name': region, 'volume': vol}
            for region, vol in sorted(region_volumes.items(), key=lambda x: x[1], reverse=True)
        ]
        
        volume_by_country = [
            {'name': country, 'volume': vol}
            for country, vol in sorted(country_volumes.items(), key=lambda x: x[1], reverse=True)
        ]
        
        volume_by_plant = [
            {'name': plant, 'volume': vol}
            for plant, vol in sorted(plant_volumes.items(), key=lambda x: x[1], reverse=True)
        ]
        
        plants = sorted(list(plants_set))
        
        return {
            'total_annual_volume': total_volume,
            'plants': plants,
            'volume_by_region': volume_by_region,
            'volume_by_country': volume_by_country,
            'volume_by_plant': volume_by_plant
        }


class M1PartsBatchView(APIView):
    """
    API pour la consultation de plusieurs composants en batch
    POST /api/m1/parts/
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        inputs = request.data.get('inputs', [])
        
        if not inputs or not isinstance(inputs, list):
            return Response({
                'success': False,
                'error': 'Invalid inputs. Expected a list of part numbers.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        results = []
        
        for input_value in inputs:
            input_clean = input_value.strip()
            if not input_clean:
                continue
            
            part = PartTechnicalData.objects.filter(
                Q(leoni_part_number=input_clean) | Q(supplier_part_number=input_clean)
            ).first()
            
            if not part:
                results.append({
                    'input': input_clean,
                    'match_type': None,
                    'error': 'Part not found'
                })
                continue
            
            match_type = None
            if part.leoni_part_number == input_clean:
                match_type = 'LEONI PN'
            elif part.supplier_part_number == input_clean:
                match_type = 'Supplier PN'
            
            serializer = PartIdentificationSerializer(part)
            part_data = serializer.data
            part_data['match_type'] = match_type
            part_data['input'] = input_clean
            
            usage_data = M1PartUsageView.get_usage_data(part)
            part_data['usage_by_account'] = usage_data['usage_by_account']
            
            transport_data = M1PartTransportView.get_transport_data(part)
            part_data['annual_volume_context'] = transport_data['total_annual_volume']
            part_data['volume_by_region'] = transport_data['volume_by_region']
            part_data['volume_by_country'] = transport_data['volume_by_country']
            part_data['volume_by_plant'] = transport_data['volume_by_plant']
            part_data['plants'] = transport_data['plants']
            
            results.append(part_data)
        
        return Response({
            'success': True,
            'data': results,
            'count': len(results)
        }, status=status.HTTP_200_OK)


class M1MaterialGroupView(APIView):
    """
    API pour la consultation des parts par material group
    GET /api/m1/material-group/{material_group}/
    """
    permission_classes = [AllowAny]
    
    def get(self, request, material_group):
        if not material_group:
            return Response({
                'success': False,
                'error': 'Material group is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        parts = PartTechnicalData.objects.filter(fors_material_group=material_group)
        
        if not parts.exists():
            return Response({
                'success': True,
                'data': {'material_group': material_group, 'total_annual_volume': 0, 'parts': []}
            })
        
        total_annual_volume = 0
        parts_data = []
        
        for part in parts:
            transport_data = M1PartTransportView.get_transport_data(part)
            usage_data = M1PartUsageView.get_usage_data(part)
            annual_volume = transport_data['total_annual_volume']
            total_annual_volume += annual_volume
            oems = PartProjectUsage.objects.filter(part=part).values_list('oem_brand', flat=True).distinct()
            
            parts_data.append({
                'leoni_part_number': part.leoni_part_number,
                'supplier_part_number': part.supplier_part_number,
                'supplier_group': part.supplier_group,
                'fors_classification': part.fors_classification,
                's4_description': part.s4_description,
                'annual_volume_context': annual_volume,
                'oem_applicability': [oem for oem in oems if oem],
                'plants': transport_data['plants'],
                'volume_by_region': transport_data['volume_by_region'],
                'volume_by_country': transport_data['volume_by_country'],
                'usage_by_account': usage_data['usage_by_account']
            })
        
        parts_data.sort(key=lambda x: x['annual_volume_context'], reverse=True)
        
        serializer = MaterialGroupResponseSerializer({
            'material_group': material_group,
            'total_annual_volume': total_annual_volume,
            'parts': parts_data
        })
        
        return Response({'success': True, 'data': serializer.data}, status=status.HTTP_200_OK)


# ========== M2 - COMMERCIAL VIEWS ==========

class M2PartCommercialView(APIView):
    """
    API pour la vue commerciale d'un composant
    GET /api/m2/part/{leoni_part_number}/
    """
    permission_classes = [AllowAny]
    
    REGION_SERVER_PRIORITY = {
        'ASIA': {'primary': ['FORS-83', 'FORS-82', 'FORS-84', 'FORS-39'], 'fallback': ['FORS-00', 'SIGIP-00']},
        'EMEA': {'primary': ['FORS-00', 'SIGIP-00'], 'fallback': []},
        'AMERICAS': {'primary': ['FORS-00', 'SIGIP-00'], 'fallback': []}
    }
    
    def get(self, request, leoni_part_number):
        try:
            part = PartTechnicalData.objects.get(leoni_part_number=leoni_part_number)
        except PartTechnicalData.DoesNotExist:
            return Response({'success': False, 'error': f'Part not found: {leoni_part_number}'}, status=404)
        
        part_info = {
            'leoni_part_number': part.leoni_part_number,
            'supplier_part_number': part.supplier_part_number,
            'supplier_group': part.supplier_group,
            'fors_material_group': part.fors_material_group,
            'fors_classification': part.fors_classification,
            's4_description': part.s4_description,
        }
        
        regional_data = self._get_regional_data(part)
        total_volume = sum(r['volume'] for r in regional_data)
        total_value = sum(r['value'] for r in regional_data)
        prices = [r['unit_price'] for r in regional_data if r['unit_price'] is not None]
        price_range = {'min': min(prices) if prices else 0, 'max': max(prices) if prices else 0}
        active_regions = len(regional_data)
        signals = self._get_signals(regional_data, total_volume, part)
        project_breakdown = self._get_project_breakdown(part, total_volume, regional_data)
        account_breakdown = self._get_account_breakdown(part, total_volume, project_breakdown)
        plant_breakdown = self._get_plant_breakdown(part, total_volume, regional_data)
        
        return Response({'success': True, 'data': {
            'part_info': part_info, 'price_range': price_range, 'active_regions': active_regions,
            'regional_data': regional_data, 'total_volume': total_volume, 'total_value': total_value,
            'signals': signals, 'breakdowns': {
                'project_breakdown': project_breakdown,
                'account_breakdown': account_breakdown,
                'plant_breakdown': plant_breakdown
            }
        }}, status=status.HTTP_200_OK)
    
    def _get_regional_data(self, part):
        has_transport = PartTransportReceipt.objects.filter(part=part).exists()
        if not has_transport:
            return []
        
        all_prices = PartPrice.objects.filter(part=part).order_by('-price_date')
        prices_by_server = {}
        for price in all_prices:
            server_id = price.server_id.strip() if price.server_id else ''
            if server_id and server_id not in prices_by_server:
                prices_by_server[server_id] = {
                    'price_eur': float(price.price_eur) / 1000 if price.price_eur else None,
                    'full_price': float(price.full_price) / 1000 if price.full_price else None,
                    'currency': price.currency or '',
                    'price_date': price.price_date,
                    'server_id': server_id
                }
        
        def get_best_price_for_region(region):
            region_config = self.REGION_SERVER_PRIORITY.get(region, {'primary': ['FORS-00', 'SIGIP-00'], 'fallback': []})
            best_eur, best_full, best_cur, best_date, best_srv = None, None, '', None, ''
            for server in region_config['primary']:
                if server in prices_by_server:
                    p = prices_by_server[server]
                    if p['price_eur'] is not None and (best_date is None or p['price_date'] > best_date):
                        best_eur, best_full, best_cur, best_date, best_srv = p['price_eur'], p['full_price'], p['currency'], p['price_date'], server
            if best_eur is None and region_config['fallback']:
                for server in region_config['fallback']:
                    if server in prices_by_server:
                        p = prices_by_server[server]
                        if p['price_eur'] is not None and (best_date is None or p['price_date'] > best_date):
                            best_eur, best_full, best_cur, best_date, best_srv = p['price_eur'], p['full_price'], p['currency'], p['price_date'], server
            return best_eur, best_full, best_cur, best_srv
        
        transport_items = PartTransportReceipt.objects.filter(part=part)
        region_data = {}
        for item in transport_items:
            region = item.location_region or 'Unknown'
            volume = int(item.annual_volume) if item.annual_volume else 0
            if region not in region_data:
                region_data[region] = {'volume': 0, 'value': 0, 'unit_price': None, 'full_price': None, 'currency': '', 'price_source_server': ''}
            region_data[region]['volume'] += volume
        
        for region, data in region_data.items():
            best_eur, best_full, best_cur, best_srv = get_best_price_for_region(region)
            if best_eur is not None:
                data['unit_price'] = best_eur
                data['full_price'] = best_full
                data['currency'] = best_cur
                data['price_source_server'] = best_srv
                data['value'] = data['volume'] * best_eur
        
        regional_data = []
        for region, data in region_data.items():
            regional_data.append({
                'region': region, 'unit_price': data['unit_price'], 'full_price': data['full_price'],
                'currency': data['currency'], 'volume': data['volume'], 'value': data['value'],
                'price_source_server': data['price_source_server']
            })
        regional_data.sort(key=lambda x: x['region'])
        return regional_data
    
    def _get_regional_data_cached(self, part, part_prices, part_transport):
        if not part_transport:
            return []
        
        prices_by_server = {}
        for price in part_prices:
            server_id = price.server_id.strip() if price.server_id else ''
            if server_id and server_id not in prices_by_server:
                prices_by_server[server_id] = {
                    'price_eur': float(price.price_eur) / 1000 if price.price_eur else None,
                    'full_price': float(price.full_price) / 1000 if price.full_price else None,
                    'currency': price.currency or '', 'price_date': price.price_date, 'server_id': server_id
                }
        
        def get_best_price_for_region(region):
            region_config = self.REGION_SERVER_PRIORITY.get(region, {'primary': ['FORS-00', 'SIGIP-00'], 'fallback': []})
            best_eur, best_full, best_cur, best_date, best_srv = None, None, '', None, ''
            for server in region_config['primary']:
                if server in prices_by_server:
                    p = prices_by_server[server]
                    if p['price_eur'] is not None and (best_date is None or p['price_date'] > best_date):
                        best_eur, best_full, best_cur, best_date, best_srv = p['price_eur'], p['full_price'], p['currency'], p['price_date'], server
            if best_eur is None and region_config['fallback']:
                for server in region_config['fallback']:
                    if server in prices_by_server:
                        p = prices_by_server[server]
                        if p['price_eur'] is not None and (best_date is None or p['price_date'] > best_date):
                            best_eur, best_full, best_cur, best_date, best_srv = p['price_eur'], p['full_price'], p['currency'], p['price_date'], server
            return best_eur, best_full, best_cur, best_srv
        
        region_data = {}
        for item in part_transport:
            region = item.location_region or 'Unknown'
            volume = int(item.annual_volume) if item.annual_volume else 0
            if region not in region_data:
                region_data[region] = {'volume': 0, 'value': 0, 'unit_price': None, 'full_price': None, 'currency': '', 'price_source_server': ''}
            region_data[region]['volume'] += volume
        
        for region, data in region_data.items():
            best_eur, best_full, best_cur, best_srv = get_best_price_for_region(region)
            if best_eur is not None:
                data['unit_price'] = best_eur
                data['full_price'] = best_full
                data['currency'] = best_cur
                data['price_source_server'] = best_srv
                data['value'] = data['volume'] * best_eur
        
        regional_data = []
        for region, data in region_data.items():
            regional_data.append({
                'region': region, 'unit_price': data['unit_price'], 'full_price': data['full_price'],
                'currency': data['currency'], 'volume': data['volume'], 'value': data['value'],
                'price_source_server': data['price_source_server']
            })
        regional_data.sort(key=lambda x: x['region'])
        return regional_data
    
    def _get_signals(self, regional_data, total_volume, part):
        total_regional_value = sum(r['value'] for r in regional_data) if regional_data else 0
        if regional_data and total_regional_value > 0:
            top_value_region = max(regional_data, key=lambda x: x['value'])
            top_value_signal = {'region': top_value_region['region'], 'value': top_value_region['value'], 'percentage': round((top_value_region['value'] / total_regional_value) * 100, 1)}
        else:
            top_value_signal = None
        prices_with_region = [r for r in regional_data if r['unit_price'] is not None]
        highest_price_signal = {'region': prices_with_region[0]['region'], 'unit_price': prices_with_region[0]['unit_price']} if prices_with_region else None
        if prices_with_region:
            highest_price_region = max(prices_with_region, key=lambda x: x['unit_price'])
            highest_price_signal = {'region': highest_price_region['region'], 'unit_price': highest_price_region['unit_price']}
        dominant_plant = self._get_dominant_plant(part, total_volume)
        dominant_project = self._get_dominant_project(part, total_volume)
        return {'top_value_region': top_value_signal, 'highest_unit_price_region': highest_price_signal, 'dominant_plant': dominant_plant, 'dominant_project': dominant_project}
    
    def _get_dominant_plant(self, part, total_volume):
        transport_items = PartTransportReceipt.objects.filter(part=part)
        if not transport_items.exists():
            return None
        plant_volumes = {}
        for item in transport_items:
            plant = item.lokid or 'Unknown'
            volume = int(item.annual_volume) if item.annual_volume else 0
            plant_volumes[plant] = plant_volumes.get(plant, 0) + volume
        if not plant_volumes:
            return None
        dominant = max(plant_volumes.items(), key=lambda x: x[1])
        return {'name': dominant[0], 'volume': dominant[1], 'percentage': round((dominant[1] / total_volume) * 100, 1) if total_volume > 0 else 0}
    
    def _get_dominant_project(self, part, total_volume):
        usages = PartProjectUsage.objects.filter(part=part)
        if not usages.exists():
            return None
        project_volumes = {}
        for usage in usages:
            project = usage.project_name or "Unnamed Project"
            volume = int(usage.monthly_sum_volume) if usage.monthly_sum_volume else 0
            project_volumes[project] = project_volumes.get(project, 0) + volume
        if not project_volumes:
            return None
        dominant = max(project_volumes.items(), key=lambda x: x[1])
        return {'name': dominant[0], 'volume': dominant[1], 'percentage': round((dominant[1] / total_volume) * 100, 1) if total_volume > 0 else 0}
    
    def _get_project_breakdown(self, part, total_volume, regional_data):
        usages = PartProjectUsage.objects.filter(part=part)
        if not usages.exists():
            return []
        lokid_to_region_price = {}
        transport_items = PartTransportReceipt.objects.filter(part=part)
        for item in transport_items:
            lokid = item.lokid or ''
            region = item.location_region or 'Unknown'
            price = 0
            for r in regional_data:
                if r['region'] == region and r['unit_price'] is not None:
                    price = r['unit_price']
                    break
            lokid_to_region_price[lokid] = {'region': region, 'price': price}
        project_data = {}
        for usage in usages:
            project = usage.project_name or 'Unnamed Project'
            lokid = usage.lokid or ''
            volume = int(usage.monthly_sum_volume) if usage.monthly_sum_volume else 0
            if project not in project_data:
                project_data[project] = {'volume': 0, 'value': 0, 'oem_brand': usage.oem_brand or 'Unknown'}
            project_data[project]['volume'] += volume
            region_info = lokid_to_region_price.get(lokid, {'price': 0})
            project_data[project]['value'] += volume * region_info['price']
        breakdown = []
        for project, data in project_data.items():
            percentage = round((data['volume'] / total_volume) * 100, 1) if total_volume > 0 else 0
            breakdown.append({'name': project, 'volume': data['volume'], 'percentage': percentage, 'value': round(data['value'], 2), 'oem_brand': data['oem_brand']})
        breakdown.sort(key=lambda x: x['volume'], reverse=True)
        return breakdown
    
    def _get_project_breakdown_cached(self, part, total_volume, regional_data, part_projects, part_transport):
        if not part_projects:
            return []
        lokid_to_region_price = {}
        for item in part_transport:
            lokid = item.lokid or ''
            region = item.location_region or 'Unknown'
            price = 0
            for r in regional_data:
                if r['region'] == region and r['unit_price'] is not None:
                    price = r['unit_price']
                    break
            lokid_to_region_price[lokid] = {'region': region, 'price': price}
        project_data = {}
        for usage in part_projects:
            project = usage.project_name or 'Unnamed Project'
            lokid = usage.lokid or ''
            volume = int(usage.monthly_sum_volume) if usage.monthly_sum_volume else 0
            if project not in project_data:
                project_data[project] = {'volume': 0, 'value': 0, 'oem_brand': usage.oem_brand or 'Unknown'}
            project_data[project]['volume'] += volume
            region_info = lokid_to_region_price.get(lokid, {'price': 0})
            project_data[project]['value'] += volume * region_info['price']
        breakdown = []
        for project, data in project_data.items():
            percentage = round((data['volume'] / total_volume) * 100, 1) if total_volume > 0 else 0
            breakdown.append({'name': project, 'volume': data['volume'], 'percentage': percentage, 'value': round(data['value'], 2), 'oem_brand': data['oem_brand']})
        breakdown.sort(key=lambda x: x['volume'], reverse=True)
        return breakdown
    
    def _get_account_breakdown(self, part, total_volume, project_breakdown):
        if not project_breakdown:
            return []
        account_data = {}
        for project in project_breakdown:
            oem = project.get('oem_brand', 'Unknown')
            if oem not in account_data:
                account_data[oem] = {'volume': 0, 'value': 0}
            account_data[oem]['volume'] += project['volume']
            account_data[oem]['value'] += project['value']
        breakdown = []
        for oem, data in account_data.items():
            percentage = round((data['volume'] / total_volume) * 100, 1) if total_volume > 0 else 0
            breakdown.append({'name': oem, 'volume': data['volume'], 'percentage': percentage, 'value': round(data['value'], 2)})
        breakdown.sort(key=lambda x: x['volume'], reverse=True)
        return breakdown
    
    def _get_plant_breakdown(self, part, total_volume, regional_data):
        transport_items = PartTransportReceipt.objects.filter(part=part)
        if not transport_items.exists():
            return []
        regional_prices = {}
        for region_data in regional_data:
            if region_data['unit_price'] is not None:
                regional_prices[region_data['region']] = region_data['unit_price']
        plant_data = {}
        for item in transport_items:
            plant = item.lokid or 'Unknown'
            region = item.location_region or 'Unknown'
            volume = int(item.annual_volume) if item.annual_volume else 0
            if plant not in plant_data:
                plant_data[plant] = {'volume': 0, 'value': 0, 'region': region}
            plant_data[plant]['volume'] += volume
            price = regional_prices.get(region, 0)
            plant_data[plant]['value'] += volume * price
        breakdown = []
        for plant, data in sorted(plant_data.items(), key=lambda x: x[1]['volume'], reverse=True):
            percentage = round((data['volume'] / total_volume) * 100, 1) if total_volume > 0 else 0
            breakdown.append({'name': plant, 'volume': data['volume'], 'percentage': percentage, 'value': round(data['value'], 2)})
        return breakdown


# ========== M2 - BATCH VIEW ==========

class M2PartsBatchView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        inputs = request.data.get('inputs', [])
        if not inputs or not isinstance(inputs, list):
            return Response({'success': False, 'error': 'Invalid inputs'}, status=400)
        
        part_numbers = [inp.strip() for inp in inputs if inp.strip()]
        parts = PartTechnicalData.objects.filter(Q(leoni_part_number__in=part_numbers) | Q(supplier_part_number__in=part_numbers))
        part_map = {}
        for part in parts:
            part_map[part.leoni_part_number.lower()] = part
            if part.supplier_part_number:
                part_map[part.supplier_part_number.lower()] = part
        
        part_pks = [p.pk for p in parts]
        all_prices = PartPrice.objects.filter(part_id__in=part_pks).order_by('-price_date')
        prices_by_part = {}
        for price in all_prices:
            if price.part_id not in prices_by_part:
                prices_by_part[price.part_id] = []
            prices_by_part[price.part_id].append(price)
        
        all_transport = PartTransportReceipt.objects.filter(part_id__in=part_pks)
        transport_by_part = {}
        for item in all_transport:
            if item.part_id not in transport_by_part:
                transport_by_part[item.part_id] = []
            transport_by_part[item.part_id].append(item)
        
        all_projects = PartProjectUsage.objects.filter(part_id__in=part_pks)
        projects_by_part = {}
        for proj in all_projects:
            if proj.part_id not in projects_by_part:
                projects_by_part[proj.part_id] = []
            projects_by_part[proj.part_id].append(proj)
        
        m2_view = M2PartCommercialView()
        results = []
        for input_value in inputs:
            input_clean = input_value.strip()
            if not input_clean:
                continue
            part = part_map.get(input_clean.lower())
            if not part:
                results.append({'input': input_clean, 'match_type': None, 'error': 'Part not found'})
                continue
            match_type = 'LEONI PN' if part.leoni_part_number.lower() == input_clean.lower() else 'Supplier PN'
            part_prices = prices_by_part.get(part.pk, [])
            part_transport = transport_by_part.get(part.pk, [])
            part_projects = projects_by_part.get(part.pk, [])
            regional_data = m2_view._get_regional_data_cached(part, part_prices, part_transport)
            total_volume = sum(r['volume'] for r in regional_data)
            total_value = sum(r['value'] for r in regional_data)
            prices = [r['unit_price'] for r in regional_data if r['unit_price'] is not None]
            project_breakdown = m2_view._get_project_breakdown_cached(part, total_volume, regional_data, part_projects, part_transport)
            account_breakdown = m2_view._get_account_breakdown(part, total_volume, project_breakdown)
            plant_breakdown = m2_view._get_plant_breakdown(part, total_volume, regional_data)
            results.append({
                'input': input_clean, 'match_type': match_type,
                'leoni_part_number': part.leoni_part_number, 'supplier_part_number': part.supplier_part_number,
                'supplier_group': part.supplier_group, 'fors_material_group': part.fors_material_group,
                'fors_classification': part.fors_classification, 's4_description': part.s4_description,
                'total_volume': total_volume, 'total_value': total_value, 'active_regions': len(regional_data),
                'price_range': {'min': min(prices) if prices else 0, 'max': max(prices) if prices else 0},
                'regional_data': regional_data, 'project_breakdown': project_breakdown,
                'account_breakdown': account_breakdown, 'plant_breakdown': plant_breakdown
            })
        return Response({'success': True, 'data': results, 'count': len(results)})


# ========== M2 - MATERIAL GROUP VIEW ==========

class M2MaterialGroupView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, material_group):
        if not material_group:
            return Response({'success': False, 'error': 'Material group is required'}, status=400)
        
        parts = PartTechnicalData.objects.filter(fors_material_group=material_group)
        if not parts.exists():
            return Response({'success': True, 'data': {'material_group': material_group, 'total_volume': 0, 'total_value': 0, 'parts_count': 0, 'suppliers_count': 0, 'price_range': {'min': 0, 'max': 0}, 'top_part_share': {'leoni_part_number': '', 'percentage': 0}, 'three_region_coverage': 0, 'supplier_split': [], 'region_split': [], 'project_ranking': [], 'account_ranking': [], 'plant_ranking': [], 'classification_split': [], 'parts': []}})
        
        part_pks = [p.pk for p in parts]
        all_prices = PartPrice.objects.filter(part_id__in=part_pks).order_by('-price_date')
        prices_by_part = {}
        for price in all_prices:
            if price.part_id not in prices_by_part:
                prices_by_part[price.part_id] = []
            prices_by_part[price.part_id].append(price)
        all_transport = PartTransportReceipt.objects.filter(part_id__in=part_pks)
        transport_by_part = {}
        for item in all_transport:
            if item.part_id not in transport_by_part:
                transport_by_part[item.part_id] = []
            transport_by_part[item.part_id].append(item)
        all_projects = PartProjectUsage.objects.filter(part_id__in=part_pks)
        projects_by_part = {}
        for proj in all_projects:
            if proj.part_id not in projects_by_part:
                projects_by_part[proj.part_id] = []
            projects_by_part[proj.part_id].append(proj)
        
        m2_view = M2PartCommercialView()
        parts_data, total_volume, total_value, all_prices_list = [], 0, 0, []
        supplier_data, region_data, project_data, account_data, plant_data, classification_data = {}, {}, {}, {}, {}, {}
        three_region_count = 0
        
        for part in parts:
            part_prices = prices_by_part.get(part.pk, [])
            part_transport = transport_by_part.get(part.pk, [])
            part_projects = projects_by_part.get(part.pk, [])
            regional_data = m2_view._get_regional_data_cached(part, part_prices, part_transport)
            part_total_volume = sum(r['volume'] for r in regional_data)
            part_total_value = sum(r['value'] for r in regional_data)
            prices = [r['unit_price'] for r in regional_data if r['unit_price'] is not None]
            project_breakdown = m2_view._get_project_breakdown_cached(part, part_total_volume, regional_data, part_projects, part_transport)
            account_breakdown = m2_view._get_account_breakdown(part, part_total_volume, project_breakdown)
            plant_breakdown = m2_view._get_plant_breakdown(part, part_total_volume, regional_data)
            
            total_volume += part_total_volume
            total_value += part_total_value
            all_prices_list.extend(prices)
            if len(set(r['region'] for r in regional_data)) >= 3:
                three_region_count += 1
            
            supplier = part.supplier_group or 'Unknown'
            supplier_data[supplier] = {'value': supplier_data.get(supplier, {'value': 0, 'volume': 0})['value'] + part_total_value, 'volume': supplier_data.get(supplier, {'value': 0, 'volume': 0})['volume'] + part_total_volume}
            for r in regional_data:
                region_data[r['region']] = {'value': region_data.get(r['region'], {'value': 0, 'volume': 0})['value'] + r['value'], 'volume': region_data.get(r['region'], {'value': 0, 'volume': 0})['volume'] + r['volume']}
            for p in project_breakdown:
                project_data[p['name']] = {'value': project_data.get(p['name'], {'value': 0, 'volume': 0})['value'] + p['value'], 'volume': project_data.get(p['name'], {'value': 0, 'volume': 0})['volume'] + p['volume']}
            for a in account_breakdown:
                account_data[a['name']] = {'value': account_data.get(a['name'], {'value': 0, 'volume': 0})['value'] + a['value'], 'volume': account_data.get(a['name'], {'value': 0, 'volume': 0})['volume'] + a['volume']}
            for pl in plant_breakdown:
                plant_data[pl['name']] = {'value': plant_data.get(pl['name'], {'value': 0, 'volume': 0})['value'] + pl['value'], 'volume': plant_data.get(pl['name'], {'value': 0, 'volume': 0})['volume'] + pl['volume']}
            classification = part.fors_classification or 'Unknown'
            classification_data[classification] = {'value': classification_data.get(classification, {'value': 0, 'volume': 0})['value'] + part_total_value, 'volume': classification_data.get(classification, {'value': 0, 'volume': 0})['volume'] + part_total_volume}
            
            parts_data.append({
                'leoni_part_number': part.leoni_part_number, 'supplier_part_number': part.supplier_part_number,
                'supplier_group': part.supplier_group, 'fors_classification': part.fors_classification,
                's4_description': part.s4_description, 'total_volume': part_total_volume, 'total_value': part_total_value,
                'active_regions': len(regional_data),
                'price_range': {'min': min(prices) if prices else 0, 'max': max(prices) if prices else 0},
                'regional_data': regional_data, 'project_breakdown': project_breakdown,
                'account_breakdown': account_breakdown, 'plant_breakdown': plant_breakdown
            })
        
        top_part = max(parts_data, key=lambda x: x['total_value']) if parts_data else None
        
        def format_ranking(data_dict, total_val):
            ranking = []
            for name, d in data_dict.items():
                percentage = round((d['value'] / total_val) * 100, 1) if total_val > 0 else 0
                ranking.append({'name': name, 'value': round(d['value'], 2), 'volume': d['volume'], 'percentage': percentage})
            ranking.sort(key=lambda x: x['value'], reverse=True)
            return ranking
        
        return Response({'success': True, 'data': {
            'material_group': material_group, 'total_volume': total_volume, 'total_value': round(total_value, 2),
            'parts_count': parts.count(), 'suppliers_count': len(supplier_data),
            'price_range': {'min': min(all_prices_list) if all_prices_list else 0, 'max': max(all_prices_list) if all_prices_list else 0},
            'top_part_share': {'leoni_part_number': top_part['leoni_part_number'] if top_part else '', 'percentage': round((top_part['total_value'] / total_value) * 100, 1) if top_part and total_value > 0 else 0},
            'three_region_coverage': three_region_count,
            'supplier_split': format_ranking(supplier_data, total_value),
            'region_split': format_ranking(region_data, total_value),
            'project_ranking': format_ranking(project_data, total_value),
            'account_ranking': format_ranking(account_data, total_value),
            'plant_ranking': format_ranking(plant_data, total_value),
            'classification_split': format_ranking(classification_data, total_value),
            'parts': parts_data
        }})


# ========== M2 - SUPPLIER VIEW ==========

class M2SupplierView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, supplier_name):
        if not supplier_name:
            return Response({'success': False, 'error': 'Supplier name is required'}, status=400)
        
        parts = PartTechnicalData.objects.filter(supplier_group__iexact=supplier_name)
        if not parts.exists():
            return Response({'success': True, 'data': {'supplier': supplier_name, 'total_volume': 0, 'total_value': 0, 'parts_count': 0, 'material_groups_count': 0, 'price_range': {'min': 0, 'max': 0}, 'top_part_share': {'leoni_part_number': '', 'percentage': 0}, 'three_region_coverage': 0, 'region_split': [], 'material_group_split': [], 'part_ranking': [], 'project_ranking': [], 'account_ranking': [], 'plant_ranking': [], 'parts': []}})
        
        part_pks = [p.pk for p in parts]
        all_prices = PartPrice.objects.filter(part_id__in=part_pks).order_by('-price_date')
        prices_by_part = {}
        for price in all_prices:
            if price.part_id not in prices_by_part:
                prices_by_part[price.part_id] = []
            prices_by_part[price.part_id].append(price)
        all_transport = PartTransportReceipt.objects.filter(part_id__in=part_pks)
        transport_by_part = {}
        for item in all_transport:
            if item.part_id not in transport_by_part:
                transport_by_part[item.part_id] = []
            transport_by_part[item.part_id].append(item)
        all_projects = PartProjectUsage.objects.filter(part_id__in=part_pks)
        projects_by_part = {}
        for proj in all_projects:
            if proj.part_id not in projects_by_part:
                projects_by_part[proj.part_id] = []
            projects_by_part[proj.part_id].append(proj)
        
        m2_view = M2PartCommercialView()
        parts_data, total_volume, total_value, all_prices_list = [], 0, 0, []
        region_data, material_group_data, part_ranking_data, project_data, account_data, plant_data = {}, {}, {}, {}, {}, {}
        three_region_count = 0
        
        for part in parts:
            part_prices = prices_by_part.get(part.pk, [])
            part_transport = transport_by_part.get(part.pk, [])
            part_projects = projects_by_part.get(part.pk, [])
            regional_data = m2_view._get_regional_data_cached(part, part_prices, part_transport)
            part_total_volume = sum(r['volume'] for r in regional_data)
            part_total_value = sum(r['value'] for r in regional_data)
            prices = [r['unit_price'] for r in regional_data if r['unit_price'] is not None]
            project_breakdown = m2_view._get_project_breakdown_cached(part, part_total_volume, regional_data, part_projects, part_transport)
            account_breakdown = m2_view._get_account_breakdown(part, part_total_volume, project_breakdown)
            plant_breakdown = m2_view._get_plant_breakdown(part, part_total_volume, regional_data)
            
            total_volume += part_total_volume
            total_value += part_total_value
            all_prices_list.extend(prices)
            if len(set(r['region'] for r in regional_data)) >= 3:
                three_region_count += 1
            for r in regional_data:
                region_data[r['region']] = {'value': region_data.get(r['region'], {'value': 0, 'volume': 0})['value'] + r['value'], 'volume': region_data.get(r['region'], {'value': 0, 'volume': 0})['volume'] + r['volume']}
            mg = part.fors_material_group or 'Unknown'
            material_group_data[mg] = {'value': material_group_data.get(mg, {'value': 0, 'volume': 0})['value'] + part_total_value, 'volume': material_group_data.get(mg, {'value': 0, 'volume': 0})['volume'] + part_total_volume}
            part_ranking_data[part.leoni_part_number] = {'value': part_total_value, 'volume': part_total_volume}
            for p in project_breakdown:
                project_data[p['name']] = {'value': project_data.get(p['name'], {'value': 0, 'volume': 0})['value'] + p['value'], 'volume': project_data.get(p['name'], {'value': 0, 'volume': 0})['volume'] + p['volume']}
            for a in account_breakdown:
                account_data[a['name']] = {'value': account_data.get(a['name'], {'value': 0, 'volume': 0})['value'] + a['value'], 'volume': account_data.get(a['name'], {'value': 0, 'volume': 0})['volume'] + a['volume']}
            for pl in plant_breakdown:
                plant_data[pl['name']] = {'value': plant_data.get(pl['name'], {'value': 0, 'volume': 0})['value'] + pl['value'], 'volume': plant_data.get(pl['name'], {'value': 0, 'volume': 0})['volume'] + pl['volume']}
            
            parts_data.append({
                'leoni_part_number': part.leoni_part_number, 'supplier_part_number': part.supplier_part_number,
                'supplier_group': part.supplier_group, 'fors_material_group': part.fors_material_group,
                'fors_classification': part.fors_classification, 's4_description': part.s4_description,
                'total_volume': part_total_volume, 'total_value': part_total_value, 'active_regions': len(regional_data),
                'price_range': {'min': min(prices) if prices else 0, 'max': max(prices) if prices else 0},
                'regional_data': regional_data, 'project_breakdown': project_breakdown,
                'account_breakdown': account_breakdown, 'plant_breakdown': plant_breakdown
            })
        
        top_part = max(parts_data, key=lambda x: x['total_value']) if parts_data else None
        
        def format_ranking(data_dict, total_val):
            ranking = []
            for name, d in data_dict.items():
                percentage = round((d['value'] / total_val) * 100, 1) if total_val > 0 else 0
                ranking.append({'name': name, 'value': round(d['value'], 2), 'volume': d['volume'], 'percentage': percentage})
            ranking.sort(key=lambda x: x['value'], reverse=True)
            return ranking
        
        return Response({'success': True, 'data': {
            'supplier': supplier_name, 'total_volume': total_volume, 'total_value': round(total_value, 2),
            'parts_count': parts.count(), 'material_groups_count': len(material_group_data),
            'price_range': {'min': min(all_prices_list) if all_prices_list else 0, 'max': max(all_prices_list) if all_prices_list else 0},
            'top_part_share': {'leoni_part_number': top_part['leoni_part_number'] if top_part else '', 'percentage': round((top_part['total_value'] / total_value) * 100, 1) if top_part and total_value > 0 else 0},
            'three_region_coverage': three_region_count,
            'region_split': format_ranking(region_data, total_value),
            'material_group_split': format_ranking(material_group_data, total_value),
            'part_ranking': format_ranking(part_ranking_data, total_value),
            'project_ranking': format_ranking(project_data, total_value),
            'account_ranking': format_ranking(account_data, total_value),
            'plant_ranking': format_ranking(plant_data, total_value),
            'parts': parts_data
        }})