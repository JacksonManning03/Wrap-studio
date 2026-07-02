@echo off
setlocal
cd /d "%~dp0"
where git >nul 2>nul
if errorlevel 1 set "PATH=%PATH%;C:\Program Files\Git\cmd"
echo ==================================================
echo   Wrap Studio  -  pushing to GitHub
echo ==================================================
echo.
git init
git add -A
git -c user.name="Jackson Manning" -c user.email="Jackson@truedetailaz.com" commit -m "Initial commit: Wrap Studio"
git branch -M main
git remote remove origin 1>nul 2>nul
git remote add origin https://github.com/JacksonManning03/Wrap-studio.git
echo.
echo Pushing... if a GitHub sign-in window pops up, approve it.
git push -u origin main
set PUSH_ERR=%errorlevel%
echo.
echo ===== RESULT CODE: %PUSH_ERR% =====
echo (0 = success. Leave this window open for Claude.)
pause
