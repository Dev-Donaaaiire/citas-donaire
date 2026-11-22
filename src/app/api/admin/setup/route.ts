import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin-auth'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { getAdminSetupData } from '@/lib/data/admin-setup'
import { sanitizeTimeZone } from '@/lib/timezone'
import { normalizeFormFields, type FormCustomizationSettings } from '@/lib/form-field-rules'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET() {
  try {
    const auth = await requireAdminSession()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const payload = await getAdminSetupData()
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (err) {
    if (err && typeof err === 'object' && 'digest' in err) {
      throw err
    }
    console.error('[api/admin/setup][GET] Error:', err)
    return NextResponse.json(
      { error: 'Error al diagnosticar el estado del proyecto.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminSession()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const db = getSupabaseAdmin()
    const body = (await request.json().catch(() => ({}))) as {
      settingsId?: string | null
      nombreNegocio?: string
      emailNotificaciones?: string | null
      direccion?: string | null
      telefonoContacto?: string | null
      timezone?: string | null
      horarioApertura?: string
      horarioCierre?: string
      duracionCitaMinutos?: number
      diasLaborables?: number[]
      temaActivo?: 'dark_luxury' | 'clean_minimal' | 'neon_creator'
      modoDemo?: boolean
      camposFormulario?: FormCustomizationSettings
      services?: Array<{
        id?: string
        nombre: string
        duracion_minutos: number
        precio: number
        activo?: boolean
        orden?: number
      }>
    }

    const nombreNegocio = body.nombreNegocio?.trim() || 'Mi Negocio'
    const emailNotificaciones = body.emailNotificaciones?.trim() || null
    const direccion = body.direccion?.trim() || null
    const telefonoContacto = body.telefonoContacto?.trim() || null
    const timezone = sanitizeTimeZone(body.timezone)
    const horarioApertura = body.horarioApertura?.trim() || '09:00'
    const horarioCierre = body.horarioCierre?.trim() || '20:00'
    const duracionCitaMinutos = Math.max(
      10,
      Number(body.duracionCitaMinutos || 30)
    )
    const diasLaborables =
      Array.isArray(body.diasLaborables) && body.diasLaborables.length > 0
        ? body.diasLaborables
        : [1, 2, 3, 4, 5, 6]
    const temaActivo: 'dark_luxury' | 'clean_minimal' | 'neon_creator' =
      body.temaActivo === 'clean_minimal' || body.temaActivo === 'neon_creator'
        ? body.temaActivo
        : 'dark_luxury'
    const modoDemo = Boolean(body.modoDemo)
    const camposFormulario = normalizeFormFields(body.camposFormulario)

    const validServices = (Array.isArray(body.services) ? body.services : [])
      .map((s) => ({
        id: s.id && UUID_REGEX.test(s.id) ? s.id : undefined,
        nombre: String(s.nombre || '').trim(),
        duracion_minutos: Math.max(5, Number(s.duracion_minutos || 30)),
        precio: Math.max(0, Number(s.precio || 0)),
      }))
      .filter((s) => s.nombre.length > 0)

    if (validServices.length === 0) {
      return NextResponse.json(
        { error: 'Añade al menos un servicio activo con nombre válido.' },
        { status: 400 }
      )
    }

    // 1. Upsert business_settings
    const settingsPayload: Record<string, unknown> = {
      nombre_negocio: nombreNegocio,
      email_notificaciones: emailNotificaciones,
      direccion,
      telefono_contacto: telefonoContacto,
      timezone,
      horario_apertura: horarioApertura,
      horario_cierre: horarioCierre,
      duracion_cita_minutos: duracionCitaMinutos,
      dias_laborables: diasLaborables,
      tema_activo: temaActivo,
      modo_demo: modoDemo,
      campos_formulario: camposFormulario,
    }

    let savedSettingsId =
      body.settingsId && UUID_REGEX.test(body.settingsId) ? body.settingsId : null

    if (!savedSettingsId) {
      const { data: existingSettings } = await db
        .from('business_settings')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      savedSettingsId = existingSettings?.id ?? null
    }

    if (savedSettingsId) {
      let { error: updateErr } = await db
        .from('business_settings')
        .update(settingsPayload as any)
        .eq('id', savedSettingsId)

      // Fallback si la columna campos_formulario aún no existe en alguna base de datos legada
      if (updateErr && updateErr.message?.includes('campos_formulario')) {
        const fallbackPayload = { ...settingsPayload }
        delete fallbackPayload.campos_formulario
        const fallbackRes = await db
          .from('business_settings')
          .update(fallbackPayload as any)
          .eq('id', savedSettingsId)
        updateErr = fallbackRes.error
      }

      if (updateErr) {
        throw new Error(updateErr.message)
      }
    } else {
      let { data: created, error: insertErr } = await db
        .from('business_settings')
        .insert(settingsPayload as any)
        .select('id')
        .single()

      if (insertErr && insertErr.message?.includes('campos_formulario')) {
        const fallbackPayload = { ...settingsPayload }
        delete fallbackPayload.campos_formulario
        const fallbackRes = await db
          .from('business_settings')
          .insert(fallbackPayload as any)
          .select('id')
          .single()
        created = fallbackRes.data
        insertErr = fallbackRes.error
      }

      if (insertErr || !created) {
        throw new Error(insertErr?.message || 'Error al crear la configuración inicial')
      }
      savedSettingsId = created.id
    }

    // 2. Sincronizar servicios y desactivar (activo: false) los que existían en BD pero el usuario quitó
    const { data: existingServices } = await db
      .from('services')
      .select('id')

    const submittedIds = new Set(
      validServices
        .map((s) => s.id)
        .filter((id): id is string => Boolean(id))
    )

    const removedIds = (existingServices ?? [])
      .map((row) => row.id)
      .filter((id) => !submittedIds.has(id))

    if (removedIds.length > 0) {
      const { error: deactivateErr } = await db
        .from('services')
        .update({ activo: false })
        .in('id', removedIds)

      if (deactivateErr) {
        throw new Error(
          `No se pudieron desactivar los servicios eliminados: ${deactivateErr.message}`
        )
      }
    }

    for (let i = 0; i < validServices.length; i += 1) {
      const srv = validServices[i]
      if (srv.id) {
        const { error: srvUpdateErr } = await db
          .from('services')
          .update({
            nombre: srv.nombre,
            duracion_minutos: srv.duracion_minutos,
            precio: srv.precio,
            activo: true,
            orden: i + 1,
          })
          .eq('id', srv.id)

        if (srvUpdateErr) throw new Error(srvUpdateErr.message)
      } else {
        const { error: srvInsertErr } = await db.from('services').insert({
          nombre: srv.nombre,
          duracion_minutos: srv.duracion_minutos,
          precio: srv.precio,
          activo: true,
          orden: i + 1,
        })

        if (srvInsertErr) throw new Error(srvInsertErr.message)
      }
    }

    const { data: finalServices } = await db
      .from('services')
      .select('*')
      .eq('activo', true)
      .order('orden', { ascending: true })

    return NextResponse.json({
      success: true,
      settingsId: savedSettingsId,
      services: finalServices ?? [],
    })
  } catch (err) {
    console.error('[api/admin/setup][POST] Error:', err)
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'No se pudo guardar la configuración inicial.',
      },
      { status: 500 }
    )
  }
}
