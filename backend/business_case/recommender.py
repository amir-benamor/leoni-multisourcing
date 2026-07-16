"""
Script indépendant de recommandation de scénarios Business Case.
Teste tous les scénarios possibles et retourne le meilleur.
"""

def calculate_scenario_score(parts, current_part, target_part, full_switch, max_saving):
    """
    Calcule le score d'un scénario.
    
    Args:
        parts: liste de tous les composants du MS group
        current_part: composant à remplacer (None si full switch)
        target_part: composant cible
        full_switch: bool, si True remplace tout le MS group
        max_saving: saving maximum parmi tous les scénarios (pour normalisation)
    
    Returns:
        score (0-100), details dict
    """
    
    target_price = target_part.get('unit_price') or 0
    
    if full_switch:
        # Full Switch : tous les composants sauf le target
        total_volume = 0
        total_saving = 0
        total_not_released = 0
        total_oems = 0
        
        for part in parts:
            if part['leoni_part_number'] == target_part['leoni_part_number']:
                continue
            
            current_price = part.get('unit_price') or 0
            volume = part.get('usage_volume', 0)
            delta = current_price - target_price
            
            total_volume += volume
            total_saving += delta * volume
            total_not_released += part.get('oem_not_released', 0)
            total_oems += part.get('oem_total', 0)
        
        # Release Risk
        release_risk = (total_not_released / total_oems * 100) if total_oems > 0 else 0
        
        # Supplier Concentration (après switch, tout chez le target)
        total_spend = sum((p.get('unit_price') or 0) * p.get('usage_volume', 0) for p in parts)
        target_spend = target_price * sum(p.get('usage_volume', 0) for p in parts)
        supplier_concentration = (target_spend / total_spend * 100) if total_spend > 0 else 100
        
    else:
        # Selective Switch : un seul current → target
        current_price = current_part.get('unit_price') or 0
        volume = current_part.get('usage_volume', 0)
        delta = current_price - target_price
        total_saving = delta * volume
        total_volume = volume
        
        # Release Risk (basé sur le current part uniquement)
        oem_total = current_part.get('oem_total', 0)
        oem_not_released = current_part.get('oem_not_released', 0)
        release_risk = (oem_not_released / oem_total * 100) if oem_total > 0 else 0
        
        # Supplier Concentration (après switch)
        total_spend = sum((p.get('unit_price') or 0) * p.get('usage_volume', 0) for p in parts)
        
        # Le current perd son spend, le target gagne
        target_original_spend = (target_part.get('unit_price') or 0) * target_part.get('usage_volume', 0)
        current_original_spend = current_price * volume
        target_new_spend = target_original_spend + (target_price * volume)
        
        supplier_concentration = (target_new_spend / total_spend * 100) if total_spend > 0 else 0
    
    # Risk Score
    risk_score = release_risk + supplier_concentration
    
    # Déterminer le niveau de risque
    if risk_score < 50:
        risk_level = 'low'
    elif risk_score < 100:
        risk_level = 'medium'
    else:
        risk_level = 'high'
    
    # Score final (0-100)
    # 50% basé sur le risque (inversé : risque bas = score haut)
    risk_normalized = max(0, 100 - risk_score)
    
    # 50% basé sur le saving (normalisé par rapport au max)
    saving_normalized = (total_saving / max_saving * 100) if max_saving > 0 else 0
    saving_normalized = min(100, saving_normalized)  # Cap à 100
    
    score = round((risk_normalized * 0.5) + (saving_normalized * 0.5), 1)
    
    details = {
        'annual_saving': round(total_saving, 2),
        'total_volume': total_volume,
        'release_risk': round(release_risk, 1),
        'supplier_concentration_risk': round(supplier_concentration, 1),
        'risk_score': round(risk_score, 1),
        'risk_level': risk_level,
    }
    
    return score, details


def recommend_best_scenario(parts, purchase_region, usage_market):
    """
    Teste tous les scénarios et retourne le meilleur.
    
    Args:
        parts: liste de tous les composants du MS group
        purchase_region: région pour les prix
        usage_market: région pour les volumes
    
    Returns:
        dict avec best_scenario et top_scenarios
    """
    
    scenarios = []
    all_savings = []
    
    # Phase 1 : Générer tous les scénarios et calculer les savings
    # Scénarios Selective Switch
    for current_part in parts:
        for target_part in parts:
            if current_part['leoni_part_number'] == target_part['leoni_part_number']:
                continue
            
            if current_part.get('supplier_group') == target_part.get('supplier_group'):
                continue  # Même supplier, pas intéressant
            
            score, details = calculate_scenario_score(
                parts, current_part, target_part, full_switch=False, max_saving=1
            )
            all_savings.append(details['annual_saving'])
            scenarios.append({
                'type': 'selective',
                'current_part': current_part['leoni_part_number'],
                'current_supplier': current_part['supplier_group'],
                'target_part': target_part['leoni_part_number'],
                'target_supplier': target_part['supplier_group'],
                'full_switch': False,
                'score': score,
                **details
            })
    
    # Scénarios Full Switch
    for target_part in parts:
        score, details = calculate_scenario_score(
            parts, None, target_part, full_switch=True, max_saving=1
        )
        all_savings.append(details['annual_saving'])
        scenarios.append({
            'type': 'full',
            'current_part': None,
            'current_supplier': None,
            'target_part': target_part['leoni_part_number'],
            'target_supplier': target_part['supplier_group'],
            'full_switch': True,
            'score': score,
            **details
        })
    
    # Phase 2 : Recalculer les scores avec le max saving
    max_saving = max(all_savings) if all_savings else 1
    
    for scenario in scenarios:
        # Recalculer le score avec le vrai max_saving
        if scenario['type'] == 'selective':
            # Trouver les parts correspondantes
            current_part = next(p for p in parts if p['leoni_part_number'] == scenario['current_part'])
            target_part = next(p for p in parts if p['leoni_part_number'] == scenario['target_part'])
            score, _ = calculate_scenario_score(
                parts, current_part, target_part, full_switch=False, max_saving=max_saving
            )
        else:
            target_part = next(p for p in parts if p['leoni_part_number'] == scenario['target_part'])
            score, _ = calculate_scenario_score(
                parts, None, target_part, full_switch=True, max_saving=max_saving
            )
        scenario['score'] = score
    
    # Trier par score décroissant
    scenarios.sort(key=lambda x: x['score'], reverse=True)
    
    # Générer l'explication pour le meilleur scénario
    best = scenarios[0] if scenarios else None
    
    if best:
        reasons = []
        if best['risk_level'] == 'low':
            reasons.append("Lower risk due to good OEM release coverage")
        elif best['risk_level'] == 'medium':
            reasons.append("Moderate risk level - some OEM gaps exist")
        
        if best['annual_saving'] > 0:
            reasons.append(f"Highest annual saving (€{best['annual_saving']:,.0f})")
        
        if best['type'] == 'full':
            reasons.append("Full switch reduces supplier fragmentation")
        
        reasons.append(f"Target supplier ({best['target_supplier']}) provides competitive pricing")
        
        best['reasons'] = reasons
    
    return {
        'best_scenario': best,
        'top_scenarios': scenarios[:3],
        'total_scenarios_tested': len(scenarios),
    }