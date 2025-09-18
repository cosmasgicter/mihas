export interface ApplicationData {
  application_number: string
  full_name: string
  email: string
  phone: string
  program: string
  intake: string
  institution: string
  status: string
  payment_status: string
  application_fee: number
  paid_amount: number
  submitted_at: string
  created_at: string
  grades_summary: string
  total_subjects: number
  average_grade: number
  age: number
  days_since_submission: number
}

type ApplicationDataSource =
  | ApplicationData[]
  | AsyncIterable<ApplicationData>
  | AsyncIterable<ApplicationData[]>

const HEADERS = [
  'Application Number',
  'Full Name',
  'Email',
  'Phone',
  'Program',
  'Intake',
  'Institution',
  'Status',
  'Payment Status',
  'Application Fee',
  'Paid Amount',
  'Submitted At',
  'Created At',
  'Grades Summary',
  'Total Subjects',
  'Average Grade',
  'Age',
  'Days Since Submission'
] as const

const YIELD_INTERVAL = 250

const delayForStreaming = async () => {
  await new Promise<void>(resolve => setTimeout(resolve, 0))
}

const isAsyncIterable = (value: unknown): value is AsyncIterable<unknown> => {
  return value != null && typeof (value as any)[Symbol.asyncIterator] === 'function'
}

async function* iterateApplicationData(source: ApplicationDataSource): AsyncGenerator<ApplicationData> {
  if (Array.isArray(source)) {
    for (const record of source) {
      yield record
    }
    return
  }

  if (isAsyncIterable(source)) {
    for await (const chunk of source as AsyncIterable<ApplicationData | ApplicationData[]>) {
      if (Array.isArray(chunk)) {
        for (const record of chunk) {
          yield record
        }
      } else {
        yield chunk
      }
    }
    return
  }

  throw new Error('Unsupported data source provided for export')
}

const formatDate = (value?: string | null) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString()
}

const safeNumber = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 0
  }
  return Number(value)
}

const safeText = (value: string | null | undefined) => value?.toString().trim() ?? ''

const toCsvValue = (value: string | number) => {
  const textValue = typeof value === 'number' ? String(value) : value
  return `"${textValue.replace(/"/g, '""')}"`
}

const mapToRowValues = (application: ApplicationData) => ({
  application_number: safeText(application.application_number),
  full_name: safeText(application.full_name),
  email: safeText(application.email),
  phone: safeText(application.phone),
  program: safeText(application.program),
  intake: safeText(application.intake),
  institution: safeText(application.institution),
  status: safeText(application.status),
  payment_status: safeText(application.payment_status),
  application_fee: safeNumber(application.application_fee),
  paid_amount: safeNumber(application.paid_amount),
  submitted_at: formatDate(application.submitted_at || application.created_at),
  created_at: formatDate(application.created_at),
  grades_summary: safeText(application.grades_summary),
  total_subjects: safeNumber(application.total_subjects),
  average_grade: safeNumber(application.average_grade),
  age: safeNumber(application.age),
  days_since_submission: safeNumber(application.days_since_submission)
})

export async function exportToCSV(
  source: ApplicationDataSource,
  filename: string = 'applications.csv'
) {
  const parts: string[] = []
  parts.push(HEADERS.join(','))

  let buffer: string[] = []
  let processed = 0

  for await (const record of iterateApplicationData(source)) {
    const row = mapToRowValues(record)
    buffer.push([
      toCsvValue(row.application_number),
      toCsvValue(row.full_name),
      toCsvValue(row.email),
      toCsvValue(row.phone),
      toCsvValue(row.program),
      toCsvValue(row.intake),
      toCsvValue(row.institution),
      toCsvValue(row.status),
      toCsvValue(row.payment_status),
      toCsvValue(row.application_fee),
      toCsvValue(row.paid_amount),
      toCsvValue(row.submitted_at),
      toCsvValue(row.created_at),
      toCsvValue(row.grades_summary),
      toCsvValue(row.total_subjects),
      toCsvValue(row.average_grade),
      toCsvValue(row.age),
      toCsvValue(row.days_since_submission)
    ].join(','))

    processed += 1

    if (buffer.length >= 500) {
      parts.push(buffer.join('\n'))
      buffer = []
    }

    if (processed % YIELD_INTERVAL === 0) {
      await delayForStreaming()
    }
  }

  if (buffer.length) {
    parts.push(buffer.join('\n'))
  }

  const csvContent = parts.join('\n')

  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;'
  })

  if (typeof document === 'undefined') return

  const link = document.createElement('a')

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

export async function exportToExcel(
  source: ApplicationDataSource,
  filename: string = 'applications.xlsx'
) {
  const XLSX = await import('xlsx')
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet([HEADERS])

  let batch: Array<Array<string | number>> = []
  let processed = 0

  for await (const record of iterateApplicationData(source)) {
    const row = mapToRowValues(record)
    batch.push([
      row.application_number,
      row.full_name,
      row.email,
      row.phone,
      row.program,
      row.intake,
      row.institution,
      row.status,
      row.payment_status,
      row.application_fee,
      row.paid_amount,
      row.submitted_at,
      row.created_at,
      row.grades_summary,
      row.total_subjects,
      row.average_grade,
      row.age,
      row.days_since_submission
    ])

    processed += 1

    if (batch.length >= 200) {
      XLSX.utils.sheet_add_aoa(worksheet, batch, { origin: -1 })
      batch = []
    }

    if (processed % YIELD_INTERVAL === 0) {
      await delayForStreaming()
    }
  }

  if (batch.length) {
    XLSX.utils.sheet_add_aoa(worksheet, batch, { origin: -1 })
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Applications')
  XLSX.writeFileXLSX(workbook, filename, { compression: true })
}

export async function exportToPDF(
  source: ApplicationDataSource,
  filename: string = 'applications.pdf'
) {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ])

  const autoTable = autoTableModule.default || autoTableModule

  const doc = new jsPDF({ orientation: 'landscape' })
  const rows: string[][] = []
  let processed = 0

  for await (const record of iterateApplicationData(source)) {
    const row = mapToRowValues(record)
    rows.push([
      row.application_number,
      row.full_name,
      row.email,
      row.phone,
      row.program,
      row.intake,
      row.institution,
      row.status,
      row.payment_status,
      row.application_fee.toString(),
      row.paid_amount.toString(),
      row.submitted_at,
      row.created_at,
      row.grades_summary,
      row.total_subjects.toString(),
      row.average_grade.toString(),
      row.age.toString(),
      row.days_since_submission.toString()
    ])

    processed += 1

    if (processed % YIELD_INTERVAL === 0) {
      await delayForStreaming()
    }
  }

  const exportTimestamp = new Date().toLocaleString()

  autoTable(doc, {
    head: [Array.from(HEADERS)],
    body: rows,
    startY: 20,
    styles: { fontSize: 8, cellPadding: 1.5 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 255] },
    margin: { top: 20, bottom: 20, left: 10, right: 10 },
    didDrawPage: (data) => {
      doc.setFontSize(14)
      doc.text('Applications Export', data.settings.margin.left, 12)
      doc.setFontSize(10)
      doc.text(`Generated: ${exportTimestamp}`, data.settings.margin.left, 17)
    }
  })

  doc.save(filename)
}
