export const runtime = 'nodejs'

const TEXT_EXTS = new Set([
  '.txt', '.md', '.markdown', '.js', '.jsx', '.ts', '.tsx', '.py', '.rb',
  '.go', '.rs', '.java', '.c', '.cpp', '.h', '.cs', '.php', '.html', '.css',
  '.scss', '.json', '.yaml', '.yml', '.toml', '.sh', '.bash', '.zsh',
  '.env', '.env.example', '.gitignore', '.sql', '.graphql', '.xml', '.csv',
  '.log', '.ini', '.conf', '.config', '.lock', '.r', '.kt', '.swift',
])

function getExt(name) {
  const i = name.lastIndexOf('.')
  return i === -1 ? '' : name.slice(i).toLowerCase()
}

export async function POST(req) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    const name = file.name || 'file'
    const mimeType = file.type || ''
    const size = file.size
    const ext = getExt(name)

    if (size > 5 * 1024 * 1024) {
      return Response.json({ error: 'File too large (max 5MB)' }, { status: 413 })
    }

    // PDF
    if (mimeType === 'application/pdf' || ext === '.pdf') {
      const buffer = Buffer.from(await file.arrayBuffer())
      try {
        const pdfParse = (await import('pdf-parse')).default
        const data = await pdfParse(buffer)
        return Response.json({
          content: data.text,
          name, ext: '.pdf', size,
          pages: data.numpages,
          info: data.info,
        })
      } catch {
        return Response.json({ error: 'PDF parsing failed — try a text file instead' }, { status: 422 })
      }
    }

    // DOCX
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx') {
      const buffer = Buffer.from(await file.arrayBuffer())
      try {
        const mammoth = (await import('mammoth')).default
        const result = await mammoth.extractRawText({ buffer })
        return Response.json({ content: result.value, name, ext: '.docx', size, pages: null })
      } catch {
        return Response.json({ error: 'DOCX parsing failed' }, { status: 422 })
      }
    }

    // XLSX / XLS / CSV
    if (['.xlsx', '.xls', '.csv'].includes(ext) || mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      const buffer = Buffer.from(await file.arrayBuffer())
      try {
        const XLSX = (await import('xlsx')).default
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheets = workbook.SheetNames.map(name => {
          const ws = workbook.Sheets[name]
          return `## Sheet: ${name}\n${XLSX.utils.sheet_to_csv(ws)}`
        })
        return Response.json({ content: sheets.join('\n\n'), name, ext, size })
      } catch {
        return Response.json({ error: 'Spreadsheet parsing failed' }, { status: 422 })
      }
    }

    // JSON
    if (mimeType === 'application/json' || ext === '.json') {
      const raw = await file.text()
      try {
        const parsed = JSON.parse(raw)
        return Response.json({ content: JSON.stringify(parsed, null, 2), name, ext, size })
      } catch {
        return Response.json({ content: raw, name, ext, size })
      }
    }

    // Text / code
    if (mimeType.startsWith('text/') || TEXT_EXTS.has(ext)) {
      const content = await file.text()
      return Response.json({ content, name, ext, size })
    }

    // Images — return base64 data URL for vision models
    if (mimeType.startsWith('image/')) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const b64 = buffer.toString('base64')
      return Response.json({
        content: `data:${mimeType};base64,${b64}`,
        name, ext, size,
        isImage: true,
      })
    }

    return Response.json({ error: `Unsupported file type: ${mimeType || ext}` }, { status: 415 })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
