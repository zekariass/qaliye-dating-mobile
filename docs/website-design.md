# Qaliye Dating App — Informational Website Specification

> Version 1.0 · July 2026 · Draft for dev/design hand-off

## 1. Website Purpose & Scope

The Qaliye website is **informational only** — not the dating platform. Goals:

- Showcase app features and explain how Qaliye works
- Build trust through transparency about safety, privacy, cultural alignment
- Drive downloads to App Store and Play Store
- Provide support and legal info

**NOT included:** login, signup, matchmaking, swiping, profile browsing, chat, user data access, or any authenticated API calls.

**Target audience:** Ethiopian/Eritrean singles 18+ (domestic + diaspora), family members researching, social media referrals verifying legitimacy.

---

## 2. Full Website Structure

| Route | Page | Purpose |
|-------|------|---------|
| `/` | Home | Hero, features, screenshots, download CTAs |
| `/about` | About | Mission, audience, unique value |
| `/features` | Features | Detailed feature breakdown |
| `/help` | Help/Support | FAQ, troubleshooting, in-app support link |
| `/contact` | Contact | Form, email, social links |
| `/privacy` | Privacy Policy | Full privacy policy (legal review required) |
| `/terms` | Terms & Conditions | Full terms (legal review required) |

### Home Page Sections

1. **Hero** — gradient bg (`#FFF6FB`→`#F7EEFF`→`#EFE7FF`), headline "Where hearts connect", subheadline, App Store + Play Store buttons, phone mockup
2. **Trust bar** — verified profiles, privacy first, 4 languages, culturally aligned
3. **Feature highlights** — 3–6 cards linking to `/features`
4. **How it works** — 4 steps: create profile → discover → match & chat → connect
5. **Screenshots** — 3–5 phone mockups (Discovery, Match, Chat, Profile, Premium)
6. **Download CTA** — full-width gradient `#8A2CFF`→`#5B18D6`, store buttons, optional QR
7. **Footer** — brand, page links, legal links, social media, language switcher, copyright

### Footer Links

- Pages: About, Features, Help, Contact
- Legal: Privacy Policy, Terms & Conditions
- Social: Instagram, Telegram, TikTok, X/Twitter
- Language: EN / አማ / ትግ / Orom
- Bottom: © 2026 Qaliye. Made with ❤️ for the Horn of Africa

---

## 3. Feature Analysis & Description

### Core Features

**Smart Discovery & Matching** — Card-based swipe (Like/Super Like/Pass). Feed personalized by preferences. Mutual likes create matches. *Benefit: find compatible people without endless scrolling.*

**Detailed Profiles** — Photos, bio, interests, attributes (gender, age, height, residency, ethnicity, nationality, religion, education, occupation, relationship intention, marital status, children, lifestyle). Photos moderated before appearing. *Benefit: informed decisions based on values and culture.*

**Preferences & Filters** — Interested in (men/women), age range, max distance, preferred residency (Ethiopia/Eritrea/Diaspora), verified-only, discovery mode (Standard/Global/Incognito). *Benefit: see only relevant profiles.*

**Location-Based Discovery** — GPS proximity with manual city search fallback. Regional filters: Nearby, Ethiopia, Eritrea, Diaspora, Anywhere. *Benefit: find people near you or across the diaspora.*

**Real-Time Chat** — Text, images (up to 5/msg, 25 MB max), voice messages with recording/preview/playback. *Benefit: communicate naturally and expressively.*

**Matches & Likes** — Dedicated matches screen. Likes screen (premium to see who liked you). *Benefit: never lose track of connections.*

### Safety & Privacy

**Profile Verification** — Verified badge, verified-only filter. *Benefit: confidence you're talking to a real person.*

**Photo Moderation** — Automated + manual review. Status shown (pending/approved/under review). *Benefit: cleaner, safer community.*

**Block & Report** — Block hides all contact. Report goes to moderation team. *Benefit: control your safety.*

**Incognito Mode (Premium)** — Browse without appearing in others' discovery. *Benefit: privacy and discretion.*

**Data Security** — TLS encryption, secure token storage, Supabase row-level security. *Benefit: industry-standard protection.*

