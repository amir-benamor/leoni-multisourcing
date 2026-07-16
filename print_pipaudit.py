import json, sys
try:
    with open('pip-audit-report.json') as f:
        data = json.load(f)
    if isinstance(data, dict):
        vulns = data.get('vulnerabilities', [])
    elif isinstance(data, list):
        vulns = data
    else:
        vulns = []
    print(f"pip-audit: {len(vulns)} vulnerability(ies) found")
    for v in vulns:
        pkg = v.get('name', v.get('package', '?'))
        print(f"  [{v.get('severity', v.get('Severity', '?'))}] {pkg}")
except Exception as e:
    print(f"pip-audit report: {e}")
    sys.exit(0)
