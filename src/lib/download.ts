/** Characters Windows, macOS or Linux refuse in file names, plus control characters. */
// eslint-disable-next-line no-control-regex
const UNSAFE = /[\\/:*?"<>|\u0000-\u001f\u007f]/g

/**
 * Turns any text into a file name every OS accepts: no path separators or reserved characters,
 * no leading dots (hidden files) and a bounded length. Falls back when nothing usable is left.
 */
export function safeFilename(name: string, extension: string, fallback = 'export'): string {
  const ext = extension.replace(/^\.+/, '').toLowerCase()
  let base = name.normalize('NFKC').replace(UNSAFE, ' ').replace(/\s+/g, '-')
  if (ext) base = base.replace(new RegExp(`\\.${ext}$`, 'i'), '')
  base = base.replace(/-{2,}/g, '-').replace(/^[.-]+|[.-]+$/g, '').slice(0, 80).replace(/[.-]+$/, '')
  if (!base) base = fallback
  return ext ? `${base}.${ext}` : base
}

/** Reads the file name from a Content-Disposition header, preferring the RFC 5987 `filename*` form. */
export function filenameFromDisposition(header: string | null): string | null {
  if (!header) return null
  const encoded = /filename\*\s*=\s*(?:UTF-8|utf-8)?'[^']*'([^;]+)/i.exec(header)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ''))
    } catch {
      /* malformed percent-encoding: fall through to the plain form */
    }
  }
  const plain = /filename\s*=\s*("([^"]*)"|[^;]+)/i.exec(header)
  if (!plain) return null
  const value = (plain[2] ?? plain[1]).trim()
  return value || null
}

/** "opportunities-dach-saas-2026-10-01.csv", or the server's name when it sent one. */
export function exportFilename(campaignName: string, disposition: string | null, today = new Date()): string {
  const fromServer = filenameFromDisposition(disposition)
  if (fromServer) return safeFilename(fromServer, 'csv', 'opportunities')
  const date = today.toISOString().slice(0, 10)
  return safeFilename(`opportunities-${campaignName.toLowerCase()}-${date}`, 'csv', 'opportunities')
}

/** Browser only: hands a blob to the user as a file download. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
