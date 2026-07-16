# authentication/management/commands/create_admin.py

from django.core.management.base import BaseCommand
from django.core.management import call_command
from authentication.models import User


class Command(BaseCommand):
    help = 'Crée un administrateur avec tous les droits'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--email', 
            type=str, 
            required=True, 
            help='Email de l\'administrateur'
        )
        parser.add_argument(
            '--password', 
            type=str, 
            required=True, 
            help='Mot de passe'
        )
        parser.add_argument(
            '--first-name', 
            type=str, 
            required=True, 
            help='Prénom'
        )
        parser.add_argument(
            '--last-name', 
            type=str, 
            required=True, 
            help='Nom'
        )
        parser.add_argument(
            '--username', 
            type=str, 
            help='Nom d\'utilisateur (optionnel, généré automatiquement si non fourni)'
        )
    
    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        first_name = options['first_name']
        last_name = options['last_name']
        username = options.get('username')
        
        # Générer un username si non fourni
        if not username:
            base_username = email.split('@')[0]
            # Nettoyer le username (enlever les caractères spéciaux)
            import re
            base_username = re.sub(r'[^a-zA-Z0-9]', '', base_username)
            username = base_username
            
            # Vérifier si le username existe déjà
            counter = 1
            original_username = username
            while User.objects.filter(username=username).exists():
                username = f"{original_username}{counter}"
                counter += 1
        
        # Vérifier si l'utilisateur existe déjà
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                'username': username,
                'first_name': first_name,
                'last_name': last_name,
                'role': User.Role.ADMIN,
                'is_approved': True,
                'is_staff': True,
                'is_superuser': True,
                'is_active': True,
            }
        )
        
        if not created:
            # Mettre à jour l'utilisateur existant
            user.role = User.Role.ADMIN
            user.is_approved = True
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.first_name = first_name
            user.last_name = last_name
            user.save()
            self.stdout.write(self.style.WARNING(f'⚠️  Utilisateur {email} mis à jour en tant qu\'administrateur'))
        else:
            # Définir le mot de passe pour le nouvel utilisateur
            user.set_password(password)
            user.save()
            self.stdout.write(self.style.SUCCESS(f'✅ Administrateur créé avec succès !'))
        
        # Afficher les informations de connexion
        self.stdout.write('')
        self.stdout.write('=' * 50)
        self.stdout.write(self.style.SUCCESS('📋 INFORMATIONS DE CONNEXION :'))
        self.stdout.write('=' * 50)
        self.stdout.write(f'   Email    : {email}')
        self.stdout.write(f'   Mot de passe : {password}')
        self.stdout.write(f'   Username : {username}')
        self.stdout.write(f'   Rôle     : ADMIN')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('✅ Vous pouvez maintenant vous connecter à l\'interface admin React'))
        self.stdout.write('=' * 50)