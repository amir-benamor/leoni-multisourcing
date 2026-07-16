import json, sys
try:
    with open('trivy-frontend-report.json') as f:
        data = json.load(f)
    results = data.get('Results', [])
    total = sum(len(r.get('Vulnerabilities', [])) for r in results)
    print(f"Trivy (frontend): {total} vulnerability(ies) found")
    for r in results:
        for v in r.get('Vulnerabilities', []):
            print(f"  [{v.get('Severity','?')}] {v.get('PkgName','?')} {v.get('InstalledVersion','?')} -> {v.get('FixedVersion','?')}")
except Exception as e:
    print(f"Trivy frontend report: {e}")
    sys.exit(0)