**Account Deletion** — Permanent deletion from Settings, all data removed. *Benefit: full control, no lock-in.*

### Premium Features

**See Who Liked You** — Full list of profiles that liked you. *Benefit: save time, connect directly.*

**Advanced Filters** — Extra filters (education, religion, lifestyle). *Benefit: fine-tune discovery.*

**Unlimited Likes** — No daily cap. *Benefit: never wait to express interest.*

**Super Likes** — Stand out with special notification. *Benefit: increase match chances.*

**Boost** — 30-min increased visibility. *Benefit: be seen by more matches.*

**Rewind** — Undo last swipe. *Benefit: never accidentally pass.*

**Voice & Image Chat Quotas** — Higher message quotas. *Benefit: express fully without limits.*

### Additional Features

**4 Languages** — English, Amharic, Tigrinya, Afaan Oromo. *Benefit: use in your preferred language.*

**Push Notifications** — Real-time, granular per-category control. *Benefit: never miss a connection.*

**In-App Support** — Direct chat with staff, text + images. *Benefit: help without leaving the app.*

**Promotions** — Free premium campaigns (women, holidays, launch). *Benefit: try premium free.*

**Local Payments** — Android: Telebirr, bank transfer, Chapa, manual receipt. iOS: App Store. *Benefit: pay your way, no credit card needed.*

---

## 4. Internationalization (i18n)

### Supported Languages

| Code | Language | Native | Script | Direction |
|------|----------|--------|--------|-----------|
| `en` | English | English | Latin | LTR |
| `am` | Amharic | አማርኛ | Ge'ez | LTR |
| `ti` | Tigrinya | ትግርኛ | Ge'ez | LTR |
| `om` | Afaan Oromo | Afaan Oromoo | Latin | LTR |

**No RTL required** — all 4 languages are LTR. Load Noto Sans Ethiopic for Ge'ez rendering.

### Language Switcher

- **Desktop:** Top-right nav bar, globe icon + dropdown
- **Mobile:** First item in hamburger menu
- **Footer:** Compact code pills (EN / አማ / ትግ / Orom)
- **Persistence:** `localStorage` + URL prefix (`/am/features`)
- **Default:** Browser language detection → English fallback
- **No reload:** Instant text update via i18n framework

### Translation File Structure

```
/i18n/locales/{en,am,ti,om}.json
/i18n/config.ts
```

**en.json example:**
```json
{
  "site": { "name": "Qaliye", "tagline": "Where hearts connect" },
  "nav": { "home": "Home", "about": "About", "features": "Features", "help": "Help", "contact": "Contact" },
  "hero": {
    "headline": "Where hearts connect",
    "subheadline": "Qaliye is the dating app for Ethiopian and Eritrean singles...",
    "downloadIOS": "Download on the App Store",
    "downloadAndroid": "Get it on Google Play"
  },
  "features": {
    "discovery": { "title": "Smart Discovery & Matching", "description": "...", "benefit": "..." }
  },
  "footer": { "rights": "All rights reserved.", "madeWith": "Made with ❤️ for the Horn of Africa" }
}
```

**am.json example (partial):**
```json
{
  "site": { "name": "ቃልዬ", "tagline": "ልቦች የሚገናኙበት" },
  "nav": { "home": "መነሻ", "about": "ስለ እኛ", "features": "ባህሪያት", "help": "እገዛ", "contact": "አግኙን" }
}
```

Use `next-intl` (Next.js) or `react-i18next`. ICU MessageFormat for plurals. English fallback for missing keys.

---

## 5. Theme & Branding Requirements

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| primary | `#8A2CFF` | Buttons, links, accents |
| primaryDark | `#5B18D6` | Hover, gradient end |
| primaryLight | `#B777FF` | Light accents, badges |
| secondary | `#FF4FA3` | Heart icon, romantic accents |
| background | `#FFF6FB` | Page background |
| backgroundSoft | `#F7EEFF` | Section backgrounds |
| backgroundLavender | `#EFE7FF` | Alt sections |
| surface | `#FFFFFF` | Cards |
| textPrimary | `#111827` | Body, headings |
| textSecondary | `#6B7280` | Captions |
| textMuted | `#9CA3AF` | Placeholders |
| border | `#E9DDF8` | Dividers |
| success | `#22C55E` | Success states |
| danger | `#EF4444` | Error states |
| warning | `#F59E0B` | Warning states |
| verifiedBlue | `#2F80ED` | Verified badge |

