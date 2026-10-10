@echo off
setlocal
title Installation Para Beauregard
set "DEST=%LOCALAPPDATA%\ParaBeauregard"
if not exist "%DEST%" mkdir "%DEST%"
copy /Y "%~dp0ParaBeauregard.GestionVentes.Win7.exe" "%DEST%\ParaBeauregard.GestionVentes.exe" >nul
if errorlevel 1 (
  echo Impossible de copier l'application.
  pause
  exit /b 1
)
set "LINK=%USERPROFILE%\Desktop\Para Beauregard - Gestion des ventes.lnk"
set "VBS=%TEMP%\pb_create_shortcut.vbs"
>"%VBS%" echo Set shell = CreateObject("WScript.Shell")
>>"%VBS%" echo Set link = shell.CreateShortcut("%LINK%")
>>"%VBS%" echo link.TargetPath = "%DEST%\ParaBeauregard.GestionVentes.exe"
>>"%VBS%" echo link.WorkingDirectory = "%DEST%"
>>"%VBS%" echo link.Description = "Para Beauregard - Gestion des ventes"
>>"%VBS%" echo link.Save
cscript //nologo "%VBS%" >nul
del "%VBS%" >nul 2>&1
echo.
echo Installation terminee.
echo Un raccourci a ete cree sur le Bureau.
choice /C ON /N /M "Ouvrir l'application maintenant ? [O/N] "
if errorlevel 2 goto :eof
start "" "%DEST%\ParaBeauregard.GestionVentes.exe"
:eof
endlocal
