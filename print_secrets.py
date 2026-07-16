import json, sys
try:
    with open('secrets-report.json') as f:
        data = json.load(f)
    results = data.get('results', {})
    count = sum(len(v) for v in results.values())
    print(f"detect-secrets: {count} potential secret(s) found")
    for filename, secrets in results.items():
        for s in secrets:
            print(f"  {filename}:{s.get('line_number','?')} - {s.get('type','?')}")
except Exception as e:
    print(f"Secrets report: {e}")
    sys.exit(0)