### Gradients

- **Primary:** `#A020F0` → `#6D35FF` (CTA sections, buttons)
- **Romantic:** `#FF4FA3` → `#8A2CFF` (hero accents)
- **Splash:** `#FFF6FB` → `#F7EEFF` → `#EFE7FF` (hero background)

### Typography

- **Family:** System UI + Noto Sans Ethiopic (critical for Ge'ez)
- **Sizes:** xs 12 · sm 14 · base 16 · md 18 · lg 22 · xl 28 · 2xl 36 · 3xl 48px
- **Weights:** 400 body, 500 medium, 600 buttons, 700/800 headings
- **Line height:** 1.5 body, 1.2 headings

### Spacing & Radius

- **Spacing:** xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48 · xxxl 64px
- **Radius:** sm 10 · md 16 · lg 24 · xl 32 · full 999px
- **Max width:** 800px content, 1200px full sections
- **Shadows:** Purple-tinted (`#8A2CFF`, low opacity)

### Imagery Style

- Ethiopian/Eritrean cultural relevance: traditional clothing, coffee ceremonies, Addis/Asmara scenes
- Diverse, authentic, joyful people — avoid stock clichés
- Warm, soft, lavender-tinted color treatment
- Ionicons or Lucide icon set
- Device frame mockups for screenshots
- Avoid: sexualized imagery, generic dating tropes, non-Horn-of-Africa references

### Responsive Design

- **Mobile-first:** 375px base
- **Breakpoints:** sm 640 · md 768 · lg 1024 · xl 1280px
- **Nav:** Hamburger below md, horizontal at md+
- **Grid:** 1-col mobile, 2-col md, 3-col lg
- **Touch targets:** min 44×44px
- **Images:** `srcset`, `loading="lazy"` below fold

### Dark Mode (Phase 2)

App supports dark mode. Website may follow. Reference: bg `#0D0712`, surface `#1A1230`, text `#F3EEFF`, border `#2E1F50`.

---

## 6. Download Conversion Optimization

### Store Button Placement

| Location | Style |
|----------|-------|
| Hero | Centered below subheadline |
| After How It Works | Centered |
| After screenshots | Full-width gradient CTA band |
| Footer | Compact badges in brand column |
| About page bottom | Inline CTA |

### Store URLs

- **App Store:** `https://apps.apple.com/app/id6741631870`
- **Google Play:** `https://play.google.com/store/apps/details?id=com.qaliye.app`

### Repeated CTA Strategy

- Minimum 3 download CTA sections on home page (hero, mid-page, bottom band)
- CTA on About and Features pages
- Sticky bottom bar on mobile with compact store buttons (dismissable)

### Screenshots & Mockups

- 3–5 screenshots in iPhone and Android device frames
- Show: Discovery swipe card, Match overlay, Chat conversation, Profile detail, Premium paywall
- Carousel with swipe/tap navigation on mobile
- Lazy load below-fold images

### QR Code (Optional)

- Generate QR code linking to a smart redirect URL that detects iOS/Android and routes to correct store
- Place in footer and bottom CTA section

---

## 7. Technical Specification

### Recommended Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **Next.js 14+ (App Router)** | SSR/SSG, SEO, i18n routing, image optimization |
| Styling | **Tailwind CSS** | Matches app's NativeWind, shared design tokens |
| i18n | **next-intl** | Built-in Next.js i18n, URL-based routing |
| Icons | **lucide-react** | Lightweight, matches app icon style |
| Analytics | **Plausible** or **GA4** | Privacy-friendly, download tracking |
| Contact form | **Resend** / **Formspree** | No backend needed, email forwarding |

**Alternative:** Expo Web (the app already has `web.output: "static"`), but Next.js is recommended for SEO and i18n routing superiority.

### Routing Structure

```
/app
  /[locale]
    /page.tsx              → Home
    /about/page.tsx        → About
    /features/page.tsx     → Features
    /help/page.tsx         → Help
    /contact/page.tsx      → Contact
    /privacy/page.tsx      → Privacy Policy
    /terms/page.tsx        → Terms & Conditions
  /api
    /contact/route.ts      → Contact form handler (optional)
```

- URL pattern: `qaliye.app/en/features`, `qaliye.app/am/features`
- Default redirect: `/` → `/en` (or detected locale)
- Generate static params for all 4 locales at build time

### SEO Requirements

**Meta tags (per page):**
- `<title>` — page-specific, under 60 chars
- `<meta name="description">` — under 160 chars
- `<link rel="canonical">` — per locale
- `<html lang>` — set per locale

**OpenGraph:**
- `og:title`, `og:description`, `og:image` (1200×630px), `og:url`, `og:type`
- `og:locale` — per language

**Twitter Card:**
- `twitter:card: summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`

**Structured Data (JSON-LD):**
- `SoftwareApplication` schema: name, description, operatingSystem, applicationCategory, offers, aggregateRating
- `FAQPage` schema on Help page
- `BreadcrumbList` on all pages
- `Organization` on footer/home

**Sitemap:** `sitemap.xml` with all locale variants  
**robots.txt:** Allow all, reference sitemap

### Performance Requirements

| Metric | Target |
|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s |
| FID/INP (Interaction) | < 200ms |
| CLS (Cumulative Layout Shift) | < 0.1 |
| Lighthouse score | 90+ all categories |
| Bundle size (JS) | < 200 KB gzipped |
| Images | WebP/AVIF, responsive `srcset` |
| Fonts | `font-display: swap`, preload Noto Sans Ethiopic |

- Use Next.js `Image` component for automatic optimization
- Static generation (SSG) for all pages — no server rendering needed
- Minimize client-side JS — mostly static content

### Accessibility (WCAG 2.1 AA)

- Semantic HTML: proper heading hierarchy (h1→h2→h3), landmarks (nav, main, footer)
- All images have `alt` text
- Color contrast: minimum 4.5:1 for body text, 3:1 for large text
- Focus visible: purple outline on all interactive elements
- Keyboard navigable: tab order follows visual order
- ARIA labels for icon-only buttons (language switcher, social links)
- Form labels associated with inputs
- Skip-to-content link at top of each page
- Respect `prefers-reduced-motion` — disable animations
- Ge'ez script: ensure minimum 16px font size for readability

---

## 8. Content Guidelines

### Tone

- **Trustworthy:** Honest, transparent, no exaggeration
- **Culturally aligned:** Respect Ethiopian/Eritrean values, family-oriented framing
- **Modern:** Clean, confident, contemporary language
- **Respectful:** Inclusive, never objectifying, never pressuring

### Messaging Principles

- Lead with connection and meaning, not casual dating
- Emphasize safety, verification, and moderation prominently
- Be clear about what the app does and doesn't do
- Use "meaningful connections" over "hookups" or "casual dating"
- Reference cultural values: family, community, faith, heritage

### Privacy & Safety Messaging

- State clearly: "Your data is encrypted and never sold to third parties"
- Highlight verification and photo moderation as core, not optional
- Explain account deletion is available and permanent
- Avoid: "100% safe" or "guaranteed match" — use "designed for safety" and "meaningful connections"

### Prohibited Claims

- ❌ "Guaranteed matches" or "Find your soulmate"
- ❌ "100% safe" or "Completely risk-free"
- ❌ "Millions of users" (unless true and verified)
- ❌ Comparisons putting down other apps
- ❌ Promises about specific outcomes (marriage, relationship)

### Content Per Language

- All 4 languages must have **complete translations** — no partial locale
- Translations reviewed by native speakers (not machine translation alone)
- Cultural nuances: Amharic and Tigrinya may use more formal/respectful register
- Afaan Oromo uses Latin script — ensure consistent spelling standard
- English serves as fallback for any missing keys

### Legal Pages

- Privacy Policy and Terms must be **reviewed by legal counsel** before publication
- Clearly state 18+ requirement
- Include data retention and deletion policy
- Reference applicable laws (Ethiopian law if primary market)

