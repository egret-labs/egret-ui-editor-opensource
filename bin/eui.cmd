@echo off
setlocal
set EUI_FROM_SHELL=1
set ELECTRON_RUN_AS_NODE=1
"%~dp0..\..\..\Egret UI Editor.exe" "%~dp0..\out\cli.js" %*
endlocal