Below is a practical **EAS command reference** for your Expo/React Native Qaliye project. Run these commands from the project directory containing `package.json`.

EAS CLI currently supports building, submitting, updating, deploying, credential management, and project management. ([Expo Documentation][1])

# 1. Install and update EAS CLI

## Install globally

```bash
npm install --global eas-cli
```

Works on:

```text
Android and iOS
```

This installs the `eas` command globally.

## Run the latest version without global installation

```bash
npx eas-cli@latest --version
```

You can replace `eas` with `npx eas-cli@latest` in any command:

```bash
npx eas-cli@latest build --platform android
```

## Check the installed version

```bash
eas --version
```

## Update EAS CLI

```bash
npm install --global eas-cli@latest
```

Expo recommends keeping EAS CLI current. ([Expo Documentation][1])

---

# 2. Expo account commands

## Log in

```bash
eas login
```

Works on:

```text
Android and iOS
```

Connects your terminal to your Expo account.

## Check the current account

```bash
eas whoami
```

Shows which Expo account is currently logged in.

## Log out

```bash
eas logout
```

Disconnects the current Expo account.

## Log in using a different account

```bash
eas logout
eas login
```

---

# 3. Create or link the EAS project

## Initialise EAS

```bash
eas init
```

Works on:

```text
Android and iOS
```

