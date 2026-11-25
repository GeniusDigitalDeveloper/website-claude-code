; LUNARA MUSIC — Windows installer (built natively on Linux with makensis, no Wine).
; One-click: no questions, installs per-user (no admin prompt), creates shortcuts and starts the app.
; The app loads the live site, so it is always up to date without re-installing.
Unicode true
!define APP "LUNARA MUSIC"
!define EXE "LUNARA MUSIC.exe"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\LunaraMusic"
Name "${APP}"
OutFile "dist/LUNARA-MUSIC-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\${APP}"
RequestExecutionLevel user
SetCompressor /SOLID lzma
Icon "build/icon.ico"
UninstallIcon "build/icon.ico"
BrandingText "LUNARA MUSIC · Your Music. Your Universe."
ShowInstDetails nevershow
AutoCloseWindow true
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "${APP}"
VIAddVersionKey "FileDescription" "${APP} Setup"
VIAddVersionKey "CompanyName" "${APP}"
VIAddVersionKey "FileVersion" "1.0.0"
VIAddVersionKey "LegalCopyright" "LUNARA MUSIC"

Page instfiles
UninstPage uninstConfirm
UninstPage instfiles

Section "Install"
  ; close a running copy so files can be replaced
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  SetOutPath "$INSTDIR"
  File /r "dist/win-unpacked\*.*"
  CreateShortCut "$DESKTOP\${APP}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0
  CreateDirectory "$SMPROGRAMS\${APP}"
  CreateShortCut "$SMPROGRAMS\${APP}\${APP}.lnk" "$INSTDIR\${EXE}" "" "$INSTDIR\${EXE}" 0
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${APP}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\${EXE}"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "${APP}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "1.0.0"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
SectionEnd

Function .onInstSuccess
  Exec '"$INSTDIR\${EXE}"'
FunctionEnd

Section "Uninstall"
  nsExec::Exec 'taskkill /F /IM "${EXE}"'
  Delete "$DESKTOP\${APP}.lnk"
  RMDir /r "$SMPROGRAMS\${APP}"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${UNINST_KEY}"
SectionEnd
