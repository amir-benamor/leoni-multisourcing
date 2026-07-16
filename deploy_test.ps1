param(
    [string]$SourceDir,
    [string]$VenvPath,
    [string]$BackupDir,
    [string]$DbName,
    [string]$DbUser,
    [string]$DbPassword,
    [string]$ServiceName,
    [string]$ServicePort
)

Write-Host "=== Deploying to Test Environment ==="
Write-Host "Service: $ServiceName on port $ServicePort"
Write-Host "Database: $DbName"

# 1. Create/update prod venv
if (-not (Test-Path $VenvPath)) {
    py -3.11 -m venv "$VenvPath"
}

# 2. Install dependencies
& "$VenvPath\Scripts\pip.exe" install -r "$SourceDir\backend\requirements.txt" 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { Write-Error "pip install failed"; exit 1 }

# 3. Run migrations
$env:DJANGO_DB_NAME = $DbName
$env:DJANGO_DB_USER = $DbUser
$env:DJANGO_DB_PASSWORD = $DbPassword
$env:DJANGO_DB_HOST = 'localhost'
$env:DJANGO_DB_PORT = '3306'
$env:DJANGO_SECRET_KEY = "test-deploy-key-$(Get-Random)"

Set-Location $SourceDir\backend
& "$VenvPath\Scripts\python.exe" manage.py migrate --noinput 2>&1
if ($LASTEXITCODE -ne 0) { Write-Error "Migration failed"; exit 1 }

# 4. Copy frontend dist to test folder
$frontendTest = "C:\leoni\frontend\test"
if (Test-Path "$SourceDir\frontend\dist") {
    Remove-Item "$frontendTest\*" -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item "$SourceDir\frontend\dist\*" $frontendTest -Recurse -Force
    Write-Host "Frontend dist deployed to $frontendTest"
}

# 5. Stop existing service
$existing = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match $ServiceName }
if ($existing) {
    Stop-Process -Id $existing.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "Stopped existing $ServiceName"
}

# 6. Start service
$env:SERVICE_NAME = $ServiceName
$env:PORT = $ServicePort
$logFile = "C:\leoni\logs\${ServiceName}.log"
$proc = Start-Process `
    -FilePath "$VenvPath\Scripts\python.exe" `
    -ArgumentList "manage.py runserver 0.0.0.0:$ServicePort" `
    -WorkingDirectory "$SourceDir\backend" `
    -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $logFile `
    -RedirectStandardError $logFile
Write-Host "Started $ServiceName (PID: $($proc.Id)) on port $ServicePort"
Write-Host "=== Deploy to Test Complete ==="
