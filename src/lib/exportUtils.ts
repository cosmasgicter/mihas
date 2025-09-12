interface ApplicationData {
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

export function exportToCSV(data: ApplicationData[], filename: string = 'applications.csv') {
  const headers = [
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
  ]

  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      `"${row.application_number}"`,
      `"${row.full_name}"`,
      `"${row.email}"`,
      `"${row.phone}"`,
      `"${row.program}"`,
      `"${row.intake}"`,
      `"${row.institution}"`,
      `"${row.status}"`,
      `"${row.payment_status}"`,
      row.application_fee,
      row.paid_amount || 0,
      `"${new Date(row.submitted_at).toLocaleDateString()}"`,
      `"${new Date(row.created_at).toLocaleDateString()}"`,
      `"${row.grades_summary || ''}"`,
      row.total_subjects || 0,
      row.average_grade?.toFixed(2) || 0,
      row.age || 0,
      row.days_since_submission || 0
    ].join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export function exportToExcel(data: ApplicationData[], filename: string = 'applications.xlsx') {
  exportToCSV(data, filename.replace('.xlsx', '.csv'))
}