import pytest
from django.test import TestCase

class TestProjectSetup(TestCase):
    def test_app_imports(self):
        from authentication.models import User
        from component.models import PartTechnicalData
        from historique.models import BusinessCase
        from historique.models import ImportHistory
        from alternative.models import Alternative
        self.assertTrue(True)
