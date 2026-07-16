import json, sys
try:
    with open('bandit-report.json') as f:
        data = json.load(f)
    issues = data.get('results', [])
    print(f"Bandit: {len(issues)} issue(s) found")
    for i in issues:
        print(f"  [{i.get('issue_severity','?')}] {i.get('filename','?')}:{i.get('line_number','?')} - {i.get('issue_text','?')}")
except Exception as e:
    print(f"Bandit report: {e}")
    sys.exit(0)
