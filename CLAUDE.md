# META2027 - Frontend Architecture & Design Guidelines

## Project Standards & Philosophy
- **Aesthetic Benchmark**: Linear, Vercel, Raycast, Stripe.
- **Tech Stack**: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion, Lucide React, Supabase, Vercel.

## Inviolable UI/UX Laws
1. **Forbidden Patterns**: Generic AI purple/blue gradients are banned. Use monochromatic zinc/slate palettes with surgical single-color accent highlights.
2. **Typography**: Use Geist Sans / Inter with `tracking-tight` on headings. Ensure high contrast and ample white space.
3. **Surfaces & Borders**: Razor-thin hairline borders (`border-white/10` in dark mode, `border-zinc-200/80` in light mode) + subtle blur (`backdrop-blur-md`).
4. **Tactile Micro-Interactions**: All clickable surfaces must provide active states (`active:scale-[0.98]`), hover transitions, and physics-based Framer Motion springs.
5. **Mobile-First (Instagram Conversion)**:
   - Optimized for mobile viewports using `100dvh`.
   - Large touch targets (≥ 48px) for quick thumb navigation.
   - Sticky bottom conversion bar for booking appointments.

## MCP Integrations
- Supabase MCP: configured in `mcp_config.json` / `~/.gemini/config/mcp_config.json` via `@supabase/mcp-server-supabase`.
- Vercel MCP: configured in `mcp_config.json` via `@vercel/mcp-adapter` and `vercel` CLI.