This creates a new EAS project or links your local Expo app to an existing EAS project. It normally adds:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "YOUR-EAS-PROJECT-ID"
      }
    }
  }
}
```

The project ID links the local application to the project on Expo’s servers. ([Expo Documentation][1])

## Create under a particular Expo account

```bash
eas init --account YOUR_EXPO_USERNAME
```

Example:

```bash
eas init --account zekarias
```

## Link to an existing EAS project

```bash
eas init --id YOUR_EAS_PROJECT_ID
```

Example:

```bash
eas init --id 12345678-abcd-1234-abcd-123456789abc
```

Do this only when the EAS project already exists.

## Force replacement of an existing project link

```bash
eas init --id YOUR_EAS_PROJECT_ID --force
```

Be careful: this can replace the existing `extra.eas.projectId`.

## Show linked project information

```bash
eas project:info
```

This displays information about the EAS project connected to your local project. ([Expo Documentation][1])

---

# 4. Check your Expo configuration

## Display the resolved Expo configuration

```bash
npx expo config
```

## Display it as JSON

```bash
npx expo config --json
```

## Check project compatibility and dependencies

```bash
npx expo-doctor
```

Run this before important builds:

```bash
npx expo-doctor
```

It can identify incompatible packages, configuration problems, and dependency issues.

## Install packages using Expo-compatible versions

```bash
npx expo install PACKAGE_NAME
```

Example:

```bash
npx expo install expo-dev-client
```

Prefer `npx expo install` for Expo packages because it selects a version compatible with your Expo SDK.

---

# 5. Configure EAS Build

## Configure both Android and iOS

```bash
eas build:configure --platform all
```

Short form:

```bash
eas build:configure -p all
```

This normally creates `eas.json` beside `package.json`. ([Expo Documentation][2])

## Configure Android only

```bash
eas build:configure --platform android
```

## Configure iOS only

```bash
eas build:configure --platform ios
```

---

# 6. Recommended `eas.json`

For your Qaliye project, a useful starting configuration is:

```json
{
  "cli": {
    "version": ">= 21.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "channel": "development"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "autoIncrement": true,
      "channel": "production"
    }
  },
  "submit": {
    "production": {
      "android": {
        "track": "internal",
        "releaseStatus": "completed"
      },
      "ios": {}
    }
  }
}
```

The profiles mean:

| Profile       | Purpose                                     |
| ------------- | ------------------------------------------- |
| `development` | Development client for coding and debugging |
| `preview`     | Installable tester build                    |
| `production`  | App Store or Google Play build              |

---

# 7. Development client setup

## Install Expo Development Client

```bash
npx expo install expo-dev-client
```

This lets you run native libraries that Expo Go may not support, such as:

* RevenueCat
* Native Google Sign-In
* Apple Authentication
* Firebase native modules
* Native notification configuration

## Start Metro for a development build

```bash
npx expo start --dev-client
```

## Clear Metro cache

```bash
npx expo start --dev-client --clear
```

Short form:

```bash
npx expo start --dev-client -c
```

---

# 8. EAS development builds

## Android development build

```bash
eas build --profile development --platform android
```

Short form:

```bash
eas build -e development -p android
```

Produces an installable Android development app, normally an APK when internal distribution is configured.

## iOS development build for a physical device

```bash
eas build --profile development --platform ios
```

For physical-device internal distribution, the device normally needs to be registered with Apple.

## Build development apps for both

```bash
eas build --profile development --platform all
```

## Start the development server after installation

```bash
npx expo start --dev-client
```

---

# 9. iOS Simulator development build

An iOS simulator build needs a dedicated profile.

Add this to `eas.json`:

```json
{
  "build": {
    "development-simulator": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    }
  }
}
```

Then build:

```bash
eas build --profile development-simulator --platform ios
```

This is for:

```text
iOS Simulator only
```

It cannot be installed on a physical iPhone or submitted to the App Store.

## Install and run the latest simulator build

```bash
eas build:run --platform ios --latest
```

Or select a build interactively:

```bash
eas build:run --platform ios
```

`eas build:run` installs and launches compatible simulator or emulator builds. ([Expo Documentation][1])

---

# 10. Android emulator development build

Add an Android emulator profile:

```json
{
  "build": {
    "development-emulator": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

Build it:

```bash
eas build --profile development-emulator --platform android
```

Install and run the latest build:

```bash
eas build:run --platform android --latest
```

---

# 11. Preview builds for testers

## Android preview build

```bash
eas build --profile preview --platform android
```

With `"distribution": "internal"`, this normally produces an APK that testers can install directly.

## iOS preview build

```bash
eas build --profile preview --platform ios
```

For direct installation on registered iPhones, the devices must be included in the provisioning profile.

## Both platforms

```bash
eas build --profile preview --platform all
```

---

# 12. Production builds

## Android production build

```bash
eas build --profile production --platform android
```

Produces:

```text
.aab
```

The Android App Bundle is intended for Google Play.

## iOS production build

```bash
eas build --profile production --platform ios
```

Produces:

```text
.ipa
```

The IPA is intended for App Store Connect and TestFlight.

## Both production builds

```bash
eas build --profile production --platform all
```

EAS Build creates signed application binaries for Expo and React Native projects. ([Expo Documentation][3])

---

# 13. Build without using cached dependencies

Use this when a build appears to be using stale native files or dependencies:

## Android

```bash
eas build --profile development --platform android --clear-cache
```

## iOS

```bash
eas build --profile development --platform ios --clear-cache
```

## Production Android

```bash
eas build --profile production --platform android --clear-cache
```

## Production iOS

```bash
eas build --profile production --platform ios --clear-cache
```

Do not use `--clear-cache` on every build. It makes builds slower.

---

# 14. Build using the current uncommitted code

EAS normally uploads the current project state. To prevent Git-related prompts in some workflows:

```bash
EAS_NO_VCS=1 eas build --profile development --platform android
```

On Windows PowerShell:

```powershell
$env:EAS_NO_VCS="1"
eas build --profile development --platform android
```

Usually, keeping the project in Git is preferable.

---

# 15. Build locally

## Android local build

```bash
eas build --profile production --platform android --local
```

## iOS local build

```bash
eas build --profile production --platform ios --local
```

Local iOS builds require macOS and Apple build tools.

Local Android builds require Android build dependencies.

Expo documents `--local` mainly as a way to reproduce and debug cloud-build problems locally. ([Expo Documentation][4])

---

# 16. Build and submit automatically

## Android production build and automatic submission

```bash
eas build --profile production --platform android --auto-submit
```

## iOS production build and automatic submission

```bash
eas build --profile production --platform ios --auto-submit
```

## Build and submit both

```bash
eas build --profile production --platform all --auto-submit
```

Specify a submission profile:

```bash
eas build \
  --profile production \
  --platform android \
  --auto-submit-with-profile production
```

Automatic submission sends the completed build to EAS Submit. ([Expo Documentation][5])

---

# 17. View and manage builds

## List recent builds

```bash
eas build:list
```

## Android builds only

```bash
eas build:list --platform android
```

## iOS builds only

```bash
eas build:list --platform ios
```

## Production builds only

```bash
eas build:list --profile production
```

## View one build

```bash
eas build:view BUILD_ID
```

Example:

```bash
eas build:view 12345678-abcd-1234-abcd-123456789abc
```

## View the latest Android build interactively

```bash
eas build:view --platform android
```

## Cancel a build

```bash
eas build:cancel BUILD_ID
```

## Select an Android build to cancel

```bash
eas build:cancel --platform android
```

## Delete a build record

```bash
eas build:delete BUILD_ID
```

Deleting a build record does not remove an app already uploaded to a store.

Expo recommends `eas build:list` for finding builds and opening build logs. ([Expo Documentation][2])

---

# 18. Download builds

## Select and download a build

```bash
eas build:download --platform android
```

## Download an iOS build

```bash
eas build:download --platform ios
```

## Download by build ID

```bash
eas build:download --build-id BUILD_ID
```

`eas build:download` is mainly designed for simulator/emulator build artifacts. ([Expo Documentation][1])

For a normal production build, you can also open the build URL from:

```bash
eas build:list
```

and download the artifact from the EAS dashboard.

---

# 19. Android credentials

Android uses a **keystore** to sign the app.

## Open Android credential management

```bash
eas credentials --platform android
```

Short form:

```bash
eas credentials -p android
```

From the interactive menu, you can:

* Create a new Android keystore
* View the configured keystore
* Download credentials
* Upload existing credentials
* Remove credentials
* Manage Google Play service-account credentials

## Configure credentials for a production Android build

```bash
eas credentials:configure-build \
  --platform android \
  --profile production
```

## Configure development Android credentials

```bash
eas credentials:configure-build \
  --platform android \
  --profile development
```

## Download the Android keystore

Run:

```bash
eas credentials --platform android
```

Then select:

```text
production
→ credentials.json
→ Download credentials from EAS
```

Keep the downloaded keystore secure. Losing the upload keystore can make future Google Play releases more difficult.

---

# 20. iOS credentials

iOS typically uses:

* Distribution certificate
* Provisioning profile
* App Store Connect API key
* Push notification key
* Apple Developer authentication

## Open iOS credential management

```bash
eas credentials --platform ios
```

Short form:

```bash
eas credentials -p ios
```

## Configure production iOS credentials

```bash
eas credentials:configure-build \
  --platform ios \
  --profile production
```

## Configure development iOS credentials

```bash
eas credentials:configure-build \
  --platform ios \
  --profile development
```

EAS can generate and manage Android and iOS signing credentials for you. `eas credentials` also lets you inspect, replace, download, or remove them. ([Expo Documentation][6])

---

# 21. Register an iPhone for internal builds

This is required for an iOS internal-distribution build installed directly on a physical device.

## Register an Apple device

```bash
eas device:create
```

It will provide a registration flow or URL.

## List registered Apple devices

```bash
eas device:list
```

## View a registered device

```bash
eas device:view DEVICE_UDID
```

## Rename a device

```bash
eas device:rename
```

## Remove a device

```bash
eas device:delete
```

After adding a new device, rebuild the iOS internal build so the provisioning profile includes it:

```bash
eas build --profile development --platform ios
```

Device registration applies to **iOS physical devices**, not Android devices. ([Expo Documentation][1])

---

# 22. Submit Android to Google Play

## Submit interactively

```bash
eas submit --platform android
```

You will be asked which build to submit.

## Submit the latest Android build

```bash
eas submit --platform android --latest
```

## Submit using the production submission profile

```bash
eas submit \
  --platform android \
  --profile production \
  --latest
```

## Submit a local `.aab`

```bash
eas submit \
  --platform android \
  --path ./app-release.aab
```

## Submit a specific EAS build

```bash
eas submit \
  --platform android \
  --id BUILD_ID
```

## Submit without interactive questions

```bash
eas submit \
  --platform android \
  --latest \
  --non-interactive
```

EAS Submit uploads the Android `.aab` to the Google Play track configured in `eas.json`, such as internal, alpha, beta, or production. ([Expo Documentation][7])

---

# 23. Submit iOS to App Store Connect

## Submit interactively

```bash
eas submit --platform ios
```

## Submit the latest iOS build

```bash
eas submit --platform ios --latest
```

## Submit using the production profile

```bash
eas submit \
  --platform ios \
  --profile production \
  --latest
```

## Submit a local `.ipa`

```bash
eas submit \
  --platform ios \
  --path ./Qaliye.ipa
```

## Submit a specific build

```bash
eas submit \
  --platform ios \
  --id BUILD_ID
```

## Add TestFlight testing instructions

```bash
eas submit \
  --platform ios \
  --latest \
  --what-to-test "Test account creation, discovery, likes and messaging."
```

Submitting iOS uploads the IPA to App Store Connect. After Apple processes it, it becomes available in TestFlight; it is not automatically submitted for public App Store review. ([Expo Documentation][7])

---

# 24. Submit both platforms

## Interactive submission

```bash
eas submit --platform all
```

## Submit latest Android and iOS builds

```bash
eas submit \
  --platform all \
  --latest
```

## Non-interactive submission

```bash
eas submit \
  --platform all \
  --latest \
  --non-interactive
```

You need valid Google Play and App Store Connect credentials configured.

---

# 25. Typical Android submission configuration

Example `eas.json`:

```json
{
  "submit": {
    "production": {
      "android": {
        "track": "internal",
        "releaseStatus": "completed"
      }
    }
  }
}
```

Possible tracks include:

```text
internal
alpha
beta
production
```

For first testing release:

```json
{
  "submit": {
    "production": {
      "android": {
        "track": "internal"
      }
    }
  }
}
```

Then run:

```bash
eas submit \
  --platform android \
  --profile production \
  --latest
```

---

# 26. Google Play service-account key

For non-interactive Android submissions, you normally configure a Google Play service-account JSON key.

A common `eas.json` configuration is:

```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-play-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

Then:

```bash
eas submit \
  --platform android \
  --profile production \
  --latest
```

Add this file to `.gitignore`:

```gitignore
google-play-service-account.json
```

Do not commit private service-account keys to Git.

---

# 27. App Store Connect API key configuration

A typical iOS submission configuration is:

```json
{
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "YOUR_QALIYE_APP_STORE_ID",
        "appleTeamId": "YOUR_APPLE_TEAM_ID"
      }
    }
  }
}
```

Then submit:

```bash
eas submit \
  --platform ios \
  --profile production \
  --latest
