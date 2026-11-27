// La integración Supabase de Vercel usa nombres nuevos (publishable / secret);
// las instalaciones manuales, los clásicos (anon / service_role). Se aceptan ambos.
// Las NEXT_PUBLIC_* se leen literalmente para que Next pueda incrustarlas.

export function supabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    undefined
  )
}

export function supabaseServiceKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    undefined
  )
}
