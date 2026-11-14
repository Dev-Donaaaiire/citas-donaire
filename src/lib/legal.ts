/**
 * Contenido legal (España) compartido por /legal y el modal previo al pago.
 * IMPORTANTE: completa los datos del titular en LEGAL_OWNER (o vía variables
 * NEXT_PUBLIC_LEGAL_*) antes de salir a producción.
 */

export const LEGAL_OWNER = {
  name: process.env.NEXT_PUBLIC_LEGAL_NAME || '[NOMBRE Y APELLIDOS / RAZÓN SOCIAL]',
  nif: process.env.NEXT_PUBLIC_LEGAL_NIF || '[NIF/CIF]',
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || '[DOMICILIO COMPLETO, ESPAÑA]',
  email: process.env.NEXT_PUBLIC_LEGAL_EMAIL || '[EMAIL DE CONTACTO]',
  product: 'Krono / Donaire Citas',
}

export const LEGAL_LAST_UPDATE = '15 de noviembre de 2026'

export interface LegalSection {
  heading: string
  paragraphs: string[]
}

export interface LegalDoc {
  id: 'licencia' | 'aviso-legal' | 'privacidad'
  title: string
  short: string
  sections: LegalSection[]
}

const o = LEGAL_OWNER

export const LEGAL_DOCS: LegalDoc[] = [
  {
    id: 'licencia',
    title: 'Términos de Licencia de Software',
    short: 'Licencia',
    sections: [
      {
        heading: '1. Objeto y partes',
        paragraphs: [
          `Los presentes términos regulan la licencia de uso del software «${o.product}» (en adelante, el «Software») que ${o.name}, con NIF ${o.nif} y domicilio en ${o.address} (en adelante, el «Proveedor»), concede a la persona que completa la compra (en adelante, el «Comprador»).`,
          'Planes disponibles: (i) «Código Autoinstalable», 14,99 € (pago único); (ii) «Llave en Mano», 99 € (pago único), que añade un servicio de configuración inicial a cargo del Proveedor. Precios con los impuestos aplicables incluidos cuando proceda.',
        ],
      },
      {
        heading: '2. Licencia concedida',
        paragraphs: [
          'El Proveedor concede al Comprador una licencia personal, no exclusiva, intransferible y de duración indefinida para instalar y utilizar el Software en el negocio del Comprador, asociada a la clave de licencia (formato DONAIRE-XXXX-XXXX-2027) entregada tras el pago.',
          'El Comprador puede modificar el código fuente para uso propio. No está permitido revender, sublicenciar, redistribuir o publicar el Software ni la clave de licencia, ni ofrecerlo como producto o servicio propio a terceros sin autorización escrita del Proveedor.',
          'La licencia puede vincularse al primer dominio de producción en el que se despliegue. El Proveedor podrá desactivar claves usadas fuera de estos términos, cuando se hayan reembolsado o cuando se detecte un uso fraudulento.',
        ],
      },
      {
        heading: '3. Acceso previo a la Demo Interactiva en Vivo',
        paragraphs: [
          'El Comprador declara que, antes de contratar, ha tenido acceso libre, gratuito e ilimitado a la Demo Interactiva en Vivo (rutas /demo y /demo/admin), con los tres diseños disponibles (Dark Luxury, Clean Minimal y Neon Creator), la vista de cliente y el panel del dueño, y que ha podido verificar por sí mismo sus funciones, alcance y limitaciones antes de realizar el pago.',
        ],
      },
      {
        heading: '4. Entrega inmediata y renuncia al derecho de desistimiento',
        paragraphs: [
          'Al tratarse de un suministro de contenido digital que no se presta en un soporte material, cuya licencia se entrega de forma inmediata tras el pago, el Comprador consiente expresamente que la ejecución del contrato comience en ese momento y reconoce que, en consecuencia, pierde su derecho de desistimiento, conforme al artículo 103.m) del Real Decreto Legislativo 1/2007, de 16 de noviembre, por el que se aprueba el texto refundido de la Ley General para la Defensa de los Consumidores y Usuarios (TRLGDCU).',
          'Esta aceptación se recaba mediante casilla específica, no premarcada, antes de acceder al pago, y el Proveedor la confirmará al Comprador en el correo de entrega de la licencia.',
          'En el plan «Llave en Mano», el servicio de configuración se ejecuta a petición expresa del Comprador y la entrega de la licencia y del código se realiza igualmente de forma inmediata.',
        ],
      },
      {
        heading: '5. Entrega «tal cual» (as-is) y soporte',
        paragraphs: [
          'El Software se entrega «tal cual» (as-is), en el estado mostrado en la Demo Interactiva en Vivo, sin garantías adicionales de adecuación a un fin particular distintas de las legalmente irrenunciables.',
          'Cualquier soporte, asistencia o corrección queda anulado si el Comprador o un tercero modifica el código fuente, la estructura de la base de datos o la configuración original. El soporte, cuando proceda, se limita a la puesta en marcha del Software sin modificar.',
          'El funcionamiento depende de servicios de terceros contratados por el Comprador (Supabase, Vercel, Resend, Stripe u otros). El Proveedor no responde de sus cambios, cortes, límites de uso o tarifas.',
        ],
      },
      {
        heading: '6. Limitación de responsabilidad',
        paragraphs: [
          'En la máxima medida permitida por la ley, la responsabilidad total y acumulada del Proveedor frente al Comprador por cualquier causa relacionada con el Software queda limitada al importe efectivamente abonado por la licencia (14,99 € en el plan Autoinstalable; 99 € en el plan Llave en Mano).',
          'El Proveedor no responderá de lucro cesante, pérdida de citas, clientes, datos o reputación, ni de daños indirectos derivados del uso o imposibilidad de uso del Software, ni de un uso del Software contrario a la normativa (incluida la protección de datos de los clientes finales del Comprador).',
          'Nada de lo aquí dispuesto limita la responsabilidad que no pueda excluirse legalmente (dolo, negligencia grave, daños personales) ni los derechos irrenunciables que la normativa de consumidores reconozca al Comprador, en particular los relativos a la conformidad del contenido digital.',
        ],
      },
      {
        heading: '7. Obligaciones del Comprador',
        paragraphs: [
          'El Comprador es responsable de custodiar su clave de licencia y sus credenciales, de contar con base legal para tratar los datos de sus propios clientes (será el responsable del tratamiento de los mismos) y de cumplir la normativa aplicable a su actividad.',
        ],
      },
      {
        heading: '8. Ley aplicable y jurisdicción',
        paragraphs: [
          'Este contrato se rige por la legislación española. Si el Comprador tiene la condición de consumidor, serán competentes los juzgados y tribunales de su domicilio. Plataforma europea de resolución de litigios en línea: https://ec.europa.eu/consumers/odr.',
        ],
      },
    ],
  },
  {
    id: 'aviso-legal',
    title: 'Aviso Legal',
    short: 'Aviso Legal',
    sections: [
      {
        heading: '1. Datos identificativos (Ley 34/2002, LSSI-CE)',
        paragraphs: [
          `Titular: ${o.name} · NIF: ${o.nif} · Domicilio: ${o.address} · Email: ${o.email}.`,
        ],
      },
      {
        heading: '2. Condiciones de uso del sitio web',
        paragraphs: [
          'El acceso y uso de este sitio atribuye la condición de usuario e implica la aceptación de este Aviso Legal. El usuario se compromete a hacer un uso lícito del sitio y de la Demo Interactiva, sin dañar su funcionamiento ni introducir datos de terceros sin su consentimiento. Los datos de la Demo pueden restaurarse periódicamente.',
        ],
      },
      {
        heading: '3. Propiedad intelectual e industrial',
        paragraphs: [
          'Los textos, diseños, código, marcas y demás contenidos del sitio y del Software son titularidad del Proveedor o de sus licenciantes y están protegidos por la normativa de propiedad intelectual. Su uso queda limitado a lo previsto en los Términos de Licencia.',
        ],
      },
      {
        heading: '4. Exclusión de responsabilidad y enlaces',
        paragraphs: [
          'El Proveedor no garantiza la disponibilidad continuada del sitio ni se responsabiliza de los contenidos de sitios de terceros enlazados. Las capturas y descripciones tienen carácter informativo; la Demo Interactiva en Vivo es la referencia de funcionamiento.',
        ],
      },
      {
        heading: '5. Legislación aplicable',
        paragraphs: [
          'Legislación española. Para consumidores, fuero de su domicilio; para empresas, juzgados y tribunales del domicilio del Proveedor.',
        ],
      },
    ],
  },
  {
    id: 'privacidad',
    title: 'Política de Privacidad',
    short: 'Privacidad',
    sections: [
      {
        heading: '1. Responsable del tratamiento',
        paragraphs: [
          `${o.name} (NIF ${o.nif}), ${o.address}. Contacto de privacidad: ${o.email}. Tratamos tus datos conforme al Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD).`,
        ],
      },
      {
        heading: '2. Datos, finalidades y base jurídica',
        paragraphs: [
          'Compra: email, nombre y datos de facturación para gestionar el pedido, emitir la licencia y enviártela por correo (ejecución del contrato, art. 6.1.b RGPD) y cumplir obligaciones fiscales y contables (art. 6.1.c).',
          'Soporte y comunicaciones sobre tu licencia: atención de consultas (art. 6.1.b y 6.1.f). No enviamos comunicaciones comerciales sin tu consentimiento.',
          'Datos de pago: se procesan íntegramente por Stripe; el Proveedor no almacena números de tarjeta.',
        ],
      },
      {
        heading: '3. Destinatarios y encargados',
        paragraphs: [
          'Proveedores que acceden a datos para prestar el servicio: Stripe (pagos), Resend (envío de correo), Supabase (base de datos) y Vercel (alojamiento). Pueden implicar transferencias internacionales amparadas en cláusulas contractuales tipo o en el Marco de Privacidad de Datos UE-EE. UU. No cedemos datos a terceros salvo obligación legal.',
        ],
      },
      {
        heading: '4. Conservación',
        paragraphs: [
          'Conservamos los datos mientras dure la relación y, después, bloqueados durante los plazos legales de prescripción (con carácter general, hasta 6 años por obligaciones mercantiles y fiscales).',
        ],
      },
      {
        heading: '5. Derechos',
        paragraphs: [
          `Puedes ejercer los derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a ${o.email}, acreditando tu identidad. Si consideras vulnerados tus derechos, puedes reclamar ante la Agencia Española de Protección de Datos (www.aepd.es).`,
        ],
      },
      {
        heading: '6. Datos de los clientes finales del Comprador',
        paragraphs: [
          'Cuando el Comprador instala el Software en su propia infraestructura, él es el responsable del tratamiento de los datos de sus clientes (nombre, email, teléfono, citas) y debe informarles y contar con base legal. El Proveedor no accede a esas bases de datos, salvo en el plan «Llave en Mano» durante la configuración, actuando entonces como encargado del tratamiento por cuenta del Comprador.',
        ],
      },
      {
        heading: '7. Cookies',
        paragraphs: [
          'Este sitio solo utiliza almacenamiento local técnico (por ejemplo, para recordar el diseño elegido en la demo), exento de consentimiento. No utiliza cookies publicitarias ni de analítica de terceros.',
        ],
      },
    ],
  },
]

/** Textos de las casillas de aceptación previas al pago */
export const CHECKOUT_CONSENTS = [
  {
    id: 'demo',
    label:
      'Declaro que he tenido acceso libre e ilimitado a la Demo Interactiva en Vivo antes de comprar y que he podido verificar sus funciones.',
  },
  {
    id: 'terms',
    label:
      'He leído y acepto los Términos de Licencia (software entregado «tal cual», sin soporte si se modifica el código y con responsabilidad limitada al importe abonado), el Aviso Legal y la Política de Privacidad.',
  },
  {
    id: 'desistimiento',
    label:
      'Solicito la entrega inmediata de la licencia y consiento que, al tratarse de contenido digital, pierdo mi derecho de desistimiento (art. 103.m TRLGDCU).',
  },
] as const