```

`ascAppId` is the numeric App Store Connect app ID—not your bundle identifier.

For example:

```text
Bundle ID: com.qaliye.app
App Store Connect ID: a numeric value assigned to Qaliye
```

Do not use Habesha Theory Test’s App Store ID for Qaliye.

---

# 28. EAS Update setup

EAS Update sends JavaScript, styling, and asset updates without producing a new store binary.

## Configure EAS Update

```bash
eas update:configure
```

This adds configuration such as:

```json
{
  "expo": {
    "runtimeVersion": {
      "policy": "appVersion"
    },
    "updates": {
      "url": "https://u.expo.dev/YOUR-PROJECT-ID"
    }
  }
}
```

It can also add channels to `eas.json`. ([Expo Documentation][8])

After configuration, create new builds:

```bash
eas build --profile preview --platform all
```

or:

```bash
eas build --profile production --platform all
```

---

# 29. Publish EAS Updates

For current Expo SDK versions, specify the EAS environment when publishing. ([Expo Documentation][8])

## Development update

```bash
eas update \
  --channel development \
  --message "Update development login flow" \
  --environment development
```

## Preview update

```bash
eas update \
  --channel preview \
  --message "Fix profile photo layout" \
  --environment preview
```

## Production update

```bash
eas update \
  --channel production \
  --message "Fix discovery screen loading" \
  --environment production
