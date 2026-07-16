import json, os, sys
from datetime import datetime

html = """<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><title>Leoni Security Report</title>
<style>
body{font-family:-apple-system,sans-serif;margin:20px;background:#f5f5f5;color:#333}
h1{color:#e53935;border-bottom:2px solid #e53935;padding-bottom:8px}
.section{background:#fff;border-radius:8px;padding:16px;margin:16px 0;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.section h2{margin:0 0 12px 0;color:#1565c0}
.issue{margin:4px 0;padding:4px 8px;border-left:4px solid #ccc;font-size:14px}
.HIGH,.CRITICAL,.high,.critical{border-left-color:#e53935;background:#ffebee}
.MEDIUM,.medium{border-left-color:#ff9800;background:#fff3e0}
.LOW,.low{border-left-color:#4caf50;background:#e8f5e9}
.summary{display:flex;gap:16px;margin:16px 0}
.card{flex:1;background:#fff;border-radius:8px;padding:20px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.12)}
.card .num{font-size:36px;font-weight:700;display:block}
.card .label{font-size:14px;color:#666}
.timestamp{color:#999;font-size:13px;margin-top:8px}
</style></head><body>
<h1>Leoni Multi-Sourcing - Security Scan Report</h1>
<p class="timestamp">Generated: %s</p>
<div class="summary">
"""

def count_severity(data, severity_key, fields):
    count = 0
    for item in data:
        sev = item
        for f in fields:
            if isinstance(sev, dict):
                sev = sev.get(f, {})
            else:
                break
        if isinstance(sev, str) and sev.upper() in ('HIGH', 'CRITICAL'):
            count += 1
    return count

try:
    with open('bandit-report.json') as f:
        bandit = json.load(f)
        html += f'<div class="card"><span class="num">{len(bandit.get("results",[]))}</span><span class="label">Bandit Issues</span></div>'
except:
    html += '<div class="card"><span class="num">0</span><span class="label">Bandit</span></div>'

for name, rfile in [('pip-audit', 'pip-audit-report.json'), ('Safety', 'safety-report.json')]:
    try:
        with open(rfile) as f:
            data = json.load(f)
            vulns = data if isinstance(data, list) else data.get('vulnerabilities', [])
            html += f'<div class="card"><span class="num">{len(vulns)}</span><span class="label">{name}</span></div>'
    except:
        html += f'<div class="card"><span class="num">0</span><span class="label">{name}</span></div>'

try:
    with open('npm-audit-report.json') as f:
        data = json.load(f)
        html += f'<div class="card"><span class="num">{len(data.get("vulnerabilities",{}))}</span><span class="label">npm audit</span></div>'
except:
    html += '<div class="card"><span class="num">0</span><span class="label">npm audit</span></div>'

html += '</div>'

scanners = [
    ('Bandit', 'bandit-report.json', 'results', 'issue_severity', 'issue_text', 'filename'),
    ('Trivy (Backend)', 'trivy-report.json', ('Results', '__vulns__'), 'Severity', 'Title', 'PkgName'),
    ('Trivy (Frontend)', 'trivy-frontend-report.json', ('Results', '__vulns__'), 'Severity', 'Title', 'PkgName'),
    ('pip-audit', 'pip-audit-report.json', '__direct__', 'severity', 'description', 'name'),
    ('Safety', 'safety-report.json', 'vulnerabilities', 'severity', 'advisory', 'package_name'),
    ('Secrets', 'secrets-report.json', 'results', '__key__', 'type', '__key__'),
    ('npm audit', 'npm-audit-report.json', 'vulnerabilities', 'severity', 'title', '__key__'),
]

for name, rfile, results_path, sev_key, text_key, source_key in scanners:
    if not os.path.exists(rfile):
        continue
    html += f'<div class="section"><h2>{name}</h2>'
    try:
        with open(rfile) as f:
            data = json.load(f)
        items = []
        if results_path == '__direct__':
            items = data if isinstance(data, list) else []
        elif results_path == ('Results', '__vulns__'):
            for r in data.get('Results', []):
                items.extend(r.get('Vulnerabilities', []))
        elif results_path == 'results':
            if isinstance(data, dict) and 'results' in data:
                raw = data['results']
                if isinstance(raw, dict):
                    for fname, issues in raw.items():
                        for i in issues:
                            items.append(i)
                else:
                    items = raw
            else:
                items = data if isinstance(data, list) else []
        elif results_path == ('__key__',):
            items = data if isinstance(data, dict) else []
        else:
            items = data.get(results_path, [])
            if isinstance(items, dict):
                flat = []
                for k, v in items.items():
                    if isinstance(v, list):
                        for i in v:
                            flat.append(i)
                    else:
                        flat.append({source_key: k, text_key: str(v), sev_key: '?'})
                items = flat
        for item in items[:50]:
            sev = ''
            if isinstance(item, dict):
                sev = str(item.get(sev_key, '?'))
                txt = str(item.get(text_key, '?'))
                src = str(item.get(source_key, '?'))
            elif isinstance(item, str):
                sev, txt, src = '?', item, '?'
            else:
                sev, txt, src = '?', str(item), '?'
            sev_class = sev.upper() if sev else 'LOW'
            html += f'<div class="issue {sev_class}"><strong>[{sev}]</strong> {src}: {txt}</div>'
        if len(items) > 50:
            html += f'<p>... and {len(items)-50} more</p>'
    except Exception as e:
        html += f'<p>Error: {e}</p>'
    html += '</div>'

html += '</body></html>'
html = html % datetime.now().strftime('%Y-%m-%d %H:%M:%S')

with open('security-report.html', 'w', encoding='utf-8') as f:
    f.write(html)
print(f"Generated security-report.html ({len(html)} bytes)")
