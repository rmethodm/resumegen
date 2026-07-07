# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Local iOS builds (no EAS Build fee)

`npm run build:ios:local` runs `expo prebuild --platform ios` and opens `ios/mobile.xcworkspace` in Xcode. From there: select "Any iOS Device", **Product → Archive**, then use the Organizer window to distribute to TestFlight/App Store — this final step is a manual Xcode GUI action, not scriptable without adding fastlane.

`eas submit` still works against a locally-built `.ipa` and remains free regardless of build method.
