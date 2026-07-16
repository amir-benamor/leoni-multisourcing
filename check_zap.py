import json, os, sys

if not os.path.exists('zap-report.json'):
    print("ZAP report not found - skipping gate")
    sys.exit(0)

with open('zap-report.json') as f:
    data = json.load(f)

high_alerts = []
for site in data.get('site', []):
    for alert in site.get('alerts', []):
        risk = alert.get('risk', '').upper()
        if risk in ('HIGH', 'CRITICAL'):
            high_alerts.append(alert)

if high_alerts:
    print(f"ZAP GATE FAILED: {len(high_alerts)} HIGH/CRITICAL alert(s):")
    for a in high_alerts:
        print(f"  [{a.get('risk','?')}] {a.get('name','?')} - {a.get('url','?')}")
    sys.exit(1)
else:
    print("ZAP gate PASSED: No HIGH/CRITICAL alerts")
    sys.exit(0)
