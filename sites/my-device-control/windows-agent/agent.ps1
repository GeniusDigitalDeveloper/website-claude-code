# MY DEVICE CONTROL — Agent Windows (Fasa 5)
# Satu fail PowerShell. Tiada pemasangan Node/.NET diperlukan. Guna Firebase REST API terus.
# Keupayaan: daftar dengan kod, heartbeat setiap 60 saat, terima arahan LOCK / SYNC_POLICY,
# lepaskan diri (uninstall sendiri) bila peranti dibuang dari panel admin.
# Tiada remote shell tersembunyi dan tiada arahan dijalankan selain yang disenaraikan di bawah.

$ErrorActionPreference = "Stop"

# ===================== TETAPAN FIREBASE (projek my-devide-control) =====================
$ApiKey    = "AIzaSyArLRlQqRAXckvH9jAsA4gcZ2bGfsJCl_c"
$ProjectId = "my-devide-control"
$AppVersion = "windows-0.1"
$HeartbeatSec = 60
# =========================================================================================

$InstallDir = Join-Path $env:LOCALAPPDATA "MyDeviceControl"
$StatePath  = Join-Path $InstallDir "state.json"
$LogPath    = Join-Path $InstallDir "agent.log"

function Write-Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $msg
  try { Add-Content -Path $LogPath -Value $line -Encoding UTF8 } catch {}
}

# ---------- Firestore REST: penukaran jenis nilai ----------
function ConvertTo-FsValue($v) {
  if ($null -eq $v) { return @{ nullValue = $null } }
  if ($v -is [bool]) { return @{ booleanValue = $v } }
  if ($v -is [int] -or $v -is [long]) { return @{ integerValue = "$v" } }
  if ($v -is [string] -and $v -eq "__SERVER_TIME__") { return @{ timestampValue = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } }
  return @{ stringValue = "$v" }
}
function ConvertTo-FsFields([hashtable]$h) {
  $f = @{}
  foreach ($k in $h.Keys) { $f[$k] = ConvertTo-FsValue $h[$k] }
  return $f
}
function ConvertFrom-FsValue($v) {
  if ($null -eq $v) { return $null }
  if ($v.PSObject.Properties.Name -contains "stringValue") { return $v.stringValue }
  if ($v.PSObject.Properties.Name -contains "integerValue") { return [long]$v.integerValue }
  if ($v.PSObject.Properties.Name -contains "booleanValue") { return $v.booleanValue }
  if ($v.PSObject.Properties.Name -contains "timestampValue") { return $v.timestampValue }
  if ($v.PSObject.Properties.Name -contains "nullValue") { return $null }
  return $null
}
function ConvertFrom-FsDoc($doc) {
  $out = @{}
  if ($doc.fields) { foreach ($p in $doc.fields.PSObject.Properties) { $out[$p.Name] = ConvertFrom-FsValue $p.Value } }
  return $out
}

# ---------- Auth (tanpa e-mel, sama seperti peranti lain — anonymous) ----------
function Save-State($s) { if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null }; $s | ConvertTo-Json | Set-Content -Path $StatePath -Encoding UTF8 }
function Load-State() { if (Test-Path $StatePath) { return (Get-Content $StatePath -Raw | ConvertFrom-Json) } ; return $null }

function New-AnonymousUser() {
  $r = Invoke-RestMethod -Method Post -Uri "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$ApiKey" -ContentType "application/json" -Body (@{ returnSecureToken = $true } | ConvertTo-Json)
  return @{ uid = $r.localId; idToken = $r.idToken; refreshToken = $r.refreshToken }
}
function Get-FreshIdToken($refreshToken) {
  $r = Invoke-RestMethod -Method Post -Uri "https://securetoken.googleapis.com/v1/token?key=$ApiKey" -ContentType "application/x-www-form-urlencoded" -Body "grant_type=refresh_token&refresh_token=$refreshToken"
  return @{ idToken = $r.id_token; refreshToken = $r.refresh_token; uid = $r.user_id }
}

# ---------- Firestore REST: CRUD ringkas ----------
$Base = "https://firestore.googleapis.com/v1/projects/$ProjectId/databases/(default)/documents"
function Fs-Get($idToken, $path) {
  try { return Invoke-RestMethod -Method Get -Uri "$Base/$path" -Headers @{ Authorization = "Bearer $idToken" } }
  catch { if ($_.Exception.Response.StatusCode.value__ -eq 404) { return $null }; throw }
}
function Fs-Patch($idToken, $path, [hashtable]$fields) {
  $mask = ($fields.Keys | ForEach-Object { "updateMask.fieldPaths=$_" }) -join "&"
  $body = @{ fields = (ConvertTo-FsFields $fields) } | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method Patch -Uri "$Base/$($path)?$mask" -Headers @{ Authorization = "Bearer $idToken" } -ContentType "application/json" -Body $body
}
function Fs-CreateIn($idToken, $collection, [hashtable]$fields) {
  $body = @{ fields = (ConvertTo-FsFields $fields) } | ConvertTo-Json -Depth 10
  return Invoke-RestMethod -Method Post -Uri "$Base/$($collection)" -Headers @{ Authorization = "Bearer $idToken" } -ContentType "application/json" -Body $body
}
function Fs-RunQuery($idToken, [hashtable]$body) {
  $json = $body | ConvertTo-Json -Depth 20
  return Invoke-RestMethod -Method Post -Uri "$Base`:runQuery" -Headers @{ Authorization = "Bearer $idToken" } -ContentType "application/json" -Body $json
}
function New-DocId() { -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 20 | ForEach-Object { [char]$_ }) }

