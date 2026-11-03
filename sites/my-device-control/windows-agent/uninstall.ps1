# MY DEVICE CONTROL — Nyahpasang agent Windows secara manual
# Guna ini jika mesin tak boleh sambung internet untuk lepaskan diri secara automatik selepas
# admin membuang peranti dari panel. Jalankan dalam PowerShell:  .\uninstall.ps1

$ErrorActionPreference = "SilentlyContinue"
Unregister-ScheduledTask -TaskName "MyDeviceControlAgent" -Confirm:$false
Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.Path -and (Get-CimInstance Win32_Process -Filter "ProcessId=$($_.Id)").CommandLine -match "MyDeviceControl.*agent\.ps1" } | Stop-Process -Force
Remove-Item -Path (Join-Path $env:LOCALAPPDATA "MyDeviceControl") -Recurse -Force
Write-Host "Agent MY DEVICE CONTROL dibuang daripada mesin ini." -ForegroundColor Green
