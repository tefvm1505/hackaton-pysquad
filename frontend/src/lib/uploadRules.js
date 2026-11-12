import { formatBytes } from './format'

/**
 * Reglas de la carga de documentos.
 *
 * IMPORTANTE: validar en el navegador solo mejora la experiencia (avisa rápido).
 * No es seguridad: el backend debe repetir estas comprobaciones (tipo real, tamaño,
 * antivirus) porque cualquiera puede saltarse el frontend.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB
export const MAX_FILES_PER_BATCH = 10
export const ACCEPT_ATTR = '.pdf,.xml,application/pdf,text/xml,application/xml'

const ALLOWED_EXTENSIONS = ['pdf', 'xml']

export function getExtension(fileName) {
  const dot = fileName.lastIndexOf('.')
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase()
}

/**
 * Valida un archivo antes de subirlo. Devuelve un mensaje de error o `null` si es válido.
 *
 * Además de la extensión revisa la "firma" del contenido: un `.exe` renombrado a `.pdf`
 * no empieza con `%PDF-`, y un texto cualquiera no es XML.
 */
export async function validateFile(file) {
  const extension = getExtension(file.name)

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return 'Formato no permitido. Solo se aceptan PDF y XML.'
  }
  if (file.size === 0) {
    return 'El archivo está vacío.'
  }
  if (file.size > MAX_FILE_BYTES) {
    return `Pesa ${formatBytes(file.size)} y el máximo es ${formatBytes(MAX_FILE_BYTES)}.`
  }

  let head = ''
  try {
    head = await file.slice(0, 1024).text()
  } catch {
    return 'No se pudo leer el archivo. Inténtalo de nuevo.'
  }

  if (extension === 'pdf' && !head.includes('%PDF-')) {
    return 'El contenido no corresponde a un PDF válido.'
  }
  if (extension === 'xml' && !head.replace(/^\uFEFF/, '').trimStart().startsWith('<')) {
    return 'El contenido no corresponde a un XML válido.'
  }

  return null
}
