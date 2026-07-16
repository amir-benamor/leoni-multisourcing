import json, os, sys

HIGH_FINDINGS = []

reports = {
    'bandit-report.json': lambda d: [
        i for i in d.get('results', []) if i.get('issue_severity', '').upper() in ('HIGH',)
    ],
    'pip-audit-report.json': lambda d: [
        v for v in (d if isinstance(d, list) else d.get('vulnerabilities', []))
        if v.get('severity', '').upper() in ('HIGH', 'CRITICAL')
    ],
    'safety-report.json': lambda d: [
        v for v in d.get('vulnerabilities', [])
        if v.get('severity', '').upper() in ('HIGH', 'CRITICAL')
    ],
    'trivy-report.json': lambda d: [
        v for r in d.get('Results', []) for v in r.get('Vulnerabilities', [])
        if v.get('Severity', '').upper() in ('HIGH', 'CRITICAL')
    ],
    'trivy-frontend-report.json': lambda d: [
        v for r in d.get('Results', []) for v in r.get('Vulnerabilities', [])
        if v.get('Severity', '').upper() in ('HIGH', 'CRITICAL')
    ],
}

for rfile, extract in reports.items():
    if not os.path.exists(rfile):
        continue
    try:
        with open(rfile) as f:
            data = json.load(f)
        findings = extract(data)
        for f_ in findings:
            HIGH_FINDINGS.append((rfile, f_))
    except:
        pass

if HIGH_FINDINGS:
    print(f"SEVERITY GATE FAILED: {len(HIGH_FINDINGS)} HIGH/CRITICAL finding(s):")
    for src, f_ in HIGH_FINDINGS:
        desc = f_.get('issue_text', f_.get('description', f_.get('Title', json.dumps(f_))))
        loc = f_.get('filename', f_.get('package_name', f_.get('PkgName', '')))
        print(f"  [{src}] {loc}: {desc}")
    sys.exit(1)
else:
    print("Severity gate PASSED: No HIGH/CRITICAL findings")
    sys.exit(0)
