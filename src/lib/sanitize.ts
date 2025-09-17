export function sanitizeForDisplay(input: string | null | undefined): string {
  if (!input) return '';
  return input.replace(/[<>&"']/g, (char) => {
    switch (char) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&#x27;';
      default: return char;
    }
  });
}