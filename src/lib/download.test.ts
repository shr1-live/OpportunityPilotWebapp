import { describe, expect, it } from 'vitest'
import { exportFilename, filenameFromDisposition, safeFilename } from './download'

describe('safeFilename', () => {
  it('replaces characters that operating systems reject', () => {
    expect(safeFilename('DACH: SaaS / .NET <contract>?', 'csv')).toBe('DACH-SaaS-.NET-contract.csv')
  })

  it('cannot be turned into a path or a hidden file', () => {
    expect(safeFilename('../../etc/passwd', 'csv')).toBe('etc-passwd.csv')
    expect(safeFilename('...', 'csv')).toBe('export.csv')
  })

  it('does not double the extension and bounds the length', () => {
    expect(safeFilename('report.CSV', 'csv')).toBe('report.csv')
    expect(safeFilename('x'.repeat(300), 'csv')).toHaveLength(84)
  })
})

describe('filenameFromDisposition', () => {
  it('prefers the encoded filename* form', () => {
    expect(filenameFromDisposition(`attachment; filename="a.csv"; filename*=UTF-8''Gr%C3%BC%C3%9Fe.csv`)).toBe('Grüße.csv')
  })

  it('reads quoted and bare names', () => {
    expect(filenameFromDisposition('attachment; filename="opps.csv"')).toBe('opps.csv')
    expect(filenameFromDisposition('attachment; filename=opps.csv')).toBe('opps.csv')
    expect(filenameFromDisposition('attachment')).toBeNull()
    expect(filenameFromDisposition(null)).toBeNull()
  })
})

describe('exportFilename', () => {
  const today = new Date('2026-10-01T12:00:00Z')

  it('builds a dated name from the campaign when the server sends none', () => {
    expect(exportFilename('DACH SaaS / .NET', null, today)).toBe('opportunities-dach-saas-.net-2026-10-01.csv')
  })

  it('sanitises a server-supplied name too', () => {
    expect(exportFilename('x', 'attachment; filename="../evil.csv"', today)).toBe('evil.csv')
  })
})
