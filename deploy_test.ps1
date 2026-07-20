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
Write-Host "=== Deploying to Test Environment ==="
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

# 3. Copy frontend dist to test folder
$frontendTest = "C:\leoni\frontend\test"
if (Test-Path "$SourceDir\frontend\dist") {
    Remove-Item "$frontendTest\*" -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item "$SourceDir\frontend\dist\*" $frontendTest -Recurse -Force
    Write-Host "Frontend dist deployed to $frontendTest"
}

# 4. Stop existing service
$existing = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match $ServiceName }
if ($existing) {
    Stop-Process -Id $existing.Id -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "Stopped existing $ServiceName"
}

# 5. Start service
$env:SERVICE_NAME = $ServiceName
$env:PORT = $ServicePort
$logFile = "C:\leoni\logs\${ServiceName}.log"
$proc = Start-Process `
    -FilePath cmd.exe `
    -ArgumentList "/c `"$VenvPath\Scripts\python.exe`" manage.py runserver 0.0.0.0:$ServicePort >> `"$logFile`" 2>&1" `
    -WorkingDirectory "$SourceDir\backend" `
    -PassThru -WindowStyle Hidden
Write-Host "Started $ServiceName (PID: $($proc.Id)) on port $ServicePort"
Write-Host "=== Deploy to Test Complete ==="
