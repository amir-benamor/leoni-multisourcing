import json, sys
try:
    with open('npm-audit-report.json') as f:
        data = json.load(f)
    vulns = data.get('vulnerabilities', {})
    print(f"npm audit: {len(vulns)} vulnerability(ies) found")
    for pkg, info in vulns.items():
        print(f"  [{info.get('severity','?')}] {pkg}: {info.get('title','?')}")
except Exception as e:
    print(f"npm audit report: {e}")
    sys.exit(0)
