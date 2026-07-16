param(
    [string]$DbName = "multisourcing_test",
    [string]$BackupDir = "C:\leoni\backups",
    [string]$DbUser = "root",
    [string]$DbPassword = "",
    [string]$MySqlBin = "C:\xampp\mysql\bin"
)

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $BackupDir "${DbName}_${timestamp}.sql"
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

$mysqldump = Join-Path $MySqlBin "mysqldump.exe"
if (-not (Test-Path $mysqldump)) {
    Write-Error "mysqldump not found at $mysqldump"
    exit 1
}

$env:MYSQL_PWD = $DbPassword
& $mysqldump -u $DbUser --databases $DbName --routines --triggers --single-transaction | Out-File -FilePath $backupFile -Encoding utf8

if ($LASTEXITCODE -eq 0) {
    Write-Host "Backup completed: $backupFile"
} else {
    Write-Error "Backup failed for database: $DbName"
    exit 1
}
