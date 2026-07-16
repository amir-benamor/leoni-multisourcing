import polars as pl
import pandas as pd
import os
from django.conf import settings
from typing import Dict, Any, List, Tuple
import gc
from datetime import datetime

class FileCleaner:
    """Nettoyage des fichiers Excel avec Polars en mode LAZY"""
    
    # Mapping des colonnes pour chaque fichier
    COLUMN_MAPPING = {
        'tech_data': {
            'LEONI Part Number': 'leoni_part_number',
            'FORS Material Group': 'fors_material_group',
            'FORS Classification': 'fors_classification',
            'S4 Description': 's4_description',
            'Supplier Group': 'supplier_group',
            'Supplier Part Number': 'supplier_part_number',
            'multisourcing status': 'multisourcing_status',
            'compatibilit status': 'compatibility_status',
            'multisourcing number': 'multisourcing_number'
        },
        'transport': {
            'LOKID': 'lokid',
            'Product ID': 'part_number',
            'Location Region': 'location_region',
            'Location Country': 'location_country',
            'Volume Jun2026/May2027': 'annual_volume'
        },
        'project': {
            'SAP S4 Part Number - Component': 'part_number',
            'LOKID': 'lokid',
            'OEM Brand': 'oem_brand',
            'S&OP 1 / Project': 'project_name'
        },
        'prices': {
            'Part Number': 'part_number',
            'Server-ID': 'server_id',
            'LokID': 'lokid',
            'Created On': 'price_date',
            'Fullprice': 'full_price',
            'Price Euro': 'price_eur', 
            'Crcy': 'currency'
        }
    }
    
    # Colonnes mensuelles pour fichier 3
    MONTHLY_COLUMNS = [
        'JUN 2026', 'JUL 2026', 'AUG 2026', 'SEP 2026', 'OCT 2026',
        'NOV 2026', 'DEC 2026', 'JAN 2027', 'FEB 2027', 'MAR 2027',
        'APR 2027', 'MAY 2027'
    ]
    
    @staticmethod
    def clean_all_files(files: Dict[str, str], output_dir: str) -> Dict[str, Any]:
        """Nettoie les 4 fichiers et retourne un résumé global"""
        all_stats = {
            'rows_read': 0,
            'rows_after_clean': 0,
            'duplicates_removed': 0,
            'total_null_count': 0,
            'output_files': {}
        }
        
        if files.get('tech_data'):
            stats, output_path = FileCleaner._clean_tech_data(files['tech_data'], output_dir)
            all_stats['rows_read'] += stats['rows_read']
            all_stats['rows_after_clean'] += stats['rows_after_clean']
            all_stats['duplicates_removed'] += stats['duplicates_removed']
            all_stats['total_null_count'] += stats['total_null_count']
            all_stats['output_files']['tech_data'] = output_path
            gc.collect()
        
        if files.get('transport'):
            stats, output_path = FileCleaner._clean_transport_data(files['transport'], output_dir)
            all_stats['rows_read'] += stats['rows_read']
            all_stats['rows_after_clean'] += stats['rows_after_clean']
            all_stats['duplicates_removed'] += stats['duplicates_removed']
            all_stats['total_null_count'] += stats['total_null_count']
            all_stats['output_files']['transport'] = output_path
            gc.collect()
        
        if files.get('project'):
            stats, output_path = FileCleaner._clean_project_data(files['project'], output_dir)
            all_stats['rows_read'] += stats['rows_read']
            all_stats['rows_after_clean'] += stats['rows_after_clean']
            all_stats['duplicates_removed'] += stats['duplicates_removed']
            all_stats['total_null_count'] += stats['total_null_count']
            all_stats['output_files']['project'] = output_path
            gc.collect()
        
        if files.get('prices'):
            stats, output_path = FileCleaner._clean_prices_data(files['prices'], output_dir)
            all_stats['rows_read'] += stats['rows_read']
            all_stats['rows_after_clean'] += stats['rows_after_clean']
            all_stats['duplicates_removed'] += stats['duplicates_removed']
            all_stats['total_null_count'] += stats['total_null_count']
            all_stats['output_files']['prices'] = output_path
            gc.collect()
        
        return all_stats
    
    @staticmethod
    def _clean_tech_data(file_path: str, output_dir: str) -> Tuple[Dict[str, int], str]:
        """Nettoie le fichier des données techniques"""
        stats = {'rows_read': 0, 'rows_after_clean': 0, 'duplicates_removed': 0, 'total_null_count': 0}
        
        columns_to_keep = list(FileCleaner.COLUMN_MAPPING['tech_data'].keys())
        df = pl.read_excel(file_path, columns=columns_to_keep)
        stats['rows_read'] = len(df)
        
        for col in df.columns:
            if df[col].dtype in [pl.Int64, pl.Float64, pl.Int32]:
                df = df.with_columns(pl.col(col).cast(pl.String).alias(col))
        
        lazy_df = df.lazy()
        lazy_df = lazy_df.rename(FileCleaner.COLUMN_MAPPING['tech_data'])
        
        before_unique = stats['rows_read']
        lazy_df = lazy_df.unique(subset=['leoni_part_number'], keep='first')
        stats['duplicates_removed'] = before_unique - stats['rows_read']
        
        for col in FileCleaner.COLUMN_MAPPING['tech_data'].values():
            if col != 'leoni_part_number':
                lazy_df = lazy_df.with_columns(
                    pl.when(pl.col(col).is_null())
                    .then(pl.lit(None))
                    .otherwise(
                        pl.col(col).cast(pl.String).str.strip_chars()
                        .map_elements(lambda x: None if x == "" else x, return_dtype=pl.String)
                    )
                    .alias(col)
                )
        
        df_cleaned = lazy_df.collect(streaming=True)
        stats['rows_after_clean'] = len(df_cleaned)
        
        for col in df_cleaned.columns:
            stats['total_null_count'] += df_cleaned[col].null_count()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(output_dir, f'cleaned_tech_data_{timestamp}.csv')
        df_cleaned.write_csv(output_file)
        
        del df, df_cleaned, lazy_df
        return stats, output_file
    
    @staticmethod
    def _clean_transport_data(file_path: str, output_dir: str) -> Tuple[Dict[str, int], str]:
        """Nettoie le fichier transport"""
        stats = {'rows_read': 0, 'rows_after_clean': 0, 'duplicates_removed': 0, 'total_null_count': 0}
        
        columns_to_keep = list(FileCleaner.COLUMN_MAPPING['transport'].keys())
        df = pl.read_excel(file_path, columns=columns_to_keep)
        stats['rows_read'] = len(df)
        
        for col in ['LOKID', 'Product ID', 'Location Region', 'Location Country']:
            if col in df.columns and df[col].dtype in [pl.Int64, pl.Float64, pl.Int32]:
                df = df.with_columns(pl.col(col).cast(pl.String).alias(col))
        
        lazy_df = df.lazy()
        lazy_df = lazy_df.rename(FileCleaner.COLUMN_MAPPING['transport'])
        
        before_unique = stats['rows_read']
        lazy_df = lazy_df.unique()
        stats['duplicates_removed'] = before_unique - stats['rows_read']
        
        string_columns = ['lokid', 'part_number', 'location_region', 'location_country']
        for col in string_columns:
            lazy_df = lazy_df.with_columns(
                pl.when(pl.col(col).is_null())
                .then(pl.lit(None))
                .otherwise(
                    pl.col(col).cast(pl.String).str.strip_chars()
                    .map_elements(lambda x: None if x == "" else x, return_dtype=pl.String)
                )
                .alias(col)
            )
        
        lazy_df = lazy_df.with_columns(
            pl.col('annual_volume').cast(pl.Float64, strict=False).alias('annual_volume')
        )
        
        df_cleaned = lazy_df.collect(streaming=True)
        stats['rows_after_clean'] = len(df_cleaned)
        
        for col in df_cleaned.columns:
            stats['total_null_count'] += df_cleaned[col].null_count()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(output_dir, f'cleaned_transport_data_{timestamp}.csv')
        df_cleaned.write_csv(output_file)
        
        del df, df_cleaned, lazy_df
        return stats, output_file
    
    @staticmethod
    def _clean_project_data(file_path: str, output_dir: str) -> Tuple[Dict[str, int], str]:
        """Nettoie le fichier projet avec somme des colonnes mensuelles"""
        stats = {'rows_read': 0, 'rows_after_clean': 0, 'duplicates_removed': 0, 'total_null_count': 0}
        
        base_columns = list(FileCleaner.COLUMN_MAPPING['project'].keys())
        all_columns = base_columns + FileCleaner.MONTHLY_COLUMNS
        
        try:
            preview_df = pl.read_excel(file_path, n_rows=1)
            existing_columns = [col for col in all_columns if col in preview_df.columns]
            del preview_df
        except Exception as e:
            print(f"Warning: Could not read columns from {file_path}: {e}")
            existing_columns = all_columns
        
        df = pl.read_excel(file_path, columns=existing_columns)
        stats['rows_read'] = len(df)
        
        for col in base_columns:
            if col in df.columns and df[col].dtype in [pl.Int64, pl.Float64, pl.Int32]:
                df = df.with_columns(pl.col(col).cast(pl.String).alias(col))
        
        lazy_df = df.lazy()
        lazy_df = lazy_df.rename(FileCleaner.COLUMN_MAPPING['project'])
        
        monthly_cols_present = [col for col in FileCleaner.MONTHLY_COLUMNS if col in df.columns]
        
        if monthly_cols_present:
            for col in monthly_cols_present:
                lazy_df = lazy_df.with_columns(
                    pl.col(col).cast(pl.Float64, strict=False).fill_null(0).alias(col)
                )
            
            lazy_df = lazy_df.with_columns(
                pl.sum_horizontal(monthly_cols_present).alias('monthly_sum_volume')
            )
            lazy_df = lazy_df.drop(monthly_cols_present)
        
        before_unique = stats['rows_read']
        lazy_df = lazy_df.unique()
        stats['duplicates_removed'] = before_unique - stats['rows_read']
        
        string_columns = ['part_number', 'lokid', 'oem_brand', 'project_name']
        for col in string_columns:
            if col in lazy_df.columns:
                lazy_df = lazy_df.with_columns(
                    pl.when(pl.col(col).is_null())
                    .then(pl.lit(None))
                    .otherwise(
                        pl.col(col).cast(pl.String).str.strip_chars()
                        .map_elements(lambda x: None if x == "" else x, return_dtype=pl.String)
                    )
                    .alias(col)
                )
        
        df_cleaned = lazy_df.collect(streaming=True)
        stats['rows_after_clean'] = len(df_cleaned)
        
        for col in df_cleaned.columns:
            stats['total_null_count'] += df_cleaned[col].null_count()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(output_dir, f'cleaned_project_data_{timestamp}.csv')
        df_cleaned.write_csv(output_file)
        
        del df, df_cleaned, lazy_df
        return stats, output_file
    
    @staticmethod
    def _clean_prices_data(file_path: str, output_dir: str) -> Tuple[Dict[str, int], str]:
        """Nettoie le fichier prix - Server-ID avec pandas, LokID et Price Euro avec Polars"""
        stats = {'rows_read': 0, 'rows_after_clean': 0, 'duplicates_removed': 0, 'total_null_count': 0}
        
        print(f"📊 [Prices] Lecture du fichier: {file_path}")
        
        # ========== Étape 1 : Lire Server-ID avec pandas (force String) ==========
        print("📁 [Prices] Lecture de Server-ID avec pandas...")
        df_server_id = pd.read_excel(
            file_path, 
            usecols=['Server-ID'], 
            dtype=str,
            keep_default_na=False
        )
        server_id_values = df_server_id['Server-ID'].tolist()
        print(f"✅ [Prices] Server-ID lu: {len(server_id_values)} lignes")
        print(f"🔍 [Prices] Échantillon Server-ID: {server_id_values[:10]}")
        
        # ========== Étape 2 : Lire le reste avec Polars (y compris LokID et Price Euro) ==========
        print("📁 [Prices] Lecture du reste des données avec Polars...")
        columns_to_keep = ['Part Number', 'LokID', 'Created On', 'Price Euro', 'Fullprice', 'Crcy']
        
        df_rest = pl.read_excel(file_path, columns=columns_to_keep)
        print(f"✅ [Prices] Reste lu: {len(df_rest)} lignes")
        print(f"📊 [Prices] Colonnes Polars: {df_rest.columns}")
        
        # Vérifier le contenu de LokID
        if 'LokID' in df_rest.columns:
            lokid_sample = df_rest['LokID'].head(10).to_list()
            print(f"🔍 [Prices] Échantillon LokID (original): {lokid_sample}")
        
        # Vérifier le contenu de Price Euro
        if 'Price Euro' in df_rest.columns:
            price_eur_sample = df_rest['Price Euro'].head(10).to_list()
            print(f"🔍 [Prices] Échantillon Price Euro (original): {price_eur_sample}")
        
        # ========== Étape 3 : Combiner ==========
        print("📁 [Prices] Combinaison des données...")
        
        # Ajouter la colonne Server-ID au DataFrame Polars
        df_rest = df_rest.with_columns(
            pl.Series('Server-ID', server_id_values)
        )
        
        # Réorganiser les colonnes dans l'ordre souhaité
        select_columns = ['Part Number', 'Server-ID', 'LokID', 'Created On', 'Price Euro', 'Fullprice', 'Crcy']
        existing_columns = [col for col in select_columns if col in df_rest.columns]
        df = df_rest.select(existing_columns)
        
        original_count = len(df)
        print(f"📊 [Prices] Lignes totales: {original_count}")
        
        # ========== Étape 4 : Nettoyage avec Polars ==========
        # Renommer les colonnes
        rename_mapping = {
            'Part Number': 'part_number',
            'Server-ID': 'server_id',
            'LokID': 'lokid',
            'Created On': 'price_date',
            'Price Euro': 'price_eur',
            'Fullprice': 'full_price',
            'Crcy': 'currency'
        }
        df = df.rename({k: v for k, v in rename_mapping.items() if k in df.columns})
        
        # Nettoyage des strings
        string_cols = ['part_number', 'server_id', 'lokid', 'currency']
        for col in string_cols:
            if col in df.columns:
                df = df.with_columns(
                    pl.col(col).str.strip_chars()
                    .map_elements(lambda x: None if x == "" else x, return_dtype=pl.String)
                    .alias(col)
                )
        
        # Conversion des dates
        if 'price_date' in df.columns:
            def convert_date(date_str):
                if date_str is None or date_str == "" or str(date_str).strip() == "":
                    return None
                try:
                    date_str = str(date_str).strip()
                    if '.' in date_str:
                        parts = date_str.split('.')
                        if len(parts) == 3:
                            day = int(parts[0])
                            month = int(parts[1])
                            year = int(parts[2])
                            if 1 <= day <= 31 and 1 <= month <= 12 and 1900 <= year <= 2100:
                                return f"{year:04d}-{month:02d}-{day:02d}"
                    elif '-' in date_str:
                        parts = date_str.split('-')
                        if len(parts) == 3:
                            return date_str
                    elif len(date_str) == 8 and date_str.isdigit():
                        return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
                except:
                    pass
                return None
            
            df = df.with_columns(
                pl.col('price_date')
                .map_elements(convert_date, return_dtype=pl.String)
                .alias('price_date')
            )
            
            invalid_dates = df.filter(pl.col('price_date').is_null()).height
            if invalid_dates > 0:
                print(f"⚠️ [Prices] Dates invalides: {invalid_dates}")
            
            df = df.with_columns(
                pl.col('price_date').str.strptime(pl.Date, format="%Y-%m-%d", strict=False).alias('price_date')
            )
            print("✅ Dates converties")
        
        # Conversion des prix (Price Euro)
        if 'price_eur' in df.columns:
            df = df.with_columns(
                pl.col('price_eur')
                .cast(pl.String)
                .str.replace_all(',', '.')
                .cast(pl.Float64, strict=False)
                .alias('price_eur')
            )
            
            invalid_price_eur = df.filter(pl.col('price_eur').is_null()).height
            if invalid_price_eur > 0:
                print(f"⚠️ [Prices] Price Euro invalides: {invalid_price_eur}")
        
        # Conversion des prix (Fullprice)
        if 'full_price' in df.columns:
            df = df.with_columns(
                pl.col('full_price')
                .cast(pl.String)
                .str.replace_all(',', '.')
                .cast(pl.Float64, strict=False)
                .alias('full_price')
            )
            
            invalid_prices = df.filter(pl.col('full_price').is_null()).height
            if invalid_prices > 0:
                print(f"⚠️ [Prices] Fullprice invalides: {invalid_prices}")
        
        # Suppression des doublons
        before_dedup = len(df)
        df = df.unique()
        stats['duplicates_removed'] = before_dedup - len(df)
        
        stats['rows_read'] = len(df)
        stats['rows_after_clean'] = len(df)
        
        for col in df.columns:
            stats['total_null_count'] += df[col].null_count()
        
        print(f"📊 [Prices] Résumé: original={original_count}, final={stats['rows_after_clean']}, doublons={stats['duplicates_removed']}")
        
        # Vérifier le contenu après nettoyage
        if 'lokid' in df.columns:
            lokid_sample_after = df['lokid'].head(10).to_list()
            print(f"🔍 [Prices] Échantillon LokID après nettoyage: {lokid_sample_after}")
        
        if 'price_eur' in df.columns:
            price_eur_sample_after = df['price_eur'].head(10).to_list()
            print(f"🔍 [Prices] Échantillon Price Euro après nettoyage: {price_eur_sample_after}")
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(output_dir, f'cleaned_prices_data_{timestamp}.csv')
        df.write_csv(output_file)
        
        print(f"✅ [Prices] Fichier sauvegardé: {output_file}")
        
        del df_rest, df, df_server_id
        gc.collect()
        
        return stats, output_file