; LUNARA MUSIC Setup — one click, per-user (no admin), desktop + Start Menu shortcuts, starts the app.
Unicode true
!define APP "LUNARA MUSIC"
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\LunaraMusic"
Name "${APP}"
OutFile "../dist/LUNARA-MUSIC-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\${APP}"
RequestExecutionLevel user
SetCompressor /SOLID lzma
Icon "../build/icon.ico"
UninstallIcon "../build/icon.ico"
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
  SetOutPath "$INSTDIR"
  File "../dist/LUNARA MUSIC.exe"
  File "../build/icon.ico"
  CreateShortCut "$DESKTOP\${APP}.lnk" "$INSTDIR\${APP}.exe" "" "$INSTDIR\icon.ico" 0
  CreateDirectory "$SMPROGRAMS\${APP}"
  CreateShortCut "$SMPROGRAMS\${APP}\${APP}.lnk" "$INSTDIR\${APP}.exe" "" "$INSTDIR\icon.ico" 0
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayName" "${APP}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "${UNINST_KEY}" "Publisher" "${APP}"
  WriteRegStr HKCU "${UNINST_KEY}" "DisplayVersion" "1.0.0"
  WriteRegStr HKCU "${UNINST_KEY}" "UninstallString" '"$INSTDIR\Uninstall.exe"'
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoModify" 1
  WriteRegDWORD HKCU "${UNINST_KEY}" "NoRepair" 1
SectionEnd

Function .onInstSuccess
  Exec '"$INSTDIR\${APP}.exe"'
FunctionEnd

Section "Uninstall"
  Delete "$DESKTOP\${APP}.lnk"
  RMDir /r "$SMPROGRAMS\${APP}"
  RMDir /r "$INSTDIR"
  RMDir /r "$LOCALAPPDATA\${APP}"
  DeleteRegKey HKCU "${UNINST_KEY}"
SectionEnd
