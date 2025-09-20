# Mobile App Testing Guide

## Prerequisites for Testing on Device

To install and test the mobile app on your phone, you'll need to install the following:

### For Android Testing:
1. **Android Studio** - Download from https://developer.android.com/studio
2. **Java Development Kit (JDK)** - Version 8 or higher
3. **Android SDK** - Installed automatically with Android Studio

### For iOS Testing (macOS only):
1. **Xcode** - Download from Mac App Store
2. **iOS Developer Account** - For deploying to real devices

## Installation Steps

### Android Testing:

1. Install Android Studio:
   - Download Android Studio from https://developer.android.com/studio
   - Run the installer and follow the setup wizard
   - During installation, make sure to install the Android SDK, Android SDK Platform-Tools, and Android SDK Build-Tools

2. Set up environment variables:
   - Add ANDROID_HOME environment variable pointing to your Android SDK location
   - Add ANDROID_HOME\platform-tools to your PATH

3. Connect your Android device:
   - Enable Developer Options on your phone (Settings > About Phone > Tap Build Number 7 times)
   - Enable USB Debugging (Settings > Developer Options > USB Debugging)
   - Connect your phone to your computer via USB

4. Build and install the app:
   - Navigate to the mobile-app directory
   - Run `npm install` to install dependencies
   - Run `npx react-native run-android` to build and install the app on your connected device

### iOS Testing (macOS only):

1. Install Xcode from the Mac App Store
2. Connect your iOS device to your Mac
3. Navigate to the mobile-app directory
4. Run `npm install` to install dependencies
5. Run `npx react-native run-ios --device` to build and install the app on your connected device

## Alternative Testing Methods

If you don't want to install the full development environment, you can use Expo for easier testing:

1. Install the Expo Go app on your phone from the App Store or Google Play Store
2. In the mobile-app directory, run `npm install` to install dependencies
3. Run `npm run web` to start the Expo development server
4. Scan the QR code shown in the terminal with the Expo Go app

## Troubleshooting

### Common Issues:

1. **Build fails with missing SDK error**:
   - Make sure Android Studio is installed correctly
   - Verify ANDROID_HOME environment variable is set

2. **Device not recognized**:
   - Check USB cable connection
   - Make sure USB Debugging is enabled
   - Try different USB ports

3. **App crashes on startup**:
   - Check that all environment variables are set correctly
   - Verify the backend server is running
   - Check the Metro bundler is running

## Testing Checklist

Before considering the app fully tested, verify these features work:

- [ ] QR code scanning
- [ ] NFC tag reading (if supported by device)
- [ ] GPS location capture
- [ ] Digital signature creation
- [ ] Communication with backend API
- [ ] Patient feedback submission
- [ ] Blockchain transaction submission

## Support

If you encounter any issues during installation or testing, please refer to the React Native documentation at https://reactnative.dev/docs/environment-setup or contact the development team.
