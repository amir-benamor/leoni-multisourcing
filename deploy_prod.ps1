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

$ErrorActionPreference = 'Continue'
Write-Host "=== Deploying to Production Environment ==="
Write-Host "Service: $ServiceName on port $ServicePort"
Write-Host "Database: $DbName"

# 1. Create/update prod venv
if (-not (Test-Path $VenvPath)) {
    & "C:\Users\Amir\AppData\Local\Programs\Python\Python311\python.exe" -m venv "$VenvPath"
}

# 2. Install dependencies
& "$VenvPath\Scripts\pip.exe" install -r "$SourceDir\backend\requirements.txt"
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) { Write-Error "pip install failed (exit $exitCode)"; exit 1 }

# 3. Run migrations
$env:DJANGO_DB_NAME = $DbName
$env:DJANGO_DB_USER = $DbUser
$env:DJANGO_DB_PASSWORD = $DbPassword
$env:DJANGO_DB_HOST = 'localhost'
$env:DJANGO_DB_PORT = '3306'
$env:DJANGO_SECRET_KEY = "prod-key-change-me-in-production"

Set-Location $SourceDir\backend
& "$VenvPath\Scripts\python.exe" manage.py migrate --noinput
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) { Write-Error "Migration failed (exit $exitCode)"; exit 1 }

# 4. Copy frontend dist to prod folder
$frontendProd = "C:\leoni\frontend\prod"
if (Test-Path "$SourceDir\frontend\dist") {
    Remove-Item "$frontendProd\*" -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item "$SourceDir\frontend\dist\*" $frontendProd -Recurse -Force
    Write-Host "Frontend dist deployed to $frontendProd"
}

# 5. Stop existing service
$existing = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match $ServiceName }
if ($existing) {
    Stop-Process -Id $existing.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    Write-Host "Stopped existing $ServiceName"
}

# 6. Start production service with waitress
$env:SERVICE_NAME = $ServiceName
$env:PORT = $ServicePort
$env:DJANGO_SETTINGS_MODULE = 'backend.settings'
$env:DJANGO_DEBUG = 'False'
$logFile = "C:\leoni\logs\${ServiceName}.log"
$proc = Start-Process `
    -FilePath cmd.exe `
    -ArgumentList "/c `"$VenvPath\Scripts\python.exe`" serve.py >> `"$logFile`" 2>&1" `
    -WorkingDirectory "$SourceDir\backend" `
    -PassThru -WindowStyle Hidden
Write-Host "Started $ServiceName (PID: $($proc.Id)) on port $ServicePort with Waitress"
Write-Host "=== Deploy to Production Complete ==="
