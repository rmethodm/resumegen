# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Local iOS builds (no EAS Build fee)

`npm run build:ios:local` runs `expo prebuild --platform ios` and opens `ios/mobile.xcworkspace` in Xcode. From there: select "Any iOS Device", **Product → Archive**, then use the Organizer window to distribute to TestFlight/App Store — this final step is a manual Xcode GUI action, not scriptable without adding fastlane.

`eas submit` still works against a locally-built `.ipa` and remains free regardless of build method.

**OneDrive codesign gotcha:** local iOS builds fail with `Command CodeSign failed with a nonzero exit code` — `resource fork, Finder information, or similar detritus not allowed` — on `ExpoModulesJSI.framework`, built via SPM into `node_modules/expo-modules-jsi/apple/.DerivedData`. Root cause: this repo lives inside an OneDrive-synced folder, which tags newly-written files with extended attributes that `codesign` rejects — and since that `.DerivedData` folder is generated fresh mid-build, OneDrive re-taints it before codesign runs, so no pre-build `xattr -cr` strip can catch it in time. Fix is to move the project (or at least `node_modules`) outside the OneDrive-synced tree — see CONTEXT.md for status.