```

## Publish for Android only

```bash
eas update \
  --channel production \
  --platform android \
  --message "Fix Android notification issue" \
  --environment production
```

## Publish for iOS only

```bash
eas update \
  --channel production \
  --platform ios \
  --message "Fix Apple Sign-In issue" \
  --environment production
```

## Publish for both

```bash
eas update \
  --channel production \
  --platform all \
  --message "Fix profile loading" \
  --environment production
```

---

# 30. When EAS Update is not enough

You must create a new native build when you change things such as:

* Native packages
* iOS capabilities
* Android permissions
* Bundle identifier
* Android package name
* App icon or splash configuration requiring native regeneration
* Google Sign-In native configuration
* Apple Sign-In capability
* RevenueCat native SDK version
* Firebase native files
* Expo SDK version

Example:

```bash
eas build --profile production --platform all
```

Use EAS Update mainly for:

* JavaScript logic
* TypeScript code
* Styles
* Text
* Images bundled as app assets
* Non-native bug fixes

---

# 31. EAS environment variables

## List environments

```bash
eas env:list
```

## List production variables

```bash
eas env:list --environment production
```

## Create a variable interactively

```bash
eas env:create
```

## Create a production variable

```bash
eas env:create \
  --environment production \
  --name EXPO_PUBLIC_API_BASE_URL \
  --value https://api.qaliye.com \
  --visibility plaintext
