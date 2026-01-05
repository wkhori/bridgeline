import { EMAIL_REGEX } from './patterns';

export function extractEmails(text: string): { value: string; confidence: number }[] {
  const emails = text.match(EMAIL_REGEX) || [];
  const uniqueEmails = [...new Set(emails.map((e) => e.toLowerCase()))];

  const filtered = uniqueEmails.filter((email) => {
    const lowered = email.toLowerCase();
    if (
      lowered.includes('info@') ||
      lowered.includes('admin@') ||
      lowered.includes('support@') ||
      lowered.includes('noreply@')
    ) {
      return false;
    }
    return true;
  });

  return filtered.map((email) => ({
    value: email,
    confidence: 0.95,
  }));
}

export function normalizeLLMEmail(email?: string): string | undefined {
  if (!email) return undefined;
  const trimmed = email.trim();
  if (trimmed.length === 0) return undefined;
  const emailPattern = new RegExp(EMAIL_REGEX.source, 'i');
  return emailPattern.test(trimmed) ? trimmed : undefined;
}
