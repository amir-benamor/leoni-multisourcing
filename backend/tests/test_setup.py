import pytest
from django.test import TestCase

class TestProjectSetup(TestCase):
    def test_app_imports(self):
        from authentication.models import User
        from component.models import PartTechnicalData
        from business_case.models import BusinessCase
        from dashboard.models import Dashboard
        from historique.models import ImportHistory
        from explore_status.models import ExploreStatus
        from alternative.models import Alternative
        self.assertTrue(True)
