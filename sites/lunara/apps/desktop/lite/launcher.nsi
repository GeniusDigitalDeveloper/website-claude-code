; "LUNARA MUSIC.exe" — opens LUNARA MUSIC in its own app window (no browser bars) using the
; Microsoft Edge WebView engine that ships with Windows 10/11 (Chrome as fallback).
; It always loads the live app, so every update reaches the user instantly. Nothing to update.
Unicode true
Name "LUNARA MUSIC"
OutFile "../dist/LUNARA MUSIC.exe"
Icon "../build/icon.ico"
SilentInstall silent
RequestExecutionLevel user
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "LUNARA MUSIC"
VIAddVersionKey "FileDescription" "LUNARA MUSIC"
VIAddVersionKey "CompanyName" "LUNARA MUSIC"
VIAddVersionKey "FileVersion" "1.0.0"
VIAddVersionKey "LegalCopyright" "LUNARA MUSIC"

!define URL "https://lunara-music.web.app/"
!define APPKEY "Software\Microsoft\Windows\CurrentVersion\App Paths"

Section
  StrCpy $1 "$LOCALAPPDATA\LUNARA MUSIC\AppData"
  ReadRegStr $2 HKLM "${APPKEY}\msedge.exe" ""
  StrCmp $2 "" 0 run
  ReadRegStr $2 HKCU "${APPKEY}\msedge.exe" ""
  StrCmp $2 "" 0 run
  StrCpy $2 "$PROGRAMFILES32\Microsoft\Edge\Application\msedge.exe"
  IfFileExists $2 run
  StrCpy $2 "$PROGRAMFILES64\Microsoft\Edge\Application\msedge.exe"
  IfFileExists $2 run
  ReadRegStr $2 HKLM "${APPKEY}\chrome.exe" ""
  StrCmp $2 "" 0 run
  ReadRegStr $2 HKCU "${APPKEY}\chrome.exe" ""
  StrCmp $2 "" 0 run
  ExecShell "open" "${URL}"
  Goto done
  run:
  Exec '"$2" --app="${URL}" --user-data-dir="$1" --no-first-run --no-default-browser-check --autoplay-policy=no-user-gesture-required --window-size=1360,860'
  done:
SectionEnd
