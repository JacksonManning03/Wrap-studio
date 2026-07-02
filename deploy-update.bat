@echo off
setlocal
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 set "PATH=%PATH%;C:\Program Files\Git\cmd"
echo ==================================================
echo   Wrap Studio  -  push latest changes live
echo ==================================================
echo.
git add -A
git -c user.name="Jackson Manning" -c user.email="Jackson@truedetailaz.com" commit -m "Update %date% %time%"
git push
set PUSH_ERR=%errorlevel%
echo.
echo ===== RESULT CODE: %PUSH_ERR% =====
echo Vercel auto-builds the new version in ~1-2 min (same URL).
echo Leave this window open for Claude.
pause