# Satu commit atomik dengan beberapa writes (sama seperti F.writeBatch dalam agent.html/Android) —
# perlu, sebab rules devices.create menyemak getAfter(enrollment).status == 'USED' dalam transaksi yang SAMA.
function New-FsWrite($path, [hashtable]$fields, [string[]]$maskFields, $mustNotExist) {
  $w = @{ update = @{ name = "projects/$ProjectId/databases/(default)/documents/$path"; fields = (ConvertTo-FsFields $fields) } }
  if ($maskFields) { $w.updateMask = @{ fieldPaths = $maskFields } }
  if ($null -ne $mustNotExist) { $w.currentDocument = @{ exists = (-not $mustNotExist) } }
  return $w
}
function Fs-Commit($idToken, [array]$writes) {
  $body = @{ writes = $writes } | ConvertTo-Json -Depth 20
  return Invoke-RestMethod -Method Post -Uri "$Base`:commit" -Headers @{ Authorization = "Bearer $idToken" } -ContentType "application/json" -Body $body
}

# activityLogs.createdAt mesti sama dengan masa pelayan tepat (rules), jadi guna transform serverValue
# (bukan fields biasa) supaya padan dengan cara agent.html/Android tulis log.
function Write-Activity($idToken, $uid, $type, $message) {
  try {
    $w = New-FsWrite "activityLogs/$(New-DocId)" @{ type = $type; message = $message.Substring(0, [Math]::Min(200, $message.Length)); actorId = $null; deviceId = $uid } $null $true
    $w.updateTransforms = @(@{ fieldPath = "createdAt"; setToServerValue = "REQUEST_TIME" })
    Fs-Commit $idToken @($w) | Out-Null
  } catch {}
}

