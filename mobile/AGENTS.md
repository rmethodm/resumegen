# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Local iOS builds (no EAS Build fee)

`npm run build:ios:local` runs `expo prebuild --platform ios` and opens `ios/mobile.xcworkspace` in Xcode. From there: select "Any iOS Device", **Product → Archive**, then use the Organizer window to distribute to TestFlight/App Store — this final step is a manual Xcode GUI action, not scriptable without adding fastlane.

`eas submit` still works against a locally-built `.ipa` and remains free regardless of build method.

**OneDrive codesign gotcha:** this repo lives inside an OneDrive-synced folder, which tags files with extended attributes ("resource fork, Finder information, or similar detritus") that break `codesign` — build fails with `Command CodeSign failed with a nonzero exit code`, seen on `ExpoModulesJSI.framework` (built via SPM into `node_modules/expo-modules-jsi/apple/.DerivedData`). `build:ios:local` runs `xattr -cr` on `ios/` and `node_modules/expo-modules-jsi` right before opening Xcode to work around it. If a build still fails on CodeSign (OneDrive can re-taint files mid-sync), quit Xcode, rerun `xattr -cr ios node_modules/expo-modules-jsi`, and reopen.
