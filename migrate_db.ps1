param(
    [string]$SourceDir,
    [string]$VenvPath,
    [string]$BackupDir,
    [string]$DbName,
    [string]$DbUser,
    [string]$DbPassword,
    [string]$MySqlBin = "C:\xampp\mysql\bin"
)

$ErrorActionPreference = 'Continue'
Write-Host "=== Running migrations for $DbName ==="

# Find the most recent predeploy backup for this database
$backupFile = Get-ChildItem "$BackupDir\${DbName}_predeploy_*.sql" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 -ExpandProperty FullName

if (-not $backupFile) {
    Write-Error "No pre-deploy backup found for $DbName in $BackupDir — cannot proceed (no rollback safety)"
    exit 1
}

Write-Host "Rollback backup: $backupFile"

# Set Django env vars
$env:DJANGO_DB_NAME = $DbName
$env:DJANGO_DB_USER = $DbUser
$env:DJANGO_DB_PASSWORD = $DbPassword
$env:DJANGO_DB_HOST = 'localhost'
$env:DJANGO_DB_PORT = '3306'
$env:DJANGO_SECRET_KEY = "migrate-key-$(Get-Random)"

Set-Location $SourceDir\backend

# Run migrations
& "$VenvPath\Scripts\python.exe" manage.py migrate --noinput
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
    Write-Error "Migration failed (exit $exitCode) — rolling back database from $backupFile"
    & "$SourceDir\restore_db.ps1" -DbName $DbName -BackupFile $backupFile -DbUser $DbUser -DbPassword $DbPassword -MySqlBin $MySqlBin
    Write-Error "Rollback complete. Migration stage failed."
    exit 1
}

Write-Host "Migration successful for $DbName"
