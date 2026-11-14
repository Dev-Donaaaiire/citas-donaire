# META2027 - Frontend Architecture & Elite Guidelines

> **System Roles**: Systems Engineer & Staff Frontend Architect  
> **Benchmark Standards**: Linear, Vercel, Raycast, Stripe design systems.

---

## 1. Environment & MCP Configuration
- **Supabase MCP**: Defined in `mcp_config.json` and `~/.gemini/config/mcp_config.json` using `@supabase/mcp-server-supabase`.
- **Vercel MCP**: Defined in `mcp_config.json` using `@vercel/mcp-adapter` and `vercel` CLI.
- **Tokens required**:
  - `SUPABASE_ACCESS_TOKEN`: In `mcp_config.json` or run `npx supabase login`
  - `VERCEL_TOKEN`: In `mcp_config.json` or run `npx vercel login`

---

## 2. Inviolable UI/UX Engineering Laws

1. **NO GENERIC AI GRADIENTS**:
   - Cliché purple-to-blue / neon violet/cyan gradients are strictly forbidden.
   - Use clean monochromatic zinc/slate backgrounds with crisp foreground contrast and subtle single-point accent highlights.

2. **Typography & Hierarchy**:
   - Modern grotesk typefaces (`Geist Sans`, `Inter`, `Plus Jakarta Sans`).
   - `tracking-tight` on headlines (`h1` through `h3`) with generous spacing and high contrast.
   - Monospace (`Geist Mono`) for numerical metrics, tabular figures, and timestamps.

3. **Hairline Borders, Glassmorphism & Diffused Surfaces**:
   - Dark mode: `border-white/10`, `bg-zinc-900/60`, `backdrop-blur-md`.
   - Light mode: `border-zinc-200/80`, `bg-white/80`, `backdrop-blur-md`.
   - Multi-layer soft ambient shadows (`shadow-sm`, `shadow-md` with low alpha).

4. **Tactile Micro-Interactions & Framer Motion**:
   - Every interactive component (buttons, cards, slots) must define `hover`, `active:scale-[0.98]`, and focus states.
   - Physics-based spring animations for page transitions and staggered reveals.
   - Zero-flicker theme switches and elegant skeleton loading states.

5. **Instagram Mobile-First Ergonomics**:
   - Built for viral Instagram / mobile webview traffic.
   - High-priority thumb touch targets (`≥ 48px x 48px`).
   - Use dynamic viewport units (`100dvh` / `h-dvh`).
   - Sticky conversion / appointment booking bar within natural thumb reach.
