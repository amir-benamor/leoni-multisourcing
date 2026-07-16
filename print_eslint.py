import json, sys
try:
    with open('eslint-report.json') as f:
        data = json.load(f)
    count = 0
    for file_result in data if isinstance(data, list) else []:
        count += len(file_result.get('messages', []))
    print(f"ESLint: {count} issue(s) found")
    for file_result in data if isinstance(data, list) else []:
        for m in file_result.get('messages', []):
            print(f"  [{m.get('severity','?')}] {file_result.get('filePath','?')}:{m.get('line','?')} - {m.get('message','?')}")
except Exception as e:
    print(f"ESLint report: {e}")
    sys.exit(0)
