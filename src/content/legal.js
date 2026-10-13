// Términos y condiciones y Política de privacidad de Stockly.
//
// ESTADO: BORRADOR sin revisión legal. Mientras LEGAL_REVIEWED sea false, las páginas muestran un
// aviso visible. Antes de abrir el registro a personas reales:
//   1. Completar los datos de ENTITY (razón social, cédula jurídica, domicilio, correo, servidores).
//   2. Que un abogado revise el texto (Ley 8968 de protección de la persona frente al tratamiento
//      de sus datos personales, y la normativa de consumo aplicable).
//   3. Poner LEGAL_REVIEWED = true.
// Si el texto cambia, actualizar LEGAL_VERSION aquí y TERMS_VERSION en inventario-api/src/config/legal.ts.
//
// El documento vinculante está en español (idioma oficial de Costa Rica); se muestra igual con la
// interfaz en inglés.

export const LEGAL_VERSION = "2026-10-13"
export const LEGAL_REVIEWED = false

export const ENTITY = {
  name: "Stockly",
  legalName: "[PENDIENTE: razón social y cédula jurídica de quien opera Stockly]",
  address: "[PENDIENTE: domicilio, Costa Rica]",
  email: "[PENDIENTE: correo de contacto y de derechos sobre datos personales]",
  servers: "[PENDIENTE: país donde están los servidores]",
}

const P = ENTITY

