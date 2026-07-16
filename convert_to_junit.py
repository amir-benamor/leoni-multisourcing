import json, os, sys, xml.etree.ElementTree as ET
from datetime import datetime

os.makedirs('security-results', exist_ok=True)
root = ET.Element('testsuites', name="Security Scans")
total_tests = 0
total_failures = 0

def add_suite(name, report_file, test_cases):
    global total_tests, total_failures
    if not os.path.exists(report_file):
        return
    suite = ET.SubElement(root, 'testsuite', name=name, tests=str(len(test_cases)),
                          failures=str(sum(1 for _, _, failed in test_cases if failed)),
                          timestamp=datetime.now().isoformat())
    for case_name, msg, failed in test_cases:
        tc = ET.SubElement(suite, 'testcase', name=case_name, classname=name)
        if failed and msg:
            ET.SubElement(tc, 'failure', message=msg, type="security")
        total_tests += 1
        if failed:
            total_failures += 1

scanners = [
    ('Bandit', 'bandit-report.json', lambda d: [
        (f"{i.get('filename','?')}:{i.get('line_number','?')}", i.get('issue_text',''), True)
        for i in d.get('results', []) if i.get('issue_severity') in ('HIGH', 'MEDIUM')
    ] or [('Bandit scan', 'No HIGH/MEDIUM issues', False)]),
    ('pip-audit', 'pip-audit-report.json', lambda d: [
        (v.get('name','?'), f"{v.get('severity','?')} - {v.get('description','')}", v.get('severity') in ('HIGH','CRITICAL'))
        for v in (d if isinstance(d, list) else d.get('vulnerabilities', []))
    ] or [('pip-audit', 'No vulnerabilities', False)]),
    ('Safety', 'safety-report.json', lambda d: [
        (v.get('package_name','?'), f"{v.get('severity','?')}", v.get('severity') in ('HIGH','CRITICAL'))
        for v in d.get('vulnerabilities', [])
    ] or [('Safety', 'No vulnerabilities', False)]),
    ('Trivy', 'trivy-report.json', lambda d: [
        (f"{v.get('PkgName','?')} {v.get('InstalledVersion','?')}", f"[{v.get('Severity','?')}] -> {v.get('FixedVersion','?')}", v.get('Severity') in ('HIGH','CRITICAL'))
        for r in d.get('Results',[]) for v in r.get('Vulnerabilities',[])
    ] or [('Trivy', 'No vulnerabilities', False)]),
    ('Trivy-Frontend', 'trivy-frontend-report.json', lambda d: [
        (f"{v.get('PkgName','?')} {v.get('InstalledVersion','?')}", f"[{v.get('Severity','?')}] -> {v.get('FixedVersion','?')}", v.get('Severity') in ('HIGH','CRITICAL'))
        for r in d.get('Results',[]) for v in r.get('Vulnerabilities',[])
    ] or [('Trivy-Frontend', 'No vulnerabilities', False)]),
    ('Secrets', 'secrets-report.json', lambda d: [
        (f"{fname}:{s.get('line_number','?')}", f"{s.get('type','?')}", True)
        for fname, slist in d.get('results',{}).items() for s in slist
    ] or [('Secrets', 'No secrets found', False)]),
]

for name, rfile, extract in scanners:
    if os.path.exists(rfile):
        with open(rfile) as f:
            try:
                data = json.load(f)
                cases = extract(data)
                add_suite(name, rfile, cases)
            except:
                pass

tree = ET.ElementTree(root)
tree.write('security-results/security-junit.xml', encoding='utf-8', xml_declaration=True)
print(f"Converted {total_tests} security checks to JUnit ({total_failures} failures)")
