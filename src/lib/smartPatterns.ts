// Intelligent pattern matching for Zambian documents - completely free
export function extractZambianData(text: string) {
  const data: any = {}
  
  // Zambian NRC pattern
  const nrcPattern = /(\d{6}\/\d{2}\/\d)/g
  const nrcMatch = text.match(nrcPattern)
  if (nrcMatch) data.nrc = nrcMatch[0]
  
  // Name extraction (multiple patterns)
  const namePatterns = [
    /(?:candidate\s+name|name)[:\s]+([A-Z][a-zA-Z\s]+)/i,
    /^([A-Z][A-Z\s]+)$/m,
    /student[:\s]+([A-Z][a-zA-Z\s]+)/i
  ]
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern)
    if (match && match[1].length > 3) {
      data.name = match[1].trim()
      break
    }
  }
  
  // Zambian grade patterns (1-9 scale)
  const gradePattern = /(mathematics|english|biology|chemistry|physics|geography|history|civics|additional\s+mathematics)[:\s]*([1-9])/gi
  const grades = []
  let match
  
  while ((match = gradePattern.exec(text)) !== null) {
    grades.push({
      subject: match[1].trim(),
      grade: parseInt(match[2])
    })
  }
  
  if (grades.length > 0) data.grades = grades
  
  // School extraction
  const schoolPattern = /(?:school|institution)[:\s]+([A-Z][a-zA-Z\s]+(?:school|college|academy))/i
  const schoolMatch = text.match(schoolPattern)
  if (schoolMatch) data.school = schoolMatch[1].trim()
  
  // Payment patterns
  const paymentPattern = /(?:amount|total)[:\s]*k?(\d+(?:\.\d{2})?)/i
  const paymentMatch = text.match(paymentPattern)
  if (paymentMatch) data.amount = parseFloat(paymentMatch[1])
  
  return data
}