export const LEGAL = {
  terms: {
    title: "Términos y condiciones de uso",
    intro:
      "Estos términos regulan el uso de Stockly, un servicio en línea para administrar inventario, compras y equipos de trabajo. Al crear una cuenta o usar el servicio, aceptas lo que aquí se indica.",
    sections: [
      {
        title: "1. Quién ofrece el servicio",
        paragraphs: [
          `Stockly es operado por ${P.legalName}, con domicilio en ${P.address}. Puedes escribirnos a ${P.email}.`,
        ],
      },
      {
        title: "2. Qué es Stockly",
        paragraphs: [
          "Stockly es una plataforma para que una empresa lleve su inventario: productos, existencias, movimientos, proveedores, solicitudes y órdenes de compra, reportes y auditoría de cambios. Cada empresa tiene su propio espacio, separado del de las demás.",
        ],
      },
      {
        title: "3. Cuentas y empresas",
        paragraphs: [
          "Para usar Stockly necesitas una cuenta. Al registrarte creas una empresa y quedas como su administrador y dueño. El administrador decide quién más entra a la empresa, con qué rol, y es responsable de las personas que invita.",
        ],
        items: [
          "Debes ser mayor de 18 años y tener capacidad para contratar.",
          "La información que ingreses al registrarte debe ser verdadera y estar actualizada.",
          "Eres responsable de la confidencialidad de tu contraseña y de lo que se haga con tu cuenta. Avísanos de inmediato si sospechas un uso no autorizado.",
          "Una misma cuenta puede pertenecer a varias empresas; en cada una tiene el rol que esa empresa le dio.",
        ],
      },
      {
        title: "4. Uso permitido",
        paragraphs: ["Te comprometes a usar el servicio de forma lícita. Queda prohibido:"],
        items: [
          "Intentar acceder a datos de otras empresas, o a cuentas que no son tuyas.",
          "Interferir con el funcionamiento del servicio, sobrecargarlo o probar su seguridad sin autorización escrita.",
          "Subir contenido ilícito o software malicioso.",
          "Revender o ceder el acceso al servicio sin nuestro consentimiento.",
        ],
      },
      {
        title: "5. Planes, límites y pagos",
        paragraphs: [
          "El servicio se ofrece en planes que limitan, por ejemplo, la cantidad de empresas, de usuarios por empresa y de productos. El plan de la cuenta dueña aplica a todas sus empresas.",
          "Las condiciones de precio, facturación y renovación de cada plan se informarán antes de contratarlo y forman parte de estos términos. Si llegas al límite de tu plan, no podrás agregar más hasta cambiarlo; tus datos existentes no se pierden.",
        ],
      },
      {
        title: "6. Suspensión y terminación",
        paragraphs: [
          "Podemos suspender una empresa, por ejemplo, por falta de pago o por incumplir estos términos. Mientras está suspendida, sus usuarios pueden iniciar sesión pero no usar los datos; no se borra nada y el acceso se restablece al regularizar la situación.",
          "Puedes dejar de usar el servicio cuando quieras. Al cerrar una cuenta o empresa, conservaremos los datos solo durante el plazo indicado en la Política de privacidad.",
        ],
      },
      {
        title: "7. Tus datos",
        paragraphs: [
          "Los datos de inventario y demás información que cargas en Stockly son tuyos. Nos autorizas a almacenarlos y procesarlos únicamente para prestarte el servicio. No los vendemos ni los usamos para publicidad.",
          "Eres responsable de la exactitud de lo que cargas y de contar con el derecho a tratar los datos personales de terceros que incluyas (por ejemplo, de tus empleados o proveedores). Puedes descargar tus reportes en cualquier momento.",
        ],
      },
      {
        title: "8. Asistente de inteligencia artificial",
        paragraphs: [
          "Stockly incluye un asistente que responde preguntas sobre tu inventario. Para responder, envía tu consulta y los datos de inventario necesarios a un proveedor externo de inteligencia artificial (ver la Política de privacidad). El asistente solo lee información: no crea, modifica ni elimina datos.",
          "Sus respuestas pueden contener errores. Verifica la información antes de tomar decisiones importantes.",
        ],
      },
      {
        title: "9. Disponibilidad y soporte",
        paragraphs: [
          "Nos esforzamos por mantener el servicio disponible, pero se ofrece \"tal cual\": puede haber interrupciones por mantenimiento, fallas o causas fuera de nuestro control. Procuramos avisar con anticipación de los mantenimientos programados.",
        ],
      },
      {
        title: "10. Limitación de responsabilidad",
        paragraphs: [
          "En la medida permitida por la ley, no respondemos por pérdidas indirectas, lucro cesante ni por decisiones comerciales tomadas con base en la información del sistema. Nuestra responsabilidad total frente a ti se limita a lo que hayas pagado por el servicio en los 12 meses anteriores al hecho que la genera.",
          "Nada de lo anterior limita derechos que la ley costarricense no permita limitar.",
        ],
      },
      {
        title: "11. Propiedad intelectual",
        paragraphs: [
          "El software, la marca y el diseño de Stockly son de su titular. Estos términos solo te dan un derecho de uso limitado, no exclusivo e intransferible mientras tengas una cuenta activa.",
        ],
      },
      {
        title: "12. Cambios a estos términos",
        paragraphs: [
          "Podemos actualizar estos términos. Si el cambio es importante, te avisaremos dentro del servicio o por correo, y la fecha de actualización de arriba cambiará. Seguir usando Stockly después del aviso implica aceptar la nueva versión.",
        ],
      },
      {
        title: "13. Ley aplicable y jurisdicción",
        paragraphs: [
          "Estos términos se rigen por las leyes de la República de Costa Rica. Las controversias se someterán a los tribunales competentes de San José, Costa Rica, sin perjuicio de los derechos que la ley otorgue al consumidor.",
        ],
      },
    ],
  },

  privacy: {
    title: "Política de privacidad y protección de datos personales",
    intro:
      "Esta política explica qué datos personales recopila Stockly, para qué los usa, con quién los comparte y cómo puedes ejercer tus derechos, conforme a la Ley N.º 8968, Protección de la Persona frente al tratamiento de sus datos personales, de Costa Rica.",
    sections: [
      {
        title: "1. Responsable del tratamiento",
        paragraphs: [
          `El responsable de la base de datos es ${P.legalName}, con domicilio en ${P.address}. Contacto para temas de datos personales: ${P.email}.`,
        ],
      },
      {
        title: "2. Qué datos recopilamos",
        items: [
          "Datos de cuenta: nombre, correo electrónico, teléfono y nombre de empresa (opcionales), contraseña (la guardamos cifrada, nunca en texto legible) y fotografía de perfil si decides subirla.",
          "Datos de la empresa: nombre, moneda, plan y las personas que pertenecen a ella con su rol.",
          "Datos de inventario que tú o tu equipo cargan: productos, existencias, costos, precios, movimientos, proveedores (incluido su correo y teléfono), solicitudes, órdenes de compra y comentarios.",
          "Registro de actividad: quién hizo qué cambio y cuándo (auditoría), y avisos dentro del sistema.",
          "Datos técnicos: dirección IP y datos del navegador, usados para la seguridad y para limitar intentos de acceso abusivos.",
          "Constancia de aceptación: la fecha y la versión de estos documentos que aceptaste.",
        ],
      },
      {
        title: "3. Para qué usamos tus datos",
        items: [
          "Crear y administrar tu cuenta, y prestarte el servicio contratado.",
          "Mantener la seguridad del sistema y prevenir accesos no autorizados.",
          "Enviar mensajes necesarios del servicio, como una orden de compra a un proveedor cuando tú lo solicitas, o invitaciones a tu equipo.",
          "Cumplir obligaciones legales y atender solicitudes de las autoridades competentes.",
          "Mejorar el funcionamiento de Stockly, sin identificarte personalmente.",
        ],
        paragraphs: ["No vendemos tus datos ni los usamos para publicidad."],
      },
      {
        title: "4. Consentimiento",
        paragraphs: [
          "Tratamos tus datos con tu consentimiento informado, que otorgas al crear tu cuenta y aceptar estos documentos, y porque son necesarios para prestarte el servicio. Puedes revocar tu consentimiento en cualquier momento; hacerlo puede implicar que no podamos seguir prestándote el servicio.",
        ],
      },
      {
        title: "5. Con quién compartimos los datos",
        paragraphs: [
          "Solo compartimos datos con proveedores que nos ayudan a operar Stockly, y únicamente lo necesario para su función:",
        ],
        items: [
          "Proveedores de infraestructura y hospedaje, donde se almacenan los datos.",
          "Proveedor de envío de correo (Resend), para las órdenes de compra a proveedores y las invitaciones.",
          "Proveedor de inteligencia artificial (Google, servicio Gemini), que recibe la consulta que escribes al asistente y los datos de inventario necesarios para responderla.",
          "Autoridades, cuando la ley lo exija.",
        ],
      },
      {
        title: "6. Transferencias fuera de Costa Rica",
        paragraphs: [
          `Algunos de estos proveedores pueden tratar los datos fuera de Costa Rica. Nuestros servidores están en: ${P.servers}. Al aceptar esta política consientes estas transferencias, que realizamos con proveedores que aplican medidas de seguridad adecuadas.`,
        ],
      },
      {
        title: "7. Cuánto tiempo conservamos los datos",
        paragraphs: [
          "Conservamos tus datos mientras tu cuenta o empresa esté activa. Al cerrarla, los eliminamos o anonimizamos en un plazo razonable, salvo los que debamos mantener por obligación legal o para atender reclamos. Los respaldos se renuevan de forma periódica.",
        ],
      },
      {
        title: "8. Cómo protegemos los datos",
        items: [
          "Conexión cifrada (HTTPS) en el servicio publicado.",
          "Contraseñas almacenadas con cifrado irreversible.",
          "Separación entre empresas: una empresa no puede ver los datos de otra.",
          "Control de acceso por roles y límite de intentos de inicio de sesión.",
          "Registro de actividad para detectar usos indebidos.",
        ],
        paragraphs: ["Ningún sistema es infalible, pero aplicamos medidas razonables para proteger tu información."],
      },
      {
        title: "9. Tus derechos",
        paragraphs: [
          `Tienes derecho a acceder a tus datos, rectificarlos, solicitar su eliminación, oponerte a ciertos usos y revocar tu consentimiento. Para ejercerlos escríbenos a ${P.email} indicando tu nombre y qué derecho quieres ejercer; responderemos en los plazos que fija la ley.`,
          "Parte de estos derechos puedes ejercerlos directamente desde Mi perfil (editar tu nombre y correo). Si consideras que no atendimos tu solicitud, puedes acudir a la Agencia de Protección de Datos de los Habitantes (PRODHAB).",
        ],
      },
      {
        title: "10. Almacenamiento en tu navegador",
        paragraphs: [
          "Stockly guarda en tu navegador lo necesario para mantener tu sesión iniciada y recordar preferencias (idioma y tema). No usamos cookies de publicidad ni de seguimiento de terceros.",
        ],
      },
      {
        title: "11. Menores de edad",
        paragraphs: ["Stockly no está dirigido a menores de 18 años y no recopilamos sus datos de forma intencional."],
      },
      {
        title: "12. Cambios a esta política",
        paragraphs: [
          "Podemos actualizar esta política. Cuando haya cambios importantes te avisaremos, y la fecha de actualización de arriba cambiará.",
        ],
      },
    ],
  },
}
