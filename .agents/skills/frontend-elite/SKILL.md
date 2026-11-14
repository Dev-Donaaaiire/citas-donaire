---
name: frontend-elite
description: Unbreakable UI/UX design laws and component craftsmanship standards for high-converting, elite-tier interfaces (Linear, Vercel, Raycast, Stripe level).
---

# Elite Frontend Craftsmanship & UI/UX Design System Laws

This document outlines the non-negotiable frontend architecture, aesthetic guidelines, and interaction standards for all components created in this project. The objective is to produce visual and interactive excellence comparable to Linear, Vercel, Raycast, and Stripe.

---

## 1. Absolute Aesthetic Laws

### 1.1. Color & Lighting
- **STRICTLY PROHIBITED**: Generic AI gradients (e.g., cliché indigo-purple-fuchsia transitions, neon violet glow on dark cards).
- **Approved Palette**: Neutral dark / light foundations using monochromatic scales (zinc, slate, or stone).
  - Dark mode: True darks (`#09090b`, `#0c0c0e`, `#121214`), rich zinc bases with high contrast foregrounds (`#ededed`, `#fafafa`), and subtle muted accents (`#71717a`, `#a1a1aa`).
  - Light mode: Clean paper whites (`#ffffff`, `#fafafa`), pure dark typography (`#09090b`), and neutral borders.
- **Accent Philosophy**: Single-point intentional accents (e.g., emerald green for success/active states, precision orange or electric amber for notifications, pure white glow for primary CTAs).

### 1.2. Typography & Hierarchy
- **Typefaces**: Modern, geometric grotesk fonts: `Geist Sans`, `Inter`, or `Plus Jakarta Sans`. Monospace with `Geist Mono` or `JetBrains Mono` for tabular metrics and timestamps.
- **Headings**: Always utilize `tracking-tight` or `tracking-tighter` on headings (`h1`-`h3`), paired with `font-semibold` or `font-medium`. Avoid muddy bold weights.
- **Body & Captions**: Crisp line-heights (`leading-relaxed`), medium/high contrast (`text-foreground` or `text-zinc-900` / `dark:text-zinc-100`). Secondary metadata must use `text-zinc-500` or `dark:text-zinc-400`.
- **Spacing**: Generous whitespace. Never crowd components; let typography and negative space guide user attention.

### 1.3. Borders, Glassmorphism & Surfaces
- **Borders**: Ultra-subtle, razor-sharp hairline borders:
  - Dark Mode: `border border-white/10` or `border-zinc-800/60`.
  - Light Mode: `border border-zinc-200/80` or `border-black/[0.08]`.
- **Surfaces**: Layered depth using `backdrop-blur-md` or `backdrop-blur-xl`, with translucent backgrounds (`bg-zinc-900/60`, `bg-white/70`).
- **Shadows**: Multi-layered diffused shadows (ambient glow + directional shadow) rather than flat murky box-shadows. E.g., `shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_20px_-4px_rgba(0,0,0,0.5)]`.

---

## 2. Micro-Interactions & Animation (Framer Motion)

### 2.1. Dynamic Feedback
- Every button, card, input, and interactive surface must have:
  - Smooth hover states (`hover:bg-zinc-800/80`, `hover:border-white/20`).
  - Tactile active/press states (`active:scale-[0.98]` or `active:scale-[0.97]`).
  - Focus rings that adhere to accessibility standards without default ugly outlines (`focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none`).

### 2.2. Motion Guidelines
- **Framer Motion**:
  - Entrances: Staggered spring animations for lists, booking grids, and cards.
  - Curves: Use physics-based springs (`type: "spring", stiffness: 350, damping: 28`) or cubic-bezier eases (`ease: [0.16, 1, 0.3, 1]`). Avoid linear or generic ease-in-out.
- **Skeletons & Transitions**:
  - Skeleton screens with subtle shimmer effects while fetching data.
  - Theme switching must be zero-flash (SSG / SSR hydration safe, no flash of unstyled content).

---

## 3. Mobile-First & Instagram In-App Browser Conversion

### 3.1. Thumb-Zone Geometry
- Primary traffic originates from social channels (Instagram, TikTok, WhatsApp on mobile).
- Touch Targets: Minimum tap target size of **48px x 48px** for all primary touch elements (calendar day pills, appointment time slots, confirmation buttons).
- Fixed Bottom Bars: Sticky high-contrast action bars within thumb reach for single-tap bookings.
- In-App Browser Resilience:
  - Account for dynamic viewport height units (`100dvh` / `h-dvh` instead of fixed `100vh`) to prevent address bar shifting.
  - Prevent accidental text selection and bounce-scroll collisions on interactive elements (`touch-manipulation`, `select-none`).

### 3.2. Appointment & Calendar Experience
- Calendars must render horizontal scroller pills for days/dates on mobile with quick day snap, followed by vertical hour pills.
- Selected state must have instant visual feedback, clear check indicator, and smooth container expansion.

---

## 4. Stack Standards & Best Practices

- Framework: Next.js (App Router), React 19 / 18, TypeScript (Strict).
- Styling: Tailwind CSS v4 / v3, `clsx`, `tailwind-merge` (encapsulated in `cn()` utility).
- Components: `shadcn/ui` primitives built on top of Radix UI.
- Icons: `lucide-react` (stroke-width: 1.5px or 1.75px for elegance).
- State: URL search params for booking steps / date selection to preserve state across shares and refreshes.
