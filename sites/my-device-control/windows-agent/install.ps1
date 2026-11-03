# MY DEVICE CONTROL — Pasang agent Windows
# Jalankan dalam PowerShell (klik kanan fail ini, "Run with PowerShell", atau salin-tampal arahan di bawah
# dalam tetingkap PowerShell biasa — tidak perlu Administrator).
#
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
#   .\install.ps1 -Code "TAMPAL_KOD_32_AKSARA_DARI_PANEL_ADMIN"

param(
  [Parameter(Mandatory = $false)][string]$Code
)

$ErrorActionPreference = "Stop"
if (-not $Code) { $Code = Read-Host "Tampal kod enrollment dari panel admin" }
$Code = $Code.Trim().Trim('"', "'")
if ($Code.Length -lt 24) { Write-Host "Kod terlalu pendek. Salin kod penuh dari panel admin." -ForegroundColor Red; exit 1 }

$InstallDir = Join-Path $env:LOCALAPPDATA "MyDeviceControl"
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
Copy-Item -Path (Join-Path $PSScriptRoot "agent.ps1") -Destination (Join-Path $InstallDir "agent.ps1") -Force
Set-Content -Path (Join-Path $InstallDir "pending-code.txt") -Value $Code -Encoding UTF8

$agentPath = Join-Path $InstallDir "agent.ps1"
$action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$agentPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -Hidden -ExecutionTimeLimit (New-TimeSpan -Days 0)
try { Unregister-ScheduledTask -TaskName "MyDeviceControlAgent" -Confirm:$false -ErrorAction SilentlyContinue } catch {}
Register-ScheduledTask -TaskName "MyDeviceControlAgent" -Action $action -Trigger $trigger -Settings $settings -Description "MY DEVICE CONTROL — agent status & kunci jauh" | Out-Null
Start-ScheduledTask -TaskName "MyDeviceControlAgent"

Write-Host ""
Write-Host "Dipasang. Peranti ini akan didaftarkan dalam beberapa saat dan menunggu kelulusan admin." -ForegroundColor Green
Write-Host "Log: $InstallDir\agent.log"
