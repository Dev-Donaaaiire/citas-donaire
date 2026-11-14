---
description: Elite Frontend Craftsmanship Rules (Linear, Vercel, Stripe design quality)
always_on: true
---

# Elite Frontend UI/UX Inviolable Laws

When authoring or modifying any UI component or page:

1. **NO Generic AI Gradients**:
   - Never use cliché purple-to-blue or neon violet/cyan gradients.
   - Rely on refined monochromatic zinc tones with single-point intentional contrast.

2. **Typography & Layout**:
   - Modern grotesk typography (`Geist`, `Inter`, `Plus Jakarta Sans`).
   - Use `tracking-tight` on headlines, with high contrast (`text-zinc-900` / `dark:text-zinc-100`).
   - Generous, breathable layout spacing.

3. **Subtle Hairline Surfaces**:
   - Dark mode: `border-white/10`, `bg-zinc-900/60`, `backdrop-blur-md`.
   - Light mode: `border-zinc-200/80`, `bg-white/80`, `backdrop-blur-md`.
   - Sophisticated multi-layered diffused shadows.

4. **Micro-Interactions & Framer Motion**:
   - Interactive elements must implement `hover`, `active:scale-[0.98]` tactile transitions.
   - Smooth staggered page entrances with Framer Motion springs.
   - Zero-flicker theme hydration and elegant skeleton state fallbacks.

5. **Instagram Mobile-First Ergonomics**:
   - Target mobile viewport height: `100dvh`.
   - Minimum touch target: `48px x 48px`.
   - Thumb-friendly bottom action bars for appointment booking and conversion.
