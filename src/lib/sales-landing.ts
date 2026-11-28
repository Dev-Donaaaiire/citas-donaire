// La landing de venta y la demo solo existen en la web del vendedor. Un único
// criterio para ambas: la landing enlaza a /demo.
const isSellerDomain = (value: string | undefined) => {
  const url = (value || '').toLowerCase()
  return url.includes('donaire.dev') || url.includes('citas-donaire')
}

export const showSalesLanding =
  process.env.NEXT_PUBLIC_SHOW_SALES_LANDING?.trim().toLowerCase() === 'true' ||
  isSellerDomain(process.env.NEXT_PUBLIC_APP_URL) ||
  isSellerDomain(process.env.VERCEL_PROJECT_PRODUCTION_URL)