```

## Create a sensitive variable

```bash
eas env:create \
  --environment production \
  --name PRIVATE_SERVICE_KEY \
  --value YOUR_SECRET_VALUE \
  --visibility sensitive
```

Do not use the `EXPO_PUBLIC_` prefix for actual secrets. Anything using that prefix is intended to be embedded into client-side code.

## Pull environment variables locally

```bash
eas env:pull --environment development
```

## Pull preview values

```bash
eas env:pull --environment preview
```

## Pull production values

```bash
eas env:pull --environment production
```

## Execute a command with an EAS environment

```bash
eas env:exec production "npx expo config"
```

---

# 32. Build with an EAS environment

Example `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "environment": "development"
    },
    "preview": {
      "distribution": "internal",
      "environment": "preview"
    },
    "production": {
      "autoIncrement": true,
      "environment": "production"
    }
  }
}
```

Commands stay simple:

```bash
eas build --profile development --platform android
```

```bash
eas build --profile preview --platform ios
```

```bash
eas build --profile production --platform all
```

---

# 33. App version commands

With:

```json
{
  "cli": {
    "appVersionSource": "remote"
  }
}
```

EAS can manage Android `versionCode` and iOS `buildNumber`.

## View remote build versions

```bash
eas build:version:get --platform all
```

## Android version

```bash
eas build:version:get --platform android
```

## iOS version

```bash
eas build:version:get --platform ios
```

## Set Android version interactively

```bash
eas build:version:set --platform android
```

## Set iOS version interactively

```bash
eas build:version:set --platform ios
```

## Sync remote versions to native projects

```bash
eas build:version:sync --platform all
```

These commands are especially relevant when using remote version management. ([Expo Documentation][1])

---

# 34. Increase app version

Your public version normally lives in `app.json`:

```json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.qaliye.app"
    },
    "android": {
      "package": "com.qaliye.app"
    }
  }
}
```

For the next public release:

```json
{
  "expo": {
    "version": "1.0.1"
  }
}
```

Then build:

```bash
eas build --profile production --platform all
```

With `"autoIncrement": true`, EAS increments:

* Android `versionCode`
* iOS `buildNumber`

It does not necessarily change the public marketing version automatically.

---

# 35. Generate native Android and iOS folders

## Generate native projects

```bash
npx expo prebuild
```

## Recreate them cleanly

```bash
npx expo prebuild --clean
```

## Android only

```bash
npx expo prebuild --platform android
```

## iOS only

```bash
npx expo prebuild --platform ios
```

Be careful with:

```bash
npx expo prebuild --clean
```

It deletes and regenerates the native folders. Commit manual native changes before running it.

---

# 36. Build and run locally without EAS cloud

## Android

```bash
npx expo run:android
```

## Android with a clean native regeneration

```bash
npx expo prebuild --clean
npx expo run:android
```

## iOS

```bash
npx expo run:ios
```

## Open a specific iOS simulator

```bash
npx expo run:ios --device
```

## Run on a physical iPhone

```bash
npx expo run:ios --device
```

Then select the connected device.

These are Expo local native build commands, not EAS cloud-build commands.

---

# 37. Open native projects

## Open Android Studio project

From the project root:

```bash
open -a "Android Studio" android
```

On Windows, open Android Studio and select:

```text
your-project/android
```

## Open the iOS workspace in Xcode

```bash
open ios/*.xcworkspace
```

Or:

```bash
xed ios
```

Use the `.xcworkspace`, not normally the `.xcodeproj`, when CocoaPods are involved.

---

# 38. EAS diagnostics

## Display EAS environment information

```bash
eas diagnostics
```

This provides information useful for debugging EAS CLI and environment problems. ([Expo Documentation][1])

## Expo project diagnostics

```bash
npx expo-doctor
```

## Show resolved app configuration

```bash
npx expo config
```

## Show EAS build configuration

```bash
eas config
```

## Show production configuration

```bash
eas config --platform android --profile production
```

```bash
eas config --platform ios --profile production
```

This is useful for checking which environment variables, bundle identifiers, package names, build profiles, and settings EAS will use.

---

# 39. Useful help commands

## Main help

```bash
eas --help
```

## Build help

```bash
eas build --help
```

## Submit help

```bash
eas submit --help
```

## Credentials help

```bash
eas credentials --help
```

## Update help

```bash
eas update --help
```

## Environment help

```bash
eas env --help
```

## Project help

```bash
eas project --help
```

---

# 40. Complete first-time setup sequence

For a completely new Expo project:

```bash
# Enter the project
cd qaliye-mobile

# Install dependencies
npm install

# Install the latest EAS CLI
npm install --global eas-cli@latest

# Log in to Expo
eas login

# Confirm the account
eas whoami

# Check the Expo project
npx expo-doctor

# Create or link the EAS project
eas init

# Confirm the linked EAS project
eas project:info

# Configure EAS Build
eas build:configure --platform all

# Install the native development client
npx expo install expo-dev-client

# Configure EAS Update, when you want OTA updates
eas update:configure
```

---

# 41. Normal development workflow

## Android

```bash
# Build the development client when native configuration changes
eas build --profile development --platform android

# Start Metro after installing the build
npx expo start --dev-client
```

## iOS

```bash
# Build the development client when native configuration changes
eas build --profile development --platform ios

# Start Metro after installing the build
npx expo start --dev-client
```

## Both

```bash
eas build --profile development --platform all
npx expo start --dev-client
```

You do not need a new development build for every JavaScript change. Usually, start Metro and reload the existing development client.

---

# 42. Preview-testing workflow

```bash
# Check the project
npx expo-doctor

# Build Android and iOS preview versions
eas build --profile preview --platform all

# View builds
eas build:list
```

For a JavaScript-only preview fix:

```bash
eas update \
  --channel preview \
  --message "Fix preview issue" \
  --environment preview
```

---

# 43. Android production release workflow

```bash
# Validate dependencies and configuration
npx expo-doctor

# Check resolved production configuration
eas config --platform android --profile production

# Check Android signing credentials
eas credentials --platform android

# Create a production AAB
eas build --profile production --platform android

# View build result
eas build:list --platform android

# Submit latest build to Google Play
eas submit \
  --profile production \
  --platform android \
  --latest
```

Combined build and submit:

```bash
eas build \
  --profile production \
  --platform android \
  --auto-submit-with-profile production
```

---

# 44. iOS production release workflow

```bash
# Validate dependencies and configuration
npx expo-doctor

# Check resolved production configuration
eas config --platform ios --profile production

# Check Apple signing credentials
eas credentials --platform ios

# Create a production IPA
eas build --profile production --platform ios

# View build result
eas build:list --platform ios

# Submit the latest build to App Store Connect
eas submit \
  --profile production \
  --platform ios \
  --latest
```

Combined build and submit:

```bash
eas build \
  --profile production \
  --platform ios \
  --auto-submit-with-profile production
```

---

# 45. Both-platform production release

```bash
# Validate
npx expo-doctor

# Build Android and iOS
eas build --profile production --platform all

# Review builds
eas build:list

# Submit both
eas submit \
  --profile production \
  --platform all \
  --latest
```

Or build and submit automatically:

```bash
eas build \
  --profile production \
  --platform all \
  --auto-submit-with-profile production
```

---

# 46. The commands you will use most often

For your Qaliye project, these are the commands worth remembering:

```bash
# Login and project information
eas login
eas whoami
eas project:info

# Validate
npx expo-doctor
npx expo config
eas config

# Configure
eas init
eas build:configure --platform all
eas update:configure

# Credentials
eas credentials --platform android
eas credentials --platform ios

# Development builds
eas build --profile development --platform android
eas build --profile development --platform ios

# Preview builds
eas build --profile preview --platform android
eas build --profile preview --platform ios

# Production builds
eas build --profile production --platform android
eas build --profile production --platform ios
eas build --profile production --platform all

# View builds
eas build:list

# Submit
eas submit --profile production --platform android --latest
eas submit --profile production --platform ios --latest

# Development server
npx expo start --dev-client

# Publish JavaScript updates
eas update --channel preview --message "Preview update" --environment preview
eas update --channel production --message "Production update" --environment production
```

The most important distinction is:

```text
eas build       = creates the Android or iOS binary
eas submit      = uploads that binary to Google or Apple
eas update      = publishes JavaScript/assets without a new store build
eas credentials = manages signing credentials
eas init        = creates or links the EAS project
```

EAS Submit only uploads the binary. Store descriptions, screenshots, review information, pricing, subscriptions, and production-release approval are still managed through Google Play Console or App Store Connect. ([Expo Documentation][7])

[1]: https://docs.expo.dev/eas/cli/ "EAS CLI reference - Expo Documentation"
[2]: https://docs.expo.dev/build/setup/ "Create your first build - Expo Documentation"
[3]: https://docs.expo.dev/build/introduction/?utm_source=chatgpt.com "EAS Build - Expo Documentation"
[4]: https://docs.expo.dev/build-reference/local-builds/?utm_source=chatgpt.com "Run EAS Build locally with local flag"
[5]: https://docs.expo.dev/build/automate-submissions/?utm_source=chatgpt.com "Automate submissions - EAS Build"
[6]: https://docs.expo.dev/app-signing/managed-credentials/ "Using automatically managed credentials - Expo Documentation"
[7]: https://docs.expo.dev/submit/introduction/ "Submit to app stores - Expo Documentation"
[8]: https://docs.expo.dev/eas-update/getting-started/ "Get started with EAS Update - Expo Documentation"
