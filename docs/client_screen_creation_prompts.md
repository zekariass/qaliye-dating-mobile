# Qaliye — Client Screen Creation Prompts for AI Agent

**Version:** 1.0
**Audience:** AI coding agent (client)
**Scope:** React Native (Expo SDK 56) · Expo Router · Supabase JS Client · Axios (Spring Boot calls)
**Design references:** `docs/screen_designs/*.png`
**Context files:** `docs/project-context.md`, `docs/implementation_guide.md`, `docs/schema.sql`

---

## 0. Global Rules — Read Before Every Screen

These rules apply to **every** screen. Enforce them always.

### 0.1 Environment Variables

Never hardcode URLs or keys. Always use:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_API_BASE_URL=https://api.yourdomain.com
EXPO_PUBLIC_EAS_PROJECT_ID=<eas-project-id>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<google-web-client-id>
```

Access via `process.env.EXPO_PUBLIC_*`. These are inlined at build time by Expo.

### 0.2 Framework and Routing

- **Expo SDK 56**, Expo Router (file-based, `src/app/`). NOT React Navigation.
- **New Architecture** enabled. `react-native-reanimated` 4.x + `react-native-worklets`.
- Path alias: `@/*` → `src/*`, `@/assets/*` → `assets/*`.
- `typedRoutes: true` — use typed `router.push`, `router.replace`.

Route map:

```
src/app/
  _layout.tsx                     root Stack, headerShown: false
  index.tsx                       bootstrap redirect (useBootstrapApp, no UI)
  auth.tsx                        Auth / Login / Create Account
  (onboarding)/
    _layout.tsx
    index.tsx                     Onboarding multi-step flow
  (app)/
    _layout.tsx                   auth-guard layout
    (tabs)/
      _layout.tsx                 custom bottom tab bar
      index.tsx                   Discovery (Home tab)
      matches.tsx                 Matches tab
      messages.tsx                Messages list tab
      likes.tsx                   Likes tab
      profile.tsx                 My Profile tab
    chat/[matchId].tsx            Chat screen (stack push)
    profile/[userId].tsx          Other user profile (stack push)
    edit-profile.tsx              Edit Profile (stack push)
```

### 0.3 Data Access Boundary

| Operation | Path |
|---|---|
| Auth: signUp / signIn / signOut / refresh | Direct Supabase Auth `supabase.auth.*` |
| Own profile, photos, discovery prefs, blocks, reports | Direct Supabase `supabase.from(...)` — RLS ownership |
| Upload profile photo | Direct Supabase Storage `supabase.storage.from('profile-photos')` |
| Read own matches (SELECT) | Direct Supabase — RLS-gated |
| Read own match messages (SELECT) | Direct Supabase — RLS-gated |
| Realtime match + message events | Direct Supabase Realtime |
| Push token registration | Direct Supabase upsert `notification_devices` |
| Discovery deck | Spring Boot `GET /api/v1/discovery/cards` |
| Swipe | Spring Boot `POST /api/v1/actions/swipe` |
| Rewind | Spring Boot `POST /api/v1/actions/rewind` |
| Send message | Spring Boot `POST /api/v1/messages` |
| Block user | Direct Supabase insert `user_blocks` AND Spring Boot `POST /api/v1/safety/block` |
| Report user | Direct Supabase insert `user_reports` |

Never write to: `matches`, `messages`, `transactions`, `user_subscriptions`, `active_boosts`, `audit_log`, `user_discovery_actions`, `user_verifications`.

### 0.4 State Management

- **Zustand** (`src/store/`): auth session, language, theme, onboarding progress, app preferences.
- **React Query** (`src/hooks/`): all server state — fetches, mutations, pagination, cache.
- Tab selection, modal visibility, form state = local `useState`.

### 0.5 Architecture Rules

- Screens are thin: render UI + call hooks + trigger actions. Zero business logic.
- All API calls go through `src/api/` services called by hooks.
- No `Animated` from React Native core — `react-native-reanimated` only for all animations.
- No hardcoded user-facing strings — `t('key')` everywhere.
- No inline magic colors — `theme.ts` constants always.
- Touch targets ≥ 44×44.
- Every data-dependent screen handles: **loading**, **empty**, **error**, **offline** states via shared `<ScreenLoader>`, `<EmptyState>`, `<GenericErrorState>`, `<NetworkErrorState>` components.
- All i18n keys must exist in `en.json`, `am.json`, `ti.json`, `om.json`.

### 0.6 Supabase Client

Initialized once in `src/config/supabase.ts` with `expo-secure-store` adapter (already implemented). Import as `import { supabase } from '@/config/supabase'`.

### 0.7 Spring Boot API Client

`src/config/apiClient.ts` — Axios instance, `baseURL: process.env.EXPO_PUBLIC_API_BASE_URL`, request interceptor attaches Supabase JWT, response interceptor handles 401 refresh (already implemented). Import as `import { apiClient } from '@/config/apiClient'`.

---

## Screen 1 — Splash Screen

**Design:** `docs/screen_designs/splash-screen-design.png`
**Route:** `src/app/index.tsx` → renders `SplashScreen` while bootstrapping, then redirects
**Folder:** `src/screens/splash/`

### Visual Description

Full-screen soft lavender-to-deep-purple radial gradient background. Center: interlocked double-heart logo (left half purple, right half pink, inner glowing pink heart). Below: large elegant "Qaliye" wordmark in deep purple. Dash-decorators flanking "Where hearts connect" italic subtitle. 6–8 floating 3D-glowing pink/purple hearts scattered at various sizes. Subtle sparkle star particles. Bottom center: three dots with small outline heart between them (pulsing loading indicator).

### Animation Sequence

All via `react-native-reanimated`. Use `useSharedValue`, `useAnimatedStyle`, `withTiming`, `withSpring`, `withSequence`, `withDelay`, `withRepeat`.

1. **Background gradient**: `opacity 0 → 1`, 600ms.
2. **Heart logo**: `scale 0.7 → 1.0` with `withSpring({ damping: 12, stiffness: 90 })`, delay 300ms.
3. **Floating hearts** (6–8 instances of `<FloatingHeart>`): each loops `translateY(0 → -80 → 0)` with staggered delays (0, 200, 400, … ms). Fade in `opacity 0 → 0.85`.
4. **Wordmark**: `translateY(20 → 0)` + `opacity 0 → 1`, delay 500ms, duration 500ms.
5. **Tagline**: `opacity 0 → 1`, delay 800ms, duration 400ms.
6. **Loading dots**: each dot `scale 1 → 1.4 → 1` with 150ms stagger between dots, infinite repeat.

### Bootstrap Logic

`src/app/index.tsx` calls `useBootstrapApp()`. When `isBootstrapping = false`:
- No session → `router.replace('/auth')`
- Session + `is_onboarded = false` → `router.replace('/(onboarding)')`
- Session + `is_onboarded = true` → `router.replace('/(app)/(tabs)')`

The hook reads `profiles.is_onboarded` from Supabase directly. Routing logic stays in the hook, not the screen.

### Components

- `src/screens/splash/SplashScreen.tsx` — main animated screen
- `src/components/animations/FloatingHeart.tsx` — props: `size: number`, `delay: number`, `startX: number`, `color: string`
- `src/components/animations/PulsingDots.tsx` — three-dot staggered pulse loader
- `src/components/animations/SparkleParticle.tsx` — small star/sparkle with opacity flicker

### i18n Keys

```json
{ "splash": { "tagline": "Where hearts connect" } }
```

### Do NOT

- No routing logic in `SplashScreen.tsx` — only animation + hook call.
- No `Animated` from React Native core.
- Do not hold the native Expo splash screen open — call `SplashScreen.hideAsync()` once `SplashScreen.tsx` mounts.

---

## Screen 2 — Auth Screen (Login / Create Account)

**Design:** `docs/screen_designs/auth-screen-design.png`
**Route:** `src/app/auth.tsx` → `src/screens/auth/AuthScreen.tsx`
**Folder:** `src/screens/auth/`

### Existing Screen Shell

The visual shell is already implemented in `src/screens/auth/AuthScreen.tsx` and its components (`AuthTextInput`, `SocialAuthButton`, `GradientButton`, `InfoMessage`). **Do not rewrite the UI** — wire Supabase auth logic into the existing `TODO` placeholders.

### Visual Description (already built)

Top ~43%: hero image background with "Qaliye" wordmark + pink heart, tagline "Where hearts from our heritage find home.", decorative heart-dash divider. Bottom ~57%: white card with rounded top. "Welcome" heading. **Login method toggle** (email ↔ phone) via social row switch. Email mode: email input + password input (with eye toggle). Phone mode: phone input with fixed `+251` country code prefix + OTP code input (2-step flow: enter phone → send code → enter code → verify). CTA button label morphs: "Log In" (email) / "Send code" (phone step 1) / "Log In" (phone step 2). "or continue with" divider. Social row: Google, Apple, Phone/Email switch button. Privacy trust note at bottom.

### Auth Modes

The screen supports **4 auth mechanisms**, all via direct Supabase Auth (no Spring Boot):

#### 1. Email-Password (Login + Create Account)

Wire the existing email input + password input in `AuthScreen.tsx`. Add an `AuthSegmentedControl` (`src/components/auth/AuthSegmentedControl.tsx`, already created but not yet imported) at the top of the form for **"Log In" | "Create Account"** toggle.

- **Login mode**: CTA calls `supabase.auth.signInWithPassword({ email, password })`
- **Create Account mode**: show additional `confirmPassword` field (reuses `AuthTextInput`). CTA calls `supabase.auth.signUp({ email, password })`. On success, Supabase sends a confirmation email; show "Check your email to confirm your account." message.

```ts
// src/hooks/auth/useEmailAuth.ts
export function useEmailAuth() {
  const login = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      supabase.auth.signInWithPassword({ email, password }),
  });
  const signup = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      supabase.auth.signUp({ email, password }),
    onSuccess: () => { /* show "Check your email" banner */ },
  });
  return { login, signup };
}
```

#### 2. Phone OTP

Wire the existing 2-step phone flow in `AuthScreen.tsx`:

- **Step 1 — Enter phone**: user types 9-digit Ethiopian number (auto-stripped to digits, validated `startsWith('9') && length === 9`). CTA label = "Send code". On press:
  ```ts
  await supabase.auth.signInWithOtp({ phone: `+251${phone}` });
  setPhoneStep('enterCode');
  ```
- **Step 2 — Enter OTP code**: show 6-digit code input. CTA label = "Log In". On press:
  ```ts
  await supabase.auth.verifyOtp({ phone: `+251${phone}`, token: code, type: 'sms' });
  ```
- **Resend code**: debounced (60s cooldown). Calls `signInWithOtp` again.

```ts
// src/hooks/auth/usePhoneOtp.ts
export function usePhoneOtp() {
  const sendCode = useMutation({
    mutationFn: (phone: string) => supabase.auth.signInWithOtp({ phone: `+251${phone}` }),
  });
  const verifyCode = useMutation({
    mutationFn: ({ phone, code }: { phone: string; code: string }) =>
      supabase.auth.verifyOtp({ phone: `+251${phone}`, token: code, type: 'sms' }),
  });
  return { sendCode, verifyCode };
}
```

#### 3. Google Sign-In

Wire the existing Google `SocialAuthButton` in `AuthScreen.tsx`:

```ts
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

