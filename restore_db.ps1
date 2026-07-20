param(
    [string]$DbName = "multisourcing_test",
    [string]$BackupFile,
    [string]$DbUser = "root",
    [string]$DbPassword = "",
    [string]$MySqlBin = "C:\xampp\mysql\bin"
)

$ErrorActionPreference = 'Continue'

$mysql = Join-Path $MySqlBin "mysql.exe"
if (-not (Test-Path $mysql)) {
    Write-Error "mysql.exe not found at $mysql"
    exit 1
}
if (-not (Test-Path $BackupFile)) {
    Write-Error "Backup file not found: $BackupFile"
    exit 1
}

$env:MYSQL_PWD = $DbPassword

Write-Host "Dropping database $DbName..."
& $mysql -u $DbUser -e "DROP DATABASE IF EXISTS `"$DbName`";" 2>$null
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to drop database"; exit 1 }

Write-Host "Recreating database $DbName..."
& $mysql -u $DbUser -e "CREATE DATABASE `"$DbName`" CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>$null
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to create database"; exit 1 }

Write-Host "Restoring from $BackupFile..."
Get-Content $BackupFile | & $mysql -u $DbUser "$DbName"
if ($LASTEXITCODE -eq 0) {
    Write-Host "Restore completed: $BackupFile -> $DbName"
} else {
    Write-Error "Restore failed"
    exit 1
}
