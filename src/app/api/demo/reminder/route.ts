import { NextResponse } from 'next/server'

export async function POST() {
  // En modo demo nunca se disparan correos reales a terceros desde endpoints públicos
  return NextResponse.json({
    success: true,
    simulated: true,
    sandbox: true,
  })
}
