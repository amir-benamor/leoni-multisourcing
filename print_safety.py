import json, sys
try:
    with open('safety-report.json') as f:
        data = json.load(f)
    vulns = data.get('vulnerabilities', [])
    print(f"Safety: {len(vulns)} vulnerability(ies) found")
    for v in vulns:
        print(f"  [{v.get('severity','?')}] {v.get('package_name','?')} {v.get('analyzed_version','?')}")
except Exception as e:
    print(f"Safety report: {e}")
    sys.exit(0)