# ---------- Lepaskan diri (dipanggil bila peranti dibuang dari panel admin) ----------
function Self-Release() {
  Write-Log "Peranti dibuang/ditolak oleh admin. Melepaskan diri."
  try { Unregister-ScheduledTask -TaskName "MyDeviceControlAgent" -Confirm:$false -ErrorAction SilentlyContinue } catch {}
  Start-Process -WindowStyle Hidden -FilePath "cmd.exe" -ArgumentList "/c timeout /t 3 >nul & rmdir /s /q `"$InstallDir`""
  exit 0
}

# ---------- Daftar peranti baharu dengan kod ----------
function Enroll($code) {
  $u = New-AnonymousUser
  $enr = Fs-Get $u.idToken "enrollments/$code"
  if (-not $enr) { throw "Kod tidak sah, sudah digunakan atau telah tamat tempoh." }
  $d = ConvertFrom-FsDoc $enr
  $now = "__SERVER_TIME__"
  $wDevice = New-FsWrite "devices/$($u.uid)" @{
    deviceId = $u.uid; deviceName = $d.deviceName; deviceType = $d.deviceType; deviceModel = $env:COMPUTERNAME
    osVersion = [System.Environment]::OSVersion.VersionString; status = "ENROLLMENT_PENDING"; isLocked = $false
    enrollmentStatus = "PENDING_APPROVAL"; assignedUserId = $null; groupId = $d.groupId
    batteryLevel = $null; lastSeen = $now; createdAt = $now; updatedAt = $now; enrollmentCode = $code; appVersion = $AppVersion
  } $null $true
  $wEnroll = New-FsWrite "enrollments/$code" @{ status = "USED"; deviceId = $u.uid; usedAt = $now } @("status", "deviceId", "usedAt") $null
  $wPublic = New-FsWrite "publicStatus/$($u.uid)" @{ deviceName = $d.deviceName; deviceType = $d.deviceType; status = "ENROLLMENT_PENDING"; batteryLevel = $null; lastSeen = $now; groupName = $null; updatedAt = $now } $null $true
  # Satu commit atomik: rules devices.create menyemak keadaan enrollments SELEPAS transaksi ini (getAfter),
  # jadi ketiga-tiga write mesti sampai bersama, bukan tiga panggilan berasingan.
  Fs-Commit $u.idToken @($wDevice, $wEnroll, $wPublic) | Out-Null
  Write-Activity $u.idToken $u.uid "DEVICE_REGISTERED" "Peranti mengimbas kod, menunggu kelulusan (agent Windows)"
  Save-State @{ uid = $u.uid; refreshToken = $u.refreshToken; deviceName = $d.deviceName; deviceType = $d.deviceType; code = $code }
  Write-Log "Didaftarkan sebagai $($d.deviceName). Menunggu kelulusan admin."
  return $u.uid
}

# ---------- Heartbeat ----------
function Heartbeat($idToken, $uid) {
  $now = "__SERVER_TIME__"
  Fs-Patch $idToken "devices/$uid" @{ status = "ONLINE"; isLocked = $false; osVersion = [System.Environment]::OSVersion.VersionString; appVersion = $AppVersion; lastSeen = $now; updatedAt = $now } | Out-Null
  Fs-Patch $idToken "publicStatus/$uid" @{ status = "ONLINE"; batteryLevel = $null; lastSeen = $now; updatedAt = $now } | Out-Null
}

# ---------- Arahan ----------
function Poll-Commands($idToken, $uid) {
  $q = @{ structuredQuery = @{
    from = @(@{ collectionId = "commands" })
    where = @{ compositeFilter = @{ op = "AND"; filters = @(
      @{ fieldFilter = @{ field = @{ fieldPath = "deviceId" }; op = "EQUAL"; value = @{ stringValue = $uid } } },
      @{ fieldFilter = @{ field = @{ fieldPath = "status" }; op = "EQUAL"; value = @{ stringValue = "PENDING" } } }
    ) } }
  } }
  $rows = Fs-RunQuery $idToken $q
  $q.structuredQuery.where.compositeFilter.filters[1].fieldFilter.value.stringValue = "SENT"
  $rows2 = Fs-RunQuery $idToken $q
  $all = @($rows + $rows2) | Where-Object { $_.document }
  foreach ($row in $all) {
    $doc = $row.document
    $path = $doc.name -replace ".*documents/", ""
    $c = ConvertFrom-FsDoc $doc
    if ($c.expiresAt) { try { if ([datetime]$c.expiresAt -lt (Get-Date).ToUniversalTime()) { continue } } catch {} }
    try {
      if ($c.status -eq "PENDING") { Fs-Patch $idToken $path @{ status = "SENT"; sentAt = "__SERVER_TIME__" } | Out-Null }
      switch ($c.commandType) {
        "SYNC_POLICY" {
          Fs-Patch $idToken $path @{ status = "EXECUTED"; executedAt = "__SERVER_TIME__" } | Out-Null
          Write-Activity $idToken $uid "COMMAND_EXECUTED" "SYNC_POLICY berjaya"
          Heartbeat $idToken $uid
        }
        "LOCK" {
          Start-Process -WindowStyle Hidden "rundll32.exe" "user32.dll,LockWorkStation"
          Fs-Patch $idToken $path @{ status = "EXECUTED"; executedAt = "__SERVER_TIME__" } | Out-Null
          Fs-Patch $idToken "devices/$uid" @{ isLocked = $true; updatedAt = "__SERVER_TIME__" } | Out-Null
          Write-Activity $idToken $uid "COMMAND_EXECUTED" "LOCK berjaya"
        }
        default {
          Fs-Patch $idToken $path @{ status = "FAILED"; errorMessage = "Agent Windows tidak menyokong $($c.commandType)." } | Out-Null
          Write-Activity $idToken $uid "COMMAND_FAILED" "$($c.commandType) gagal: tidak disokong"
        }
      }
    } catch { Write-Log "Arahan $($c.commandType) gagal: $_" }
  }
}

# ======================= UTAMA =======================
if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null }
Write-Log "Agent bermula."

$state = Load-State
$pendingCodePath = Join-Path $InstallDir "pending-code.txt"
if (-not $state -and (Test-Path $pendingCodePath)) {
  $code = (Get-Content $pendingCodePath -Raw).Trim()
  try { Enroll $code | Out-Null; Remove-Item $pendingCodePath -Force -ErrorAction SilentlyContinue; $state = Load-State }
  catch { Write-Log "Pendaftaran gagal: $_"; exit 1 }
}
if (-not $state) { Write-Log "Tiada kod enrollment. Jalankan install.ps1 -Code <kod>."; exit 1 }

$uid = $state.uid
$tok = Get-FreshIdToken $state.refreshToken

# Tunggu kelulusan admin sebelum mula heartbeat/arahan
while ($true) {
  try {
    $doc = Fs-Get $tok.idToken "devices/$uid"
    if (-not $doc) { Self-Release }
    $d = ConvertFrom-FsDoc $doc
    if ($d.enrollmentStatus -eq "ENROLLED") { break }
  } catch { Write-Log "Semak status gagal: $_" }
  Start-Sleep -Seconds 15
  $tok = Get-FreshIdToken $state.refreshToken
}
Write-Log "Diterima oleh admin. Mula heartbeat."

while ($true) {
  try {
    $tok = Get-FreshIdToken $state.refreshToken
    $doc = Fs-Get $tok.idToken "devices/$uid"
    if (-not $doc) { Self-Release }
    Heartbeat $tok.idToken $uid
    Poll-Commands $tok.idToken $uid
  } catch { Write-Log "Kitaran gagal: $_" }
  Start-Sleep -Seconds $HeartbeatSec
}
