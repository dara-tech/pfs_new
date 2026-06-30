#!/bin/bash

# APK Installation Script
# This script will wait for a device to connect and then install the APK

APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

echo "Waiting for Android device to connect..."
echo "Please connect your device via USB and enable USB debugging."

# Wait for device to connect
while true; do
    DEVICE=$(adb devices | grep -w "device" | head -1)
    if [ ! -z "$DEVICE" ]; then
        echo ""
        echo "✓ Device detected: $DEVICE"
        echo "Installing APK..."
        adb install -r "$APK_PATH"
        if [ $? -eq 0 ]; then
            echo ""
            echo "✓ APK installed successfully!"
            echo "The app should now be available on your device."
            break
        else
            echo "✗ Installation failed. Please check the error above."
            break
        fi
    else
        echo -n "."
        sleep 2
    fi
done
