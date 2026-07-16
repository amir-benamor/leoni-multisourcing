import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.settings import *

DATABASES['default'] = {
    'ENGINE': 'django.db.backends.mysql',
    'NAME': os.environ.get('DJANGO_DB_NAME', 'multisourcing_test'),
    'USER': os.environ.get('DJANGO_DB_USER', 'root'),
    'PASSWORD': os.environ.get('DJANGO_DB_PASSWORD', ''),
    'HOST': os.environ.get('DJANGO_DB_HOST', 'localhost'),
    'PORT': os.environ.get('DJANGO_DB_PORT', '3306'),
}

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'test-secret-key-pipeline')
DEBUG = False
