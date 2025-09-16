// Input sanitization utilities
export const sanitizeForLog = (input: string): string => {
  return input.replace(/[\r\n\t]/g, ' ').replace(/[<>]/g, '');
};

export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};