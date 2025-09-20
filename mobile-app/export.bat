@echo off

echo Exporting Mobile App for Deployment...

REM Create build directory if it doesn't exist
if not exist "build" mkdir build

REM Copy source files
xcopy /E /I /H /Y /EXCLUDE:exclude.txt . build\

REM Create deployment instructions
echo # Mobile App Deployment Instructions > build\DEPLOYMENT.md
echo. >> build\DEPLOYMENT.md
echo ## Prerequisites >> build\DEPLOYMENT.md
echo 1. Node.js (v16 or higher) >> build\DEPLOYMENT.md
echo 2. npm (v6 or higher) >> build\DEPLOYMENT.md
echo 3. React Native CLI >> build\DEPLOYMENT.md
echo 4. Android Studio (for Android deployment) >> build\DEPLOYMENT.md
echo 5. Xcode (for iOS deployment - macOS only) >> build\DEPLOYMENT.md
echo. >> build\DEPLOYMENT.md
echo ## Installation >> build\DEPLOYMENT.md
echo 1. Navigate to the project directory >> build\DEPLOYMENT.md
echo 2. Run `npm install` to install dependencies >> build\DEPLOYMENT.md
echo. >> build\DEPLOYMENT.md
echo ## Running the App >> build\DEPLOYMENT.md
echo. >> build\DEPLOYMENT.md
echo ### Development Mode >> build\DEPLOYMENT.md
echo - Run `npm start` to start the Metro bundler >> build\DEPLOYMENT.md
echo - For Android: Run `npm run android` >> build\DEPLOYMENT.md
echo - For iOS: Run `npm run ios` >> build\DEPLOYMENT.md
echo. >> build\DEPLOYMENT.md
echo ### Building for Production >> build\DEPLOYMENT.md
echo. >> build\DEPLOYMENT.md
echo #### Android >> build\DEPLOYMENT.md
echo 1. Ensure you have Android Studio installed >> build\DEPLOYMENT.md
echo 2. Set up environment variables for Android SDK >> build\DEPLOYMENT.md
echo 3. Run `npm run build:android` >> build\DEPLOYMENT.md
echo 4. The APK will be generated in `android/app/build/outputs/apk/release/` >> build\DEPLOYMENT.md
echo. >> build\DEPLOYMENT.md
echo #### iOS (macOS only) >> build\DEPLOYMENT.md
echo 1. Ensure you have Xcode installed >> build\DEPLOYMENT.md
echo 2. Run `npm run build:ios` >> build\DEPLOYMENT.md
echo 3. The IPA will be generated in `ios/build/` >> build\DEPLOYMENT.md
echo. >> build\DEPLOYMENT.md
echo ## Environment Variables >> build\DEPLOYMENT.md
echo Make sure to set the following environment variables: >> build\DEPLOYMENT.md
echo - API_URL: URL of the backend API >> build\DEPLOYMENT.md
echo - CONTRACT_ADDRESS: Address of the deployed smart contract >> build\DEPLOYMENT.md
echo - RPC_URL: URL of the Polygon RPC endpoint >> build\DEPLOYMENT.md
echo. >> build\DEPLOYMENT.md
echo ## Additional Notes >> build\DEPLOYMENT.md
echo - The app uses QR code scanning, NFC, and GPS features >> build\DEPLOYMENT.md
echo - Make sure to request necessary permissions in the app stores >> build\DEPLOYMENT.md
echo - The app requires internet connectivity for blockchain interactions >> build\DEPLOYMENT.md
echo. >> build\DEPLOYMENT.md
echo Export complete! Files are in the build/ directory.
echo See build/DEPLOYMENT.md for deployment instructions.
