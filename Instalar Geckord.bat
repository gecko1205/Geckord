@echo off
title Instalador Oficial do Geckord
echo ===================================================
echo             INSTALANDO O GECKORD CLIENT
echo ===================================================
echo.

:: Define a pasta discreta do AppData para salvar os arquivos persistentes
set "TARGET_DIR=%localappdata%\Geckord"

echo Criando diretorios de forma discreta...
if not exist "%TARGET_DIR%\dist" mkdir "%TARGET_DIR%\dist"
if not exist "%TARGET_DIR%\Installer" mkdir "%TARGET_DIR%\Installer"

echo.
echo Baixando os arquivos do Geckord...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/gecko1205/Geckord/releases/download/devbuild/renderer.js' -OutFile '%TARGET_DIR%\dist\renderer.js'"
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/gecko1205/Geckord/releases/download/devbuild/patcher.js' -OutFile '%TARGET_DIR%\dist\patcher.js'"
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/gecko1205/Geckord/releases/download/devbuild/preload.js' -OutFile '%TARGET_DIR%\dist\preload.js'"
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/gecko1205/Geckord/releases/download/devbuild/vencordDesktopRenderer.js' -OutFile '%TARGET_DIR%\dist\vencordDesktopRenderer.js'"
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/gecko1205/Geckord/releases/download/devbuild/vencordDesktopMain.js' -OutFile '%TARGET_DIR%\dist\vencordDesktopMain.js'"
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/gecko1205/Geckord/releases/download/devbuild/vencordDesktopPreload.js' -OutFile '%TARGET_DIR%\dist\vencordDesktopPreload.js'"

echo.
echo Baixando os arquivos do instalador...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/Vendicated/VencordInstaller/releases/latest/download/VencordInstallerCli.exe' -OutFile '%TARGET_DIR%\Installer\VencordInstallerCli.exe'"

echo.
echo Injetando o Geckord no Discord...
set "VENCORD_USER_DATA_DIR=%TARGET_DIR%"
set VENCORD_DEV_INSTALL=1
"%TARGET_DIR%\Installer\VencordInstallerCli.exe" -install

echo.
echo Limpando arquivos temporarios...
:: Remove a pasta do instalador CLI ja que a injecao foi concluida
rd /s /q "%TARGET_DIR%\Installer"

echo ===================================================
echo       GECKORD INSTALADO COM SUCESSO!
echo       Abra ou Reinicie o seu Discord.
echo ===================================================
echo.
pause
