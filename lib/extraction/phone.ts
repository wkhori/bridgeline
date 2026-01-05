import { PHONE_PATTERNS } from './patterns';

export function extractPhones(text: string): { value: string; confidence: number }[] {
  const allMatches = new Set<string>();

  for (const pattern of PHONE_PATTERNS) {
    const matches = text.match(pattern) || [];
    matches.forEach((m) => allMatches.add(m));
  }

  const normalized = new Map<string, string>();

  for (const match of allMatches) {
    const digits = match.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) continue;

    const last10 = digits.slice(-10);
    const formatted = `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;

    if (!normalized.has(last10)) {
      normalized.set(last10, formatted);
    }
  }

  return Array.from(normalized.values()).map((phone) => ({
    value: phone,
    confidence: 0.9,
  }));
}

export function normalizeLLMPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return undefined;
  const last10 = digits.slice(-10);
  return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
}
