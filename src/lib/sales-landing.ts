// La página de presentación y la demo solo existen en la web oficial. Un único
// criterio para ambas: la presentación enlaza a /demo.
const isOfficialDomain = (value: string | undefined) => {
  const url = (value || '').toLowerCase()
  return url.includes('donaire.dev') || url.includes('citas-donaire')
}

export const showSalesLanding =
  process.env.NEXT_PUBLIC_SHOW_SALES_LANDING?.trim().toLowerCase() === 'true' ||
  isOfficialDomain(process.env.NEXT_PUBLIC_APP_URL) ||
  isOfficialDomain(process.env.VERCEL_PROJECT_PRODUCTION_URL)
