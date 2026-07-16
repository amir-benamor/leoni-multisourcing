import pytest
from django.test import TestCase

class TestProjectSetup(TestCase):
    def test_django_imports(self):
        from django.conf import settings
        self.assertTrue(settings.configured)
