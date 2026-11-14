/** Enlaces de checkout (Stripe Payment Links, etc.). Configúralos en .env.local */
export const CHECKOUT_URL_AUTOINSTALABLE =
  process.env.NEXT_PUBLIC_CHECKOUT_URL_15 ?? '#precios'
export const CHECKOUT_URL_LLAVE_EN_MANO =
  process.env.NEXT_PUBLIC_CHECKOUT_URL_99 ?? '#precios'