async function handleGoogle() {
  await GoogleSignin.hasPlayServices();
  const { idToken } = await GoogleSignin.signIn();
  if (!idToken) throw new Error('Google sign-in failed');
  await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
}
```

#### 4. Apple Sign-In

Wire the existing Apple `SocialAuthButton` in `AuthScreen.tsx`:

```ts
import * as AppleAuthentication from 'expo-apple-authentication';

async function handleApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) throw new Error('Apple sign-in failed');
  await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
}
```

### After Successful Auth

All auth paths converge through `supabase.auth.onAuthStateChange` in `src/app/index.tsx` (bootstrap). After `SIGNED_IN` event:
1. Query `profiles.is_onboarded` for the authenticated user
2. Route:
   - `is_onboarded === false` → `router.replace('/(onboarding)')`
   - `is_onboarded === true` → `router.replace('/(app)/(tabs)')`

**Do not navigate inside `AuthScreen.tsx` form handlers** — let the bootstrap listener handle routing.

### Error Handling

Show errors inline:
- Below the relevant input field for validation errors (email format, password too short, invalid phone, invalid code)
- Below the CTA button for Supabase auth errors (`error.message` localized via `t('auth.loginError')` fallback)
- Use `react-hook-form` + Zod for client-side validation on email/password fields:
  ```ts
  const emailSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });
  const signupSchema = emailSchema.extend({
    confirmPassword: z.string().min(8),
  }).refine(d => d.password === d.confirmPassword, {
    message: 'auth.passwordMismatch',
    path: ['confirmPassword'],
  });
  ```

### Hooks

- `src/hooks/auth/useEmailAuth.ts` — `signInWithPassword` + `signUp` mutations
- `src/hooks/auth/usePhoneOtp.ts` — `signInWithOtp` + `verifyOtp` mutations
- `src/hooks/auth/useSocialAuth.ts` — Google + Apple `signInWithIdToken` wrappers
- `src/hooks/auth/useAuthError.ts` — normalize Supabase auth errors to i18n keys

### Components (already created — do not rewrite)

- `src/screens/auth/AuthScreen.tsx` — wire auth logic into existing `TODO` handlers
- `src/components/auth/AuthSegmentedControl.tsx` — Log In / Create Account pill toggle (add to screen)
- `src/components/auth/AuthTextInput.tsx` — icon + styled input + optional eye toggle (reuse for email, password, confirmPassword, phone, code)
- `src/components/auth/SocialAuthButton.tsx` — Google / Apple / method-switch button
- `src/components/auth/InfoMessage.tsx` — info banner (for "Ethiopia phone only", "Check your email")
- `src/components/ui/GradientButton.tsx` — CTA button (already integrated)

### i18n Keys (add missing ones to `src/i18n/locales/*.json`)

```json
{
  "auth": {
    "login": "Log In",
    "createAccount": "Create Account",
    "welcome": "Welcome",
    "tagline": "Where hearts from our heritage find home.",
    "emailAddress": "Email address",
    "phoneNumber": "Phone number",
    "password": "Password",
    "confirmPassword": "Confirm Password",
    "enterCode": "Enter 6-digit code",
    "sendCode": "Send code",
    "resendCode": "Resend code",
    "codeSentTo": "Code sent to {{phone}}",
    "google": "Google",
    "apple": "Apple",
    "phone": "Phone",
    "email": "Email",
    "orContinueWith": "or continue with",
    "forgotPassword": "Forgot password?",
    "privacyLine1": "Your privacy and safety are our top priority.",
    "privacyLine2": "All data is secure and encrypted.",
    "ethiopiaPhoneOnly": "Ethiopian phone numbers only (starts with 9)",
    "invalidEmail": "Please enter a valid email",
    "passwordRequired": "Password is required",
    "invalidEthiopianPhone": "Please enter a valid Ethiopian phone number",
    "invalidCode": "Please enter the 6-digit code",
    "passwordMismatch": "Passwords do not match",
    "loginError": "Login failed. Please check your credentials.",
    "signupError": "Account creation failed. Please try again.",
    "otpError": "Code verification failed. Please try again.",
    "checkEmail": "Check your email to confirm your account."
  }
}
```

### Do NOT

- Do not rewrite the existing `AuthScreen.tsx` UI shell — wire auth logic into existing `TODO` placeholders only.
- Do not store tokens in AsyncStorage — `expo-secure-store` only (handled by Supabase client auto-config).
- Do not navigate inside form handlers — let `onAuthStateChange` + `index.tsx` bootstrap handle routing.
- Do not silence auth errors — show them inline below the relevant field or below the CTA button.
- Do not use phone+password (`signInWithPassword` with phone) — use **phone OTP only** (`signInWithOtp` + `verifyOtp`).

---

## Screen 3 — Onboarding Flow

**Designs:** `docs/screen_designs/onboarding-screen-design-1.png`, `docs/screen_designs/onboarding-screen-design-2.png`
**Route:** `src/app/(onboarding)/index.tsx` → `src/screens/onboarding/OnboardingScreen.tsx`
**Folder:** `src/screens/onboarding/`

### Visual Description

Soft pink-to-lavender gradient background with floating decorative hearts. Top-left: Qaliye wordmark + pink heart. Step progress: numbered circles 1–5 with connecting lines — active step filled purple, completed steps show checkmark. Large heading "Complete your profile". Step subtitle. Scrollable card content area. Bottom: ghost "← Back" button (left) + purple gradient "Continue →" (right). Trust note at bottom.

Steps from designs: **1 Basics** → **2 About You** → **3 Lifestyle** → **4 Preferences** → **5 Photos**.

### Step Architecture

Single screen with Zustand onboarding store (`src/store/onboarding/onboardingStore.ts`) holding all accumulated data. Do not write to Supabase until the final step completes.

```ts
interface OnboardingStore {
  step: number;
  residencyType: 'ETHIOPIA' | 'ERITREA' | 'DIASPORA' | null;
  countryCode: string;
  countryName: string;
  city: string;
  region: string;
  locationSource: 'GPS' | 'MANUAL';
  gender: 'MALE' | 'FEMALE' | null;
  interestedInGender: 'MALE' | 'FEMALE';
  profile: Partial<ProfileFormData>;
  preferences: Partial<DiscoveryPreferencesFormData>;
  photos: UploadedPhoto[];
  setStep(n: number): void;
  setLocation(data: LocationData): void;
  setGender(g: 'MALE' | 'FEMALE'): void;
  setProfile(p: Partial<ProfileFormData>): void;
  setPreferences(p: Partial<DiscoveryPreferencesFormData>): void;
  addPhoto(photo: UploadedPhoto): void;
  removePhoto(photoId: string): void;
  reorderPhotos(from: number, to: number): void;
  reset(): void;
}
```

Step transitions: animate with `react-native-reanimated` `translateX` — new step slides in from the right, old step exits left. Use `withTiming` + `runOnJS` callback to unmount the exited step.

### Step 1 — Basics (Location + Gender)

**Location section:**

Four tiles: "Use my location" (GPS icon, purple border when selected), "🇪🇹 Ethiopia", "🇪🇷 Eritrea", "🌐 Diaspora / Abroad".

"Use my location" flow:
```ts
import * as Location from 'expo-location';
const { status } = await Location.requestForegroundPermissionsAsync();
if (status !== 'granted') { showManualFallback(); return; }
const { coords } = await Location.getCurrentPositionAsync({});
const [geo] = await Location.reverseGeocodeAsync(coords);
// Map to residencyType:
// geo.isoCountryCode === 'ET' → 'ETHIOPIA'
// geo.isoCountryCode === 'ER' → 'ERITREA'
// other → 'DIASPORA'
store.setLocation({ residencyType, countryCode: geo.isoCountryCode, countryName: geo.country, city: geo.city, locationSource: 'GPS' });
```

Manual selection auto-sets: Ethiopia → `countryCode='ET'`, Eritrea → `countryCode='ER'`, Diaspora → show country + city text inputs.

After tile selection, show a confirmation row: country flag + country name dropdown + city input + auto-inferred residency badge ("Residency: ETHIOPIA").

**Gender section:**

Segmented control: "♂ Male" | "♀ Female". No other options.

"Interested in" auto-locks to opposite: MALE → FEMALE, FEMALE → MALE. Show lock icon + note: "Matches are based on your selected gender. We do not support same-gender dating."

### Step 2 — About You

`react-hook-form` with Zod schema:

```ts
const aboutYouSchema = z.object({
  displayName: z.string().min(2).max(50),
  dateOfBirth: z.string().refine(val => {
    const age = differenceInYears(new Date(), parseISO(val));
    return age >= 18;
  }, 'Must be at least 18 years old'),
  bio: z.string().max(160).optional(),
  heightCm: z.coerce.number().min(100).max(250).optional(),
  ethnicity: z.string().optional(),
  nationality: z.string().optional(),
  religion: z.string().optional(),
  educationLevel: z.string().optional(),
  occupation: z.string().max(100).optional(),
  relationshipIntention: z.string().optional(),
  maritalStatus: z.string().optional(),
});
```

DOB: day/month/year dropdown pickers — validate age ≥ 18 on blur and before Continue.

Dropdown options:
- `ethnicity`: Amhara, Oromo, Tigrinya, Somali, Afar, Gurage, Sidama, Hadiya, Wolayta, Other
- `nationality`: Ethiopian, Eritrean, Other
- `religion`: Orthodox Christian, Muslim, Protestant, Catholic, Traditional, Other
- `educationLevel`: High School, Some College, Bachelor's Degree, Master's Degree, PhD, Vocational, Other
- `relationshipIntention`: Serious relationship, Long-term relationship, Casual (see where it goes), Open to dating, Marriage-focused
- `maritalStatus`: Never Married, Divorced, Widowed, Separated

Bio: multiline text area with character counter (max 160, shown as `XX/160`).

### Step 3 — Lifestyle

Toggle/pill pairs for each field:

- **Has children**: Yes | No
- **Wants children**: Yes | No
- **Smoking**: No | Socially | Yes
- **Drinking**: No | Socially | Yes

Selected option shows filled purple pill. Unselected shows outline pill.

### Step 4 — Preferences (Discovery)

Same UI as Preferences tab in Edit Profile (see Screen 11). Pre-fill defaults:
- `discoveryMode`: `STANDARD`
- `minAge`: 18, `maxAge`: 35
- `maxDistanceKm`: 50
- `openToLongDistance`: false, `openToRelocation`: false, `showVerifiedOnly`: false
- `preferredResidencyTypes`: all three checked

Show info note: "You can change these anytime in your profile preferences."

### Step 5 — Photos

At least 1 photo required. Max 6 photos.

Upload flow (`src/services/storage/uploadProfilePhoto.ts`):
```ts
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { randomUUID } from 'expo-crypto';

export async function uploadProfilePhoto(userId: string, photoOrder: number, isPrimary: boolean) {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images' });
  if (picked.canceled) return null;
  const resized = await ImageManipulator.manipulateAsync(
    picked.assets[0].uri,
    [{ resize: { width: 1080 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
  );
  const photoId = randomUUID();
  const storagePath = `profile-photos/${userId}/${photoId}.jpg`;
  const blob = await (await fetch(resized.uri)).blob();
  const { error } = await supabase.storage.from('profile-photos').upload(storagePath, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('profile-photos').getPublicUrl(storagePath);
  const { data, error: dbErr } = await supabase.from('profile_photos').insert({
    id: photoId, user_id: userId, image_url: publicUrl,
    storage_path: storagePath, photo_order: photoOrder, is_primary: isPrimary,
  }).select().single();
  if (dbErr) throw dbErr;
  return data;
}
```

Show upload progress. Uploaded photos in a draggable grid (use `react-native-draggable-flatlist` or manual long-press drag). First photo auto-marked as primary with "Primary" badge. Show "Add photo" placeholder tiles for empty slots. Show moderation note: "Your photos are reviewed before becoming visible to others."

### Completing Onboarding (final Continue on Step 5)

Execute in sequence — all direct Supabase, no Spring Boot:

```ts
// 1. Insert address row
const { data: addr } = await supabase.from('addresses').insert({
  country_code: store.countryCode,
  country_name: store.countryName,
  city: store.city,
  region: store.region || null,
  location_source: store.locationSource,
}).select('id').single();

// 2. Update profile (own-row — RLS allows)
await supabase.from('profiles').update({
  display_name: store.profile.displayName,
  gender: store.gender,
  date_of_birth: store.profile.dateOfBirth,
  bio: store.profile.bio,
  height_cm: store.profile.heightCm,
  residency_type: store.residencyType,
  ethnicity: store.profile.ethnicity,
  nationality: store.profile.nationality,
  religion: store.profile.religion,
  education_level: store.profile.educationLevel,
  occupation: store.profile.occupation,
  relationship_intention: store.profile.relationshipIntention,
  marital_status: store.profile.maritalStatus,
  has_children: store.profile.hasChildren ?? false,
  wants_children: store.profile.wantsChildren ?? null,
  smoking: store.profile.smoking ?? false,
  drinking: store.profile.drinking ?? false,
  address_id: addr.id,
  is_onboarded: true,
}).eq('user_id', session.user.id);

// 3. Update discovery preferences (own-row — RLS allows)
await supabase.from('discovery_preferences').update({
  discovery_mode: store.preferences.discoveryMode ?? 'STANDARD',
  preferred_residency_types: store.preferences.preferredResidencyTypes ?? ['ETHIOPIA','ERITREA','DIASPORA'],
  interested_in_gender: store.interestedInGender,
  min_age: store.preferences.minAge ?? 18,
  max_age: store.preferences.maxAge ?? 35,
  max_distance_km: store.preferences.maxDistanceKm ?? 50,
  open_to_long_distance: store.preferences.openToLongDistance ?? false,
  open_to_relocation: store.preferences.openToRelocation ?? false,
  show_verified_only: store.preferences.showVerifiedOnly ?? false,
}).eq('user_id', session.user.id);

// 4. Clear store, navigate
store.reset();
router.replace('/(app)/(tabs)');
```

### Hooks

- `src/hooks/onboarding/useOnboardingSubmit.ts` — mutation wrapping the 3-step Supabase write sequence above
- `src/hooks/onboarding/useLocationPicker.ts` — GPS permission + reverse geocoding

### Components

- `src/screens/onboarding/OnboardingScreen.tsx`
- `src/components/onboarding/StepProgressBar.tsx` — numbered step circles with connecting line
- `src/components/onboarding/LocationTiles.tsx` — 4-tile location picker
- `src/components/onboarding/GenderSelector.tsx` — Male/Female segmented control
- `src/components/onboarding/ProfileForm.tsx` — Step 2 form fields
- `src/components/onboarding/LifestyleToggles.tsx` — Step 3 pill toggles
- `src/components/onboarding/PhotoUploadGrid.tsx` — draggable photo grid
- `src/components/onboarding/DropdownField.tsx` — reusable labeled dropdown

### i18n Keys

```json
{
  "onboarding": {
    "heading": "Complete your profile",
    "subtitle": "A few quick steps to help you find meaningful matches.",
    "stepOf": "Step {{step}} of {{total}}",
    "continue": "Continue",
    "back": "Back",
    "location": {
      "question": "Where do you live now?",
      "useMyLocation": "Use my location",
      "ethiopia": "Ethiopia",
      "eritrea": "Eritrea",
      "diaspora": "Diaspora / Abroad",
      "detected": "Detected: {{city}}, {{country}}",
      "residency": "Residency type: {{type}}",
      "confirmCity": "Confirm country and city"
    },
    "gender": {
      "question": "Are you?",
      "male": "Male",
      "female": "Female",
      "interestedIn": "Interested in",
      "interestedNote": "Matches are based on your selected gender. We do not support same-gender dating."
    },
    "aboutYou": {
      "heading": "Tell us more about you",
      "displayName": "Display name",
      "dateOfBirth": "Date of birth",
      "bio": "Bio",
      "bioPlaceholder": "I love meaningful conversations...",
      "heightCm": "Height (cm)",
      "ethnicity": "Ethnicity",
      "nationality": "Nationality",
      "religion": "Religion",
      "educationLevel": "Education level",
      "occupation": "Occupation",
      "relationshipIntention": "Relationship intention",
      "maritalStatus": "Marital status",
      "ageError": "Must be at least 18 years old"
    },
    "lifestyle": {
      "hasChildren": "Has children?",
      "wantsChildren": "Wants children?",
      "smoking": "Smoking",
      "drinking": "Drinking",
      "yes": "Yes",
      "no": "No",
      "socially": "Socially"
    },
    "photos": {
      "heading": "Add your photos",
      "instruction": "Add at least one clear photo of yourself.",
      "addPhoto": "Add photo",
      "primary": "Primary",
      "primaryNote": "This is your primary photo. It will be shown first.",
      "photoTip": "Use clear, well-lit photos that show your face. Avoid group photos.",
      "moderationNote": "Your photos are reviewed before becoming visible to others.",
      "minPhotoError": "Please add at least one photo to continue."
    },
    "trustNote": "Your privacy and safety are our top priority. All data is secure and encrypted."
  }
}
```

### Do NOT

- Do not write to Supabase on each step — accumulate in Zustand, write all at once on final completion.
- Do not allow users under 18 to pass Step 2 (validate DOB strictly).
- Do not allow same-gender `interested_in_gender` — lock to opposite of selected gender.
- Do not allow completing Step 5 without at least one uploaded photo.
- Do not use `Animated` from React Native — `react-native-reanimated` for step transitions.
- Do not navigate back to onboarding if `is_onboarded = true`.

---

## Screen 4 — Discovery Screen

**Design:** `docs/screen_designs/discovery-screen-design.png`
**Route:** `src/app/(app)/(tabs)/index.tsx` → `src/screens/discovery/DiscoveryScreen.tsx`
**Folder:** `src/screens/discovery/`

### Visual Description

White background. **Top bar**: current user's circular avatar (own primary photo, top-left); center: pin icon + "Nearby" text + chevron-down (tappable — opens discovery mode selector); right: settings gear icon. **Card area**: large rounded card filling most of the screen. Profile photo covers the card with a dark-to-transparent gradient overlay at bottom. Top-right inside card: horizontal photo dots (active = filled purple, rest = light gray). Bottom-left overlay: bold white name + green verified badge + age; below: pin icon + "X kilometers away"; below: pill/chip with relationship intention. **Right edge of card**: three vertically-stacked white circular action buttons — top: orange circular-arrow rewind; middle: red × pass; bottom: purple gradient heart+sparkles like button. **Bottom**: custom black rounded tab bar, "Home" tab active.

### Swipe Gestures (react-native-reanimated + react-native-gesture-handler)

Use `Gesture.Pan()` from `react-native-gesture-handler` + `useSharedValue` + `useAnimatedStyle`:

```ts
const translateX = useSharedValue(0);
const translateY = useSharedValue(0);
const SWIPE_THRESHOLD = 120;

// Rotation tied to translateX
const rotation = useDerivedValue(() => `${(translateX.value / 20)}deg`);

// Overlay opacity: left → red PASS; right → purple LIKE
const likeOpacity = useDerivedValue(() => Math.max(0, translateX.value / SWIPE_THRESHOLD));
const passOpacity = useDerivedValue(() => Math.max(0, -translateX.value / SWIPE_THRESHOLD));

const panGesture = Gesture.Pan()
  .onUpdate(e => { translateX.value = e.translationX; translateY.value = e.translationY; })
  .onEnd(e => {
    if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
      const direction = e.translationX > 0 ? 'LIKE' : 'PASS';
      translateX.value = withTiming(direction === 'LIKE' ? 500 : -500);
      runOnJS(handleSwipe)(direction);
    } else {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    }
  });
```

### Card Stack

Render top 3 cards from the deck array. Cards behind the top card are slightly scaled down (`scale: 0.96`, `0.92`) and shifted up slightly. Only the top card has the pan gesture attached. When a card is swiped off, remove it from the deck array and load more if `cards.length < 5`.

**Photo browsing within a card**: tapping left 30% of card → previous photo; tapping right 70% → next photo. Update active photo dot index with local `useState`.

### Data Layer — Spring Boot Only

```ts
// src/api/discovery/discoveryApi.ts
const discoveryApi = {
  getCards: (params: { cursor?: string; limit: number }) =>
    apiClient.get<{ cards: CardDto[]; nextCursor: string | null }>('/api/v1/discovery/cards', { params }),
  swipe: (body: { target_user_id: string; action_type: 'LIKE' | 'PASS' | 'SUPER_LIKE' }) =>
    apiClient.post<{ matched: boolean; match_id?: string }>('/api/v1/actions/swipe', body),
  rewind: () =>
    apiClient.post<{ rewound_user_id: string }>('/api/v1/actions/rewind'),
};

type CardDto = {
  user_id: string; display_name: string; age: number; distance_km: number;
  is_verified: boolean; relationship_intention: string; residency_type: string;
  city: string; country_name: string;
  photos: { image_url: string }[];
};
```

### Hooks

```ts
// src/hooks/discovery/useDiscoveryProfiles.ts
useInfiniteQuery({
  queryKey: ['discovery'],
  queryFn: ({ pageParam }) => discoveryApi.getCards({ cursor: pageParam, limit: 20 }),
  getNextPageParam: last => last.nextCursor ?? undefined,
  staleTime: 5 * 60 * 1000,
});

// src/hooks/discovery/useSwipe.ts
useMutation({
  mutationFn: discoveryApi.swipe,
  onMutate: async ({ target_user_id }) => {
    // Optimistic: remove card from deck immediately
    queryClient.setQueryData(['discovery'], (old: any) => ({
      ...old,
      pages: old.pages.map((p: any) => ({ ...p, cards: p.cards.filter((c: any) => c.user_id !== target_user_id) })),
    }));
  },
  onSuccess: ({ data }) => { if (data.matched) showMatchCelebration(data.match_id!); },
  onError: (_e, _v, ctx) => queryClient.setQueryData(['discovery'], ctx),
});

// src/hooks/discovery/useRewind.ts
useMutation({ mutationFn: discoveryApi.rewind, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discovery'] }) });
```

### Components

- `src/screens/discovery/DiscoveryScreen.tsx`
- `src/components/discovery/ProfileCard.tsx` — animated card with pan gesture, overlay stamps, photo dots, info
- `src/components/discovery/CardStack.tsx` — manages 3-card visual stack
- `src/components/discovery/CardActionButtons.tsx` — rewind / pass / like circular buttons
- `src/components/discovery/MatchCelebrationOverlay.tsx` — "It's a Match!" animated modal overlay
- `src/components/discovery/DiscoveryModeDropdown.tsx` — Standard / Global / Incognito bottom sheet
- `src/components/common/VerifiedBadge.tsx` — green/blue checkmark badge (reused everywhere)

### Discovery Mode

Tapping "Nearby" opens a bottom sheet with Standard / Global / Incognito options. Selecting a mode updates directly via Supabase (own row):
```ts
supabase.from('discovery_preferences').update({ discovery_mode: mode }).eq('user_id', userId)
```
Then invalidate `['discovery']` query to refresh the deck.

### Bottom Tab Bar (Custom — shared across all tab screens)

Implemented in `src/app/(app)/(tabs)/_layout.tsx`. Custom tab bar component `src/components/layout/AppTabBar.tsx`:
- Near-black (`#06070D`) rounded pill background
- 5 tabs: Home (house), Matches (hearts), **Center Messages** (circular purple gradient, elevated, chat bubble icon), Likes (heart), Profile (person)
- Active tab: icon + label in primary purple (`#8A2CFF`)
- Inactive: muted gray
- Center button is circular, larger (56×56), purple gradient, sits 16px above the bar baseline
- **Do NOT use the default Expo Router tab bar** — render a fully custom component

### Empty State

When deck is empty: illustration + `t('discovery.noMoreProfiles')` + "Adjust your preferences" button → `router.push('/(app)/edit-profile')` with tab pre-selected to Preferences.

### i18n Keys

```json
{
  "discovery": {
    "nearby": "Nearby",
    "kmAway": "{{distance}} km away",
    "noMoreProfiles": "No more profiles nearby",
    "adjustPreferences": "Adjust your preferences",
    "itsAMatch": "It's a Match! 🎉",
    "matchSubtitle": "You and {{name}} liked each other.",
    "sendMessage": "Send a Message",
    "keepSwiping": "Keep Swiping",
    "rewind": "Rewind",
    "pass": "Pass",
    "like": "Like",
    "superLike": "Super Like"
  }
}
```

### Do NOT

- Do not read discovery cards from Supabase — Spring Boot only.
- Do not write to `user_discovery_actions` from the client — Spring Boot only.
- Do not use `Animated` from React Native — `react-native-reanimated` + `react-native-gesture-handler` only.
- Do not use the default Expo Router tab bar — render the custom `<AppTabBar>`.
- The center tab button navigates to Messages, not Discovery.

---

## Screen 5 — Likes Screen

**Design:** `docs/screen_designs/likes-list-creen-design.png`
**Route:** `src/app/(app)/(tabs)/likes.tsx` → `src/screens/likes/LikesScreen.tsx`
**Folder:** `src/screens/likes/`

### Visual Description

Light lavender-white background. **Top**: full-width segmented control — "♥ Received Likes" (active: purple border + text, left) | "✈ Sent Likes" (inactive, right). **Grid**: 2-column card grid. Each card: photo covering ~75% of card height (rounded top corners), purple heart icon (white circle background) top-right corner of photo. Below photo: "Name, Age" bold + verified badge; location pin + "Country, City"; distance "X km" (right-aligned); purple pill with relationship intention text. **Bottom**: custom black tab bar, Likes (heart) tab active with purple underline.

### Data Layer — Spring Boot Only

`user_discovery_actions` has no client-facing RLS policy — must go through Spring Boot.

```ts
// src/api/likes/likesApi.ts
const likesApi = {
  getReceived: (params: { cursor?: string }) =>
    apiClient.get<{ items: LikeDto[]; nextCursor: string | null }>('/api/v1/likes/received', { params }),
  getSent: (params: { cursor?: string }) =>
    apiClient.get<{ items: LikeDto[]; nextCursor: string | null }>('/api/v1/likes/sent', { params }),
};

type LikeDto = {
  user_id: string; display_name: string; age: number;
  city: string; country_name: string; distance_km: number;
  is_verified: boolean; relationship_intention: string;
  primary_photo_url: string; liked_at: string;
};
```

### Hooks

```ts
// src/hooks/likes/useLikes.ts
useInfiniteQuery({
  queryKey: ['likes', activeTab],  // activeTab: 'received' | 'sent'
  queryFn: ({ pageParam }) =>
    activeTab === 'received' ? likesApi.getReceived({ cursor: pageParam }) : likesApi.getSent({ cursor: pageParam }),
  getNextPageParam: last => last.nextCursor ?? undefined,
});
```

`activeTab` is local `useState` — not Zustand, not React Query.

### Components

- `src/screens/likes/LikesScreen.tsx`
- `src/components/likes/LikesSegmentedControl.tsx` — Received / Sent pill toggle
- `src/components/common/ProfileGridCard.tsx` — **reusable** 2-col grid card; prop `iconType: 'heart' | 'message'` controls top-right icon
- `src/components/common/ProfileGrid.tsx` — `FlatList` with `numColumns={2}`, gap spacing

Tapping a card → `router.push('/(app)/profile/' + userId)`.

### i18n Keys

```json
{
  "likes": {
    "receivedLikes": "Received Likes",
    "sentLikes": "Sent Likes",
    "emptyReceived": "No likes yet. Keep your profile active!",
    "emptySent": "You haven't liked anyone yet."
  }
}
```

### Do NOT

- Do not read from `user_discovery_actions` directly — no client RLS policy exists.
- Do not blur/lock likes behind a paywall in v1 MVP.

---

## Screen 6 — Matches Screen

**Design:** `docs/screen_designs/matches-list-screen-design.png`
**Route:** `src/app/(app)/(tabs)/matches.tsx` → `src/screens/matches/MatchesScreen.tsx`
**Folder:** `src/screens/matches/`

### Visual Description

Light background. No top tabs. Same 2-column grid card layout as Likes screen. Difference: top-right card icon is a **white circular chat bubble** (not a heart). Cards show: name + age + verified badge, city + distance, relationship intention pill. **Bottom**: custom tab bar, Matches tab active (heart-pair icon + purple underline).

### Data Layer — Direct Supabase (RLS-gated)

`matches` has a client SELECT policy for own rows:

```ts
// src/api/matches/matchesApi.ts
async function getMatches(userId: string) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, user_one_id, user_two_id, matched_at,
      p1:profiles!user_one_id(display_name, date_of_birth, is_verified, relationship_intention,
        addresses(city, country_name),
        profile_photos(image_url, is_primary, photo_order, moderation_status)),
      p2:profiles!user_two_id(display_name, date_of_birth, is_verified, relationship_intention,
        addresses(city, country_name),
        profile_photos(image_url, is_primary, photo_order, moderation_status))
    `)
    .eq('status', 'ACCEPTED')
    .order('matched_at', { ascending: false });
  if (error) throw error;
  // Determine "other user" per match
  return data.map(m => ({
    matchId: m.id,
    otherUser: m.user_one_id === userId ? m.p2 : m.p1,
    matchedAt: m.matched_at,
  }));
}
```

Show only `moderation_status = 'APPROVED'` photos client-side.

**Realtime**: subscribe to new matches via two Supabase Realtime channels (one for `user_one_id`, one for `user_two_id`). On any event, `queryClient.invalidateQueries(['matches'])`.

```ts
// src/hooks/matches/useMatchesRealtime.ts
export function useMatchesRealtime(userId: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const ch1 = supabase.channel('matches-one')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `user_one_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ['matches'] }))
      .subscribe();
    const ch2 = supabase.channel('matches-two')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `user_two_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ['matches'] }))
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [userId]);
}
```

### Hooks

- `src/hooks/matches/useMatches.ts` — `useQuery({ queryKey: ['matches'], queryFn: () => matchesApi.getMatches(userId) })`
- `src/hooks/matches/useMatchesRealtime.ts` — Realtime subscription (call in `MatchesScreen.tsx`)

### Components

- `src/screens/matches/MatchesScreen.tsx`
- Reuse `<ProfileGridCard iconType="message" />` and `<ProfileGrid />` from Likes screen

Tapping a card → `router.push('/(app)/chat/' + matchId)`.

### i18n Keys

```json
{
  "matches": {
    "title": "Matches",
    "emptyMatches": "No matches yet. Keep swiping!",
    "tapToChat": "Tap to start chatting"
  }
}
```

### Do NOT

- Do not write to `matches` from the client — Spring Boot only.
- Do not subscribe to a single Realtime channel with OR filter — subscribe to two separate channels.
- Do not show `moderation_status = 'PENDING'` or `'REJECTED'` photos.

---

## Screen 7 — Messages List Screen

**Design:** `docs/screen_designs/messages-list-screen-design.png`
**Route:** `src/app/(app)/(tabs)/messages.tsx` → `src/screens/messages/MessagesListScreen.tsx`
**Folder:** `src/screens/messages/`

### Visual Description

White background. **Top**: large bold "Messages 💕" heading (left-aligned). Smaller "Your conversations 💌" subtitle. **Segmented filter**: full-width "All" | "Unread" pill control — "All" active (filled purple). **Conversation list**: sorted newest first. Each row: circular avatar (with green online dot if active in last 5 min), display name bold + blue verified badge, last message preview (2-line truncated), relative time top-right (2m ago / 1h ago / Yesterday / May 20), unread count badge (filled purple circle with number) if unread. **Bottom**: custom tab bar — center Messages button (circular purple gradient, elevated) is the active state.

Do NOT show: search icon, pencil/compose icon, story/avatar horizontal strip, Groups tab.

### Data Layer — Direct Supabase (RLS-gated)

```ts
// src/api/messages/conversationsApi.ts
async function getConversations(userId: string) {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, user_one_id, user_two_id, last_message_at,
      p1:profiles!user_one_id(display_name, is_verified,
        app_users!inner(last_active_at),
        profile_photos(image_url, is_primary, moderation_status)),
      p2:profiles!user_two_id(display_name, is_verified,
        app_users!inner(last_active_at),
        profile_photos(image_url, is_primary, moderation_status)),
      messages(id, body, created_at, sender_id, is_read, deleted_at)
    `)
    .eq('status', 'ACCEPTED')
    .order('last_message_at', { ascending: false });
  if (error) throw error;
  return data.map(m => {
    const other = m.user_one_id === userId ? m.p2 : m.p1;
    const msgs = (m.messages ?? []).filter((msg: any) => !msg.deleted_at);
    const lastMsg = msgs.at(-1);
    const unreadCount = msgs.filter((msg: any) => msg.sender_id !== userId && !msg.is_read).length;
    const isOnline = other.app_users?.last_active_at
      ? Date.now() - new Date(other.app_users.last_active_at).getTime() < 5 * 60 * 1000
      : false;
    return { matchId: m.id, other, lastMsg, unreadCount, isOnline, lastMessageAt: m.last_message_at };
  });
}
```

**"Unread" filter**: applied client-side — show only conversations where `unreadCount > 0`.

**Realtime**: subscribe to `messages` INSERT events to update conversation list in real time. On INSERT, `invalidateQueries(['conversations'])`.

### Hooks

```ts
// src/hooks/messages/useConversations.ts
useQuery({
  queryKey: ['conversations'],
  queryFn: () => conversationsApi.getConversations(userId),
  refetchInterval: 30_000, // fallback polling
});
```

Also call `useMatchesRealtime` from Screen 6 on this screen (new match creates a new conversation entry).

### Components

- `src/screens/messages/MessagesListScreen.tsx`
- `src/components/messages/ConversationRow.tsx` — avatar + online dot + name + verified badge + last message preview + time + unread badge
- `src/components/messages/UnreadBadge.tsx` — purple circle with count number
- `src/components/common/OnlineDot.tsx` — green 10×10 dot, absolute positioned bottom-right of avatar

Tapping a row → `router.push('/(app)/chat/' + matchId)`.

### i18n Keys

```json
{
  "messages": {
    "title": "Messages",
    "subtitle": "Your conversations",
    "all": "All",
    "unread": "Unread",
    "onlineNow": "Online now",
    "emptyMessages": "No conversations yet. Match with someone to start chatting!"
  }
}
```

### Do NOT

- Do not show: search bar, compose/pencil icon, horizontal story strip, Groups tab.
- Do not implement message sending here — only listing.

---

## Screen 8 — Chat Screen

**Design:** `docs/screen_designs/chat-screen-design.png`
**Route:** `src/app/(app)/chat/[matchId].tsx` → `src/screens/chat/ChatScreen.tsx`
**Folder:** `src/screens/chat/`

### Visual Description

White background. **Header**: purple back arrow (left); center: circular avatar + bold display name + blue verified badge; below name: green dot + "Online now" text (or "Last seen X" if offline). Do NOT show call icon or three-dot menu icon. **Message list**: `FlatList` inverted (newest at bottom, scroll starts at bottom). **Date separator chips** ("Today", "Yesterday", or formatted date) between groups of messages from different days. **Incoming bubbles** (left, with avatar thumbnail): soft lavender `#EDE7FF` background, rounded, sender's avatar shown for first message in a group. **Outgoing bubbles** (right): purple gradient (`#8A2CFF → #6D35FF`), rounded, white text. Below each bubble: timestamp (HH:MM) + delivery indicator for outgoing only (single gray tick = sent, double purple tick = delivered/read). **Input bar**: purple `+` icon left; text input `flex:1` with placeholder "Type a message…"; emoji icon; circular purple gradient send button (arrow icon).

### Data Layer

**Read messages** — Direct Supabase (RLS: caller must be participant in an ACCEPTED match):

```ts
// src/api/messages/chatApi.ts
async function fetchMessages(matchId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, match_id, sender_id, message_type, body, created_at, is_read, moderation_status, deleted_at')
    .eq('match_id', matchId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}
```

**Realtime subscription** on this match's messages:
```ts
supabase.channel(`chat-${matchId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
    payload => setMessages(prev => [...prev, payload.new as Message]))
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
    payload => {
      const updated = payload.new as Message;
      if (updated.moderation_status === 'REJECTED_FLAGGED') {
        setMessages(prev => prev.filter(m => m.id !== updated.id)); // remove silently
      } else {
        setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      }
    })
  .subscribe();
```

**Send message** — Spring Boot ONLY (never direct Supabase insert):
```ts
// src/api/messages/chatApi.ts
async function sendMessage(matchId: string, body: string) {
  return apiClient.post('/api/v1/messages', {
    match_id: matchId,
    client_message_id: randomUUID(), // expo-crypto
    message_type: 'TEXT',
    body,
  });
}
```

Optimistic update: add a `{ id: clientMessageId, status: 'pending', body, sender_id: userId, created_at: new Date().toISOString() }` to local messages array immediately. On success, Realtime INSERT event will add the confirmed row — remove the optimistic one by `client_message_id`. On error: mark optimistic message as `status: 'failed'` and show retry affordance.

**Mark messages as read** on mount + on new message arrival:
```ts
// Direct Supabase — own received messages (own-row update)
supabase.from('messages')
  .update({ is_read: true })
  .eq('match_id', matchId)
  .neq('sender_id', userId)
  .eq('is_read', false);
```

### Hooks

```ts
// src/hooks/messages/useChatMessages.ts
// manages: messages array, isLoading, send mutation, realtime subscription
// NOT a useQuery — managed with useState + useEffect for realtime

// src/hooks/messages/useSendMessage.ts
useMutation({
  mutationFn: ({ matchId, body }: { matchId: string; body: string }) => chatApi.sendMessage(matchId, body),
  onMutate: // optimistic add with pending status
  onError: // mark as failed
})
```

### Block/Report Access

No three-dot menu in the header. Instead:
- **Long-press on incoming message bubble** → bottom sheet: "Report this message"
- **Long-press on the other user's avatar** in the header → bottom sheet: "View Profile", "Block User"

Block flow: `supabase.from('user_blocks').insert(...)` + `apiClient.post('/api/v1/safety/block', { blocked_user_id })` → navigate back to Messages list + `invalidateQueries(['matches', 'conversations'])`.

### Components

- `src/screens/chat/ChatScreen.tsx`
- `src/components/chat/ChatHeader.tsx` — back + avatar + name + verified badge + online indicator
- `src/components/chat/MessageBubble.tsx` — `direction: 'in' | 'out'`; incoming: lavender bg + avatar; outgoing: purple gradient
- `src/components/chat/DateSeparator.tsx` — "Today" / "Yesterday" / date chip
- `src/components/chat/MessageInput.tsx` — + icon, text input, emoji icon, send button
- `src/components/chat/DeliveryStatus.tsx` — tick icons: single gray = sent, double purple = read
- `src/components/chat/BlockReportSheet.tsx` — bottom sheet options (reuse for profile screen too)

### i18n Keys

```json
{
  "chat": {
    "typeMessage": "Type a message...",
    "onlineNow": "Online now",
    "lastSeen": "Last seen {{time}}",
    "today": "Today",
    "yesterday": "Yesterday",
    "sent": "Sent",
    "delivered": "Delivered",
    "read": "Read",
    "messageFailed": "Message failed. Tap to retry.",
    "messageRemoved": "This message was removed.",
    "reportMessage": "Report this message",
    "blockUser": "Block User",
    "viewProfile": "View Profile"
  }
}
```

### Do NOT

- Do not write messages to Supabase directly — always via Spring Boot `POST /api/v1/messages`.
- Do not show call icon or three-dot menu in the header.
- Do not silently drop failed messages — show retry affordance.
- Do not crash when a `REJECTED_FLAGGED` UPDATE event arrives — remove the message gracefully.
- Do not use `ScrollView` for the message list — use `FlatList` with `inverted` prop for performance.

---

## Screen 9 — Other User Profile Screen

**Design:** `docs/screen_designs/profile-screen-design-other-users.png`
**Route:** `src/app/(app)/profile/[userId].tsx` → `src/screens/profile/OtherUserProfileScreen.tsx`
**Folder:** `src/screens/profile/`

### Visual Description

**Top** (photo area, ~40% of screen height): full-width swipeable photo carousel. White circular back button (top-left). White circular three-dot more button (top-right — triggers block/report sheet). Photo dot indicators centered at the bottom of the photo area. **Below** (white card, rounded top, overlaps photo bottom by ~20px): "Name Age" large bold + blue verified badge. Location pin + "City, Country". Bio text (2–4 lines). Divider. **Profile detail rows**: each row is icon + label (above, small muted) + value (below, bold). Two-column grid layout for most fields. Full-width single-column for Address. Fields shown: Address, Gender, Date of Birth, Height (cm), Residency Type, Ethnicity, Nationality, Religion, Education Level, Occupation, Relationship Intention, Marital Status, Has Children, Wants Children, Smoking, Drinking.

### Data Layer — Direct Supabase (RLS-gated)

```ts
// src/api/profile/profileApi.ts
async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      user_id, display_name, gender, date_of_birth, bio, height_cm,
      residency_type, ethnicity, nationality, religion, education_level,
      occupation, relationship_intention, marital_status, has_children,
      wants_children, smoking, drinking, is_verified,
      addresses(country_name, city, region, formatted_address),
      profile_photos(image_url, is_primary, photo_order, moderation_status)
    `)
    .eq('user_id', userId)
    .eq('is_visible', true)
    .eq('is_onboarded', true)
    .single();
  if (error) throw error;
  // Only show APPROVED photos
  data.profile_photos = data.profile_photos
    .filter((p: any) => p.moderation_status === 'APPROVED')
    .sort((a: any, b: any) => a.photo_order - b.photo_order);
  return data;
}
```

**Distance**: if navigating from a discovery card, pass `distanceKm` as a route param (`router.push({ pathname: '/(app)/profile/[userId]', params: { userId, distanceKm } })`). If navigating from likes/matches, distance param will be absent — hide the distance row.

**Block user:**
```ts
// 1. Direct Supabase
await supabase.from('user_blocks').insert({ blocker_user_id: currentUserId, blocked_user_id: userId });
// 2. Spring Boot (unmatch side-effect + audit_log)
await apiClient.post('/api/v1/safety/block', { blocked_user_id: userId });
// 3. Navigate back, invalidate
router.back();
queryClient.invalidateQueries({ queryKey: ['matches'] });
queryClient.invalidateQueries({ queryKey: ['conversations'] });
```

**Report user:**
```ts
await supabase.from('user_reports').insert({
  reporter_user_id: currentUserId,
  reported_user_id: userId,
  report_type: selectedReason,
  description: optionalDescription ?? null,
});
```

### Hooks

- `src/hooks/profile/useOtherUserProfile.ts` — `useQuery({ queryKey: ['profile', userId], queryFn: () => profileApi.getUserProfile(userId) })`
- `src/hooks/profile/useBlockUser.ts` — mutation wrapping block flow above
- `src/hooks/profile/useReportUser.ts` — mutation wrapping report insert

### Components

- `src/screens/profile/OtherUserProfileScreen.tsx`
- `src/components/profile/ProfilePhotoCarousel.tsx` — swipeable full-width photo stack with dot indicator
- `src/components/profile/ProfileInfoHeader.tsx` — name, age, verified badge, location, bio
- `src/components/profile/ProfileDetailGrid.tsx` — 2-column grid of labeled field rows
- `src/components/profile/ProfileDetailRow.tsx` — icon + label + value row (reused in Edit Profile too)
- `src/components/profile/BlockReportSheet.tsx` — bottom sheet: View Profile / Block / Report with reasons

Report reasons: Fake profile, Inappropriate photos, Spam, Harassment, Underage, Other.

### i18n Keys

```json
{
  "otherProfile": {
    "blockUser": "Block User",
    "reportUser": "Report User",
    "blockConfirmTitle": "Block {{name}}?",
    "blockConfirmBody": "They won't be able to see your profile or message you.",
    "blockConfirm": "Block",
    "cancel": "Cancel",
    "reportTitle": "Why are you reporting this profile?",
    "reportReasons": {
      "fake": "Fake profile",
      "inappropriate": "Inappropriate photos",
      "spam": "Spam",
      "harassment": "Harassment",
      "underage": "Underage",
      "other": "Other"
    },
    "reportSubmitted": "Report submitted. Thank you.",
    "moreOptions": "More options"
  }
}
```

### Do NOT

- Do not show `PENDING` or `REJECTED` photos — only `APPROVED`.
- Do not show Edit Profile button — this screen is for other users only.
- Do not omit the Spring Boot call after blocking — it handles the unmatch side-effect.

---

## Screen 10 — My Profile Screen (Current User)

**Design:** `docs/screen_designs/profile-screen-design-logged-user.png`
**Route:** `src/app/(app)/(tabs)/profile.tsx` → `src/screens/profile/MyProfileScreen.tsx`
**Folder:** `src/screens/profile/`

### Visual Description

**Top** (photo area): full-width swipeable photo carousel of own photos (show ALL own photos including PENDING moderation — the user should see their own uploads). No back button (it's a tab). Top-right: white circular settings gear icon → navigate to Settings screen (future). Photo dots centered at bottom of photo area. **Below** (white card, rounded top, overlapping photo): "Name Age" bold + blue verified badge. Inline right: purple outline **"✏ Edit Profile"** button. Second button: **"📷 Manage Photos"** button (outline). Location + address below. Bio. Divider. **Status badges row** (4 items): "Visible • Everyone", "Onboarded • Completed", "Verified • Identity", "Profile completion XX%" with circular progress ring. **Profile detail grid**: same 2-column layout as other user profile — shows all fields. Bottom: custom tab bar with Profile tab active (person icon + purple underline).

### Data Layer — Direct Supabase (own row)

```ts
// src/api/profile/myProfileApi.ts
async function getMyProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      user_id, display_name, gender, date_of_birth, bio, height_cm,
      residency_type, ethnicity, nationality, religion, education_level,
      occupation, relationship_intention, marital_status, has_children,
      wants_children, smoking, drinking, is_verified, is_visible,
      is_onboarded, profile_completion_score,
      addresses(country_name, city, region, formatted_address),
      profile_photos(id, image_url, is_primary, photo_order, moderation_status, storage_path)
    `)
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  return data;
}
```

Show ALL own photos regardless of moderation status (own photos, own row). Photos sorted by `photo_order`.

### Status Badges Row

Four status items displayed as a horizontal row of small badge cards:

| Badge | Value | Color |
|---|---|---|
| Visible | `is_visible ? 'Everyone' : 'Hidden'` | Green dot if visible |
| Onboarded | `is_onboarded ? 'Completed' : 'Pending'` | Green dot if completed |
| Verified | `is_verified ? 'Identity' : 'Not verified'` | Blue dot if verified |
| Profile completion | `profile_completion_score + '%'` | Circular ring progress in purple |

`is_onboarded` and `is_verified` are **read-only** — do not render them as editable toggles. Show as status badges only.

### Navigation

- "Edit Profile" button → `router.push('/(app)/edit-profile')`
- "Manage Photos" button → `router.push('/(app)/edit-profile')` with initial tab set to `'photos'` (pass as param)
- Settings gear → `router.push('/(app)/settings')` (future screen, create placeholder)

### Hooks

- `src/hooks/profile/useMyProfile.ts` — `useQuery({ queryKey: ['myProfile'], queryFn: () => myProfileApi.getMyProfile(userId) })`

### Components

- `src/screens/profile/MyProfileScreen.tsx`
- `src/components/profile/ProfilePhotoCarousel.tsx` — reused from Screen 9 (own photos, all statuses shown)
- `src/components/profile/ProfileStatusBadges.tsx` — 4-badge row with visible/onboarded/verified/completion
- `src/components/profile/ProfileCompletionRing.tsx` — circular SVG or `react-native-svg` progress ring
- Reuse `ProfileInfoHeader`, `ProfileDetailGrid`, `ProfileDetailRow` from Screen 9

### i18n Keys

```json
{
  "myProfile": {
    "editProfile": "Edit Profile",
    "managePhotos": "Manage Photos",
    "visible": "Visible",
    "everyone": "Everyone",
    "hidden": "Hidden",
    "onboarded": "Onboarded",
    "completed": "Completed",
    "pending": "Pending",
    "verified": "Verified",
    "notVerified": "Not verified",
    "profileCompletion": "Profile completion",
    "settings": "Settings"
  }
}
```

### Do NOT

- Do not hide own pending/rejected photos — show all own photos in My Profile.
- Do not show `is_onboarded` or `is_verified` as editable toggles — read-only status only.
- Do not implement settings screen functionality now — just create a placeholder `src/app/(app)/settings.tsx`.

---

## Screen 11 — Edit Profile Screen

**Designs:** `docs/screen_designs/edit-profile-screen-design-basic-tab.png`, `docs/screen_designs/edit-profile-screen-design-photos-tab.png`, `docs/screen_designs/edit-profile-screen-design-preferences-tab.png`
**Route:** `src/app/(app)/edit-profile.tsx` → `src/screens/editProfile/EditProfileScreen.tsx`
**Folder:** `src/screens/editProfile/`

### Visual Description

**Top header**: back arrow (left), "Edit Profile" title (center bold), "Save" text button in purple (right — saves the active tab's data). **Below header**: thin multi-segment purple progress bar showing overall `profile_completion_score`. "Profile completion: 85%" label. **Tab bar**: 5 horizontal icon+label tabs — Basics, Personal, Lifestyle, Preferences, Photos. Active tab: purple icon + purple underline. Each tab scrolls independently.

**Bottom of each tab** (except Preferences and Photos): shared **Account Status** section — "Onboarded: Onboarding completed" with green "Completed" badge + "Verified identity: Your identity has been verified" with blue "Verified" badge + lock note "These information are read only and cannot be changed." Both fields are non-interactive display-only rows.

Accept an initial tab from route params (`params.initialTab: 'basics' | 'personal' | 'lifestyle' | 'preferences' | 'photos'`) — used by "Manage Photos" shortcut from My Profile.

### Tab Architecture

Active tab in local `useState`. Each tab has its own `react-hook-form` instance initialized with current profile data. "Save" in the header saves only the currently active tab's form. On successful save, `queryClient.invalidateQueries({ queryKey: ['myProfile'] })`.

---

### Tab 1 — Basics

**Design:** `docs/screen_designs/edit-profile-screen-design-basic-tab.png`

Fields layout (from design):

**Basic Information section:**
- Display name (text input, full width)
- Gender (dropdown: Male / Female — locked after onboarding, show lock icon + tooltip)
- Date of birth (date display, read-only — cannot change after onboarding, show lock)
- Height (cm) (text input with pencil icon)
- Residency type (dropdown: Ethiopia / Eritrea / Diaspora)
- Address (dropdown showing city, country)

**About You section:**
- Bio (multiline textarea, max 500 chars, counter shown as `XX/500`)
- Ethnicity (dropdown)
- Nationality (dropdown)
- Religion (dropdown)
- Education level (dropdown)
- Occupation (text input with briefcase icon)
- Relationship intention (dropdown with heart icon)
- Marital status (dropdown)
- Do you have children? (dropdown: Yes / No)
- Do you want children? (dropdown: Yes / No)

**Lifestyle section (within Basics tab per design):**
- Smoking (dropdown: No / Socially / Yes)
- Drinking (dropdown: No / Socially / Yes)

**Account Status (read-only):** Onboarded + Verified badges at the bottom.

**Save (Basics tab):**
```ts
await supabase.from('profiles').update({
  display_name, height_cm, residency_type, bio, ethnicity, nationality,
  religion, education_level, occupation, relationship_intention,
  marital_status, has_children, wants_children, smoking, drinking,
}).eq('user_id', userId);
```

Note: `gender` and `date_of_birth` are **never updated after onboarding** — render them as locked read-only fields with a lock icon.

Zod schema for Basics tab:
```ts
const basicsSchema = z.object({
  displayName: z.string().min(2).max(50),
  heightCm: z.coerce.number().min(100).max(250).optional().nullable(),
  residencyType: z.enum(['ETHIOPIA', 'ERITREA', 'DIASPORA']),
  bio: z.string().max(500).optional().nullable(),
  ethnicity: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  religion: z.string().optional().nullable(),
  educationLevel: z.string().optional().nullable(),
  occupation: z.string().max(100).optional().nullable(),
  relationshipIntention: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  hasChildren: z.boolean(),
  wantsChildren: z.boolean().optional().nullable(),
  smoking: z.boolean(),
  drinking: z.boolean(),
});
```

---

### Tab 2 — Personal

Same fields as Basics "About You" split into a dedicated tab for extended personal details not covered in Basics. In v1, Personal tab can mirror the Basics About You section for any overflow fields. If all fields are covered in Basics, show a compact re-display of key personal fields (DOB, ethnicity, nationality, religion) in read-only format with a note "Edit these in the Basics tab."

---

### Tab 3 — Lifestyle

Dedicated lifestyle fields with the same pill-toggle UI as Onboarding Step 3:
- Smoking: No | Socially | Yes
- Drinking: No | Socially | Yes
- Has children: No | Yes
- Wants children: No | Yes

**Save (Lifestyle tab):**
```ts
await supabase.from('profiles').update({ smoking, drinking, has_children, wants_children }).eq('user_id', userId);
```

---

### Tab 4 — Preferences

**Design:** `docs/screen_designs/edit-profile-screen-design-preferences-tab.png`

Title: "Discovery Preferences". Subtitle: "Control who you see and how discovery works."

Fields (from design):

**Discovery mode**: segmented control — Standard | Global | Incognito.
- Standard: "Standard mode shows you people near you."
- Global: ignores distance.
- Incognito: hidden from others' feeds.

**Interested in**: segmented control — Male | Female | All. (Note: in v1 MVP this is locked to opposite of gender. Display the locked value with a note. The field exists in the schema as `interested_in_gender` but same-gender is not supported.)

**Preferred residency types**: multi-select checkboxes — 🇪🇹 Ethiopia | 🇪🇷 Eritrea | 🌐 Diaspora. Each toggleable independently, at least one must remain selected.

**Age range**: dual-handle range slider. Min age input box (left) | slider track | Max age input box (right). Range: 18–80.

**Maximum distance**: single-handle slider with labels at 5km, 25km, 50km, 100km, 250km+. Current value shown in purple top-right ("50 km").

**Toggle rows**:
- "Open to long-distance" — toggle switch
- "Open to relocation" — toggle switch
- "Show verified profiles only" — toggle switch + note "Only show people with a blue check."

**Two full-width buttons**: "Save Preferences" (purple gradient) + "Reset" (purple outline).

**Save (Preferences tab):**
```ts
// Direct Supabase — own row
await supabase.from('discovery_preferences').update({
  discovery_mode: discoveryMode,
  preferred_residency_types: preferredResidencyTypes,
  interested_in_gender: interestedInGender,
  min_age: minAge,
  max_age: maxAge,
  max_distance_km: maxDistanceKm,
  open_to_long_distance: openToLongDistance,
  open_to_relocation: openToRelocation,
  show_verified_only: showVerifiedOnly,
}).eq('user_id', userId);
```

After saving preferences, invalidate `['discovery']` query to refresh the deck with new filters.

**Reset**: restore all preference fields to defaults (STANDARD, all residency types, 18–35, 50km, all toggles false) and call save.

Data fetch: `supabase.from('discovery_preferences').select('*').eq('user_id', userId).single()`.

**No "Account Status" section** at the bottom of this tab.

---

### Tab 5 — Photos

**Design:** `docs/screen_designs/edit-profile-screen-design-photos-tab.png`

Title: "Manage Photos". Subtitle: "Reorder your photos by dragging and choose a primary photo." Top-right hint: "ⓘ Drag to reorder".

**Photo grid layout**:
- Primary photo: large (left, 2x height of secondary). Shows "Primary" badge (purple pill bottom-left). Shows pencil icon (top-right of cell) to replace. Caption below: "This is your primary photo. It will be shown first on your profile."
- Other existing photos: smaller grid cells (3-column for non-primary). Each shows three-dot icon (top-right) for options: "Set as primary" / "Delete".
- Empty slots: dashed border + purple "+" icon + "Add photo" label.

Max 6 photos total.

**Reorder**: drag-and-drop to reorder. On reorder completion, update `photo_order` for all affected photos:
```ts
// Batch update photo_order for all photos
await Promise.all(reorderedPhotos.map((photo, index) =>
  supabase.from('profile_photos').update({ photo_order: index, is_primary: index === 0 })
    .eq('id', photo.id).eq('user_id', userId)
));
```

**Set as primary**: update the selected photo to `is_primary = true`, update previous primary to `is_primary = false`. The `unique_primary_photo_per_user` partial unique index enforces single primary at DB level — update in a transaction-safe order (set old to false, then set new to true).

**Add photo**: calls `uploadProfilePhoto(userId, nextOrder, false)` from `src/services/storage/uploadProfilePhoto.ts`.

**Delete photo**: delete the `profile_photos` row + delete from Supabase Storage:
```ts
await supabase.from('profile_photos').delete().eq('id', photoId).eq('user_id', userId);
await supabase.storage.from('profile-photos').remove([storagePath]);
```
Guard: do not allow deleting the last photo if it's the only one.

**Photo tips card**: "Use clear, well-lit photos that show your face. Avoid group photos as your primary photo."

**Account Status section** (same as Basics tab, at the bottom): Onboarded + Verified read-only rows.

**No separate "Save" needed for photo operations** — each action (upload, delete, reorder, set primary) saves immediately. The header "Save" button does nothing on the Photos tab (or show it disabled).

---

### Hooks

- `src/hooks/profile/useMyProfile.ts` — query: fetch current profile + address
- `src/hooks/profile/useUpdateProfile.ts` — mutation: Supabase profile UPDATE (Basics/Personal/Lifestyle tabs)
- `src/hooks/preferences/useDiscoveryPreferences.ts` — query: fetch discovery_preferences
- `src/hooks/preferences/useUpdateDiscoveryPreferences.ts` — mutation: Supabase discovery_preferences UPDATE
- `src/hooks/profile/useProfilePhotos.ts` — query: fetch profile_photos sorted by photo_order
- `src/hooks/profile/useUploadPhoto.ts` — mutation: upload + insert profile_photos row
- `src/hooks/profile/useDeletePhoto.ts` — mutation: delete profile_photos row + storage object
- `src/hooks/profile/useReorderPhotos.ts` — mutation: batch update photo_order

### Components

- `src/screens/editProfile/EditProfileScreen.tsx`
- `src/components/editProfile/EditProfileTabBar.tsx` — 5-tab icon+label bar with active state
- `src/components/editProfile/BasicsTab.tsx`
- `src/components/editProfile/PersonalTab.tsx`
- `src/components/editProfile/LifestyleTab.tsx`
- `src/components/editProfile/PreferencesTab.tsx`
- `src/components/editProfile/PhotosTab.tsx`
- `src/components/editProfile/AccountStatusSection.tsx` — read-only Onboarded + Verified rows (reused across tabs)
- `src/components/editProfile/ResidencyMultiSelect.tsx` — Ethiopia / Eritrea / Diaspora checkboxes
- `src/components/editProfile/AgeRangeSlider.tsx` — dual-handle slider
- `src/components/editProfile/DistanceSlider.tsx` — single-handle slider with labels
- `src/components/editProfile/PhotoGrid.tsx` — draggable photo grid with primary card + add slots
- `src/components/forms/DropdownField.tsx` — reusable labeled dropdown (shared with onboarding)
- `src/components/forms/ToggleRow.tsx` — label + toggle switch row

### i18n Keys

```json
{
  "editProfile": {
    "title": "Edit Profile",
    "save": "Save",
    "saved": "Saved!",
    "tabs": {
      "basics": "Basics",
      "personal": "Personal",
      "lifestyle": "Lifestyle",
      "preferences": "Preferences",
      "photos": "Photos"
    },
    "profileCompletion": "Profile completion: {{score}}%",
    "basics": {
      "basicInfo": "Basic Information",
      "aboutYou": "About You",
      "lifestyle": "Lifestyle",
      "displayName": "Display name",
      "gender": "Gender",
      "dateOfBirth": "Date of birth",
      "heightCm": "Height (cm)",
      "residencyType": "Residency type",
      "address": "Address",
      "bio": "Bio",
      "bioPlaceholder": "Tell others about yourself...",
      "ethnicity": "Ethnicity",
      "nationality": "Nationality",
      "religion": "Religion",
      "educationLevel": "Education level",
      "occupation": "Occupation",
      "relationshipIntention": "Relationship intention",
      "maritalStatus": "Marital status",
      "hasChildren": "Do you have children?",
      "wantsChildren": "Do you want children?",
      "smoking": "Smoking",
      "drinking": "Drinking",
      "locationNote": "Your location helps us show you closer matches.",
      "genderLocked": "Gender cannot be changed after onboarding.",
      "dobLocked": "Date of birth cannot be changed."
    },
    "preferences": {
      "title": "Discovery Preferences",
      "subtitle": "Control who you see and how discovery works.",
      "discoveryMode": "Discovery mode",
      "standard": "Standard",
      "global": "Global",
      "incognito": "Incognito",
      "standardNote": "Standard mode shows you people near you.",
      "interestedIn": "Interested in",
      "preferredResidency": "Preferred residency types",
      "selectAllApply": "Select all that apply",
      "ageRange": "Age range",
      "minAge": "Min age",
      "maxAge": "Max age",
      "maxDistance": "Maximum distance",
      "openToLongDistance": "Open to long-distance",
      "openToRelocation": "Open to relocation",
      "showVerifiedOnly": "Show verified profiles only",
      "showVerifiedNote": "Only show people with a blue check.",
      "savePreferences": "Save Preferences",
      "reset": "Reset"
    },
    "photos": {
      "title": "Manage Photos",
      "subtitle": "Reorder your photos by dragging and choose a primary photo.",
      "dragToReorder": "Drag to reorder",
      "primary": "Primary",
      "primaryNote": "This is your primary photo. It will be shown first on your profile.",
      "addPhoto": "Add photo",
      "setPrimary": "Set as primary",
      "deletePhoto": "Delete photo",
      "photoTip": "Use clear, well-lit photos that show your face. Avoid group photos as your primary photo.",
      "cannotDeleteLast": "You must keep at least one photo."
    },
    "accountStatus": {
      "title": "Account Status",
      "onboarded": "Onboarded",
      "onboardedNote": "Onboarding completed",
      "verified": "Verified identity",
      "verifiedNote": "Your identity has been verified",
      "readOnlyNote": "These information are read only and cannot be changed.",
      "completedBadge": "Completed",
      "verifiedBadge": "Verified"
    }
  }
}
```

### Do NOT

- Do not make `gender` or `date_of_birth` editable after onboarding — lock them with a visual lock icon.
- Do not make `is_onboarded` or `is_verified` editable anywhere — read-only display only.
- Do not save all tabs at once — each "Save" applies only to the currently active tab.
- Do not allow deleting the last remaining photo.
- Do not allow saving preferences with zero `preferredResidencyTypes` selected — require at least one.
- Do not mix "Personal" tab content with Basics — keep them as separate tab components even if Personal mirrors some fields.
- For photo delete: always delete from both the `profile_photos` table AND Supabase Storage — do not leave orphaned storage objects.

---

## Appendix — Shared Components Summary

These components are referenced across multiple screens. Create them once and reuse:

| Component | Used By |
|---|---|
| `src/components/ui/GradientButton.tsx` | Auth, Onboarding, Discovery, Edit Profile |
| `src/components/common/VerifiedBadge.tsx` | Discovery, Likes, Matches, Profile, Chat |
| `src/components/common/ProfileGridCard.tsx` | Likes, Matches |
| `src/components/common/ProfileGrid.tsx` | Likes, Matches |
| `src/components/common/OnlineDot.tsx` | Messages List, Chat |
| `src/components/profile/ProfilePhotoCarousel.tsx` | Other User Profile, My Profile |
| `src/components/profile/ProfileDetailRow.tsx` | Other User Profile, My Profile, Edit Profile |
| `src/components/profile/ProfileDetailGrid.tsx` | Other User Profile, My Profile |
| `src/components/profile/BlockReportSheet.tsx` | Other User Profile, Chat |
| `src/components/layout/AppTabBar.tsx` | All tab screens (Discovery, Matches, Messages, Likes, Profile) |
| `src/components/animations/FloatingHeart.tsx` | Splash, Auth, Onboarding |
| `src/components/animations/PulsingDots.tsx` | Splash |
| `src/components/forms/DropdownField.tsx` | Onboarding, Edit Profile |
| `src/components/forms/ToggleRow.tsx` | Edit Profile Preferences, Lifestyle |
| `<ScreenLoader>`, `<EmptyState>`, `<GenericErrorState>`, `<NetworkErrorState>` | All data-dependent screens |

## Appendix — Icon Reference

**NO `@expo/vector-icons` installed.** Use Unicode/emoji characters for all icons:

| Purpose | Character |
|---|---|
| Location pin | 📍 or ◎ |
| Settings gear | ⚙ |
| Heart | ♥ or ❤ |
| Verified checkmark | ✓ or ✔ |
| Back arrow | ← |
| Send arrow | → or ➤ |
| Plus / Add | + |
| Pencil / Edit | ✏ |
| Camera / Photos | 📷 |
| Lock | 🔒 |
| Home | ⌂ |
| Person / Profile | 👤 |
| Chat bubble | 💬 |
| Rewind | ↺ |
| Pass / Close | ✕ |
| Online dot | ● (green color) |
| Star / Sparkle | ✦ or ✧ |

For more complex icons (tab bar, action buttons, verified badge), use `react-native-svg` with inline SVG paths or simple geometric `View` shapes styled with `borderRadius` and `backgroundColor`.
