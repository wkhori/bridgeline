function isValidName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 50) return false;

  if (!name.includes(' ')) return false;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2 || parts.length > 3) return false;
  if (parts.length === 3 && !/^[A-Za-z]{1,2}\.?$/.test(parts[1])) return false;

  const lowerName = name.toLowerCase();
  const invalidPatterns = [
    'project',
    'estimate',
    'phone',
    'email',
    'fax',
    'contact',
    'company',
    'address',
    'date',
    'proposal',
    'total',
    'price',
    'scope',
    'work',
    'bill',
    'ship',
    'from',
    'attn',
  ];

  for (const invalid of invalidPatterns) {
    if (lowerName.includes(invalid)) return false;
  }

  if (!/^[A-Z]/.test(name)) return false;

  return true;
}

function formatNameCase(name: string): string {
  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatNameFromEmail(localPart: string): string | null {
  const cleaned = localPart.replace(/[0-9]+/g, '');
  const parts = cleaned.split(/[._-]+/).filter(Boolean);

  if (parts.length < 2) return null;
  if (!parts.every((part) => /^[a-z]+$/i.test(part))) return null;
  if (parts.some((part) => part.length < 2)) return null;

  return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');
}

export function extractContactName(
  text: string,
  emails: { value: string; confidence: number }[],
): { value: string; confidence: number } | null {
  const signaturePatterns = [
    /(?:sincerely|regards|respectfully|thank you|thanks)[,.\s]*\n+\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/i,
    /\bby[:\s]+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/i,
    /\n\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\s*\n\s*(?:President|Vice President|VP|Manager|Estimator|Owner|Director|Superintendent)/i,
  ];

  for (const pattern of signaturePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim();
      if (isValidName(name)) {
        return { value: name, confidence: 0.9 };
      }
    }
  }

  const labeledPatterns = [
    /(?:contact|attn|attention)[:\s]+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/i,
    /(?:estimator|project manager|pm|account manager)[:\s]+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s*[A-Z]?[a-z]*)/i,
    /(?:prepared by|submitted by|from)[:\s]+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/i,
    /(?:name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)/i,
  ];

  for (const pattern of labeledPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim();
      if (isValidName(name)) {
        return { value: name, confidence: 0.88 };
      }
    }
  }

  const fromHeaderMatch = text.match(/FROM[:\s]+([A-Z][A-Z\s.]+?)(?:,|\n|EXT|$)/i);
  if (fromHeaderMatch) {
    const name = fromHeaderMatch[1].trim();
    const formatted = formatNameCase(name);
    if (isValidName(formatted)) {
      return { value: formatted, confidence: 0.85 };
    }
  }

  const contactFieldMatch = text.match(/CONTACT[\s:]+([A-Z][A-Z]+(?:\s+[A-Z]+)?)/);
  if (contactFieldMatch) {
    const name = formatNameCase(contactFieldMatch[1].trim());
    if (isValidName(name)) {
      return { value: name, confidence: 0.82 };
    }
  }

  for (const email of emails) {
    const emailIndex = text.indexOf(email.value);
    if (emailIndex !== -1) {
      const before = text.substring(Math.max(0, emailIndex - 300), emailIndex);
      const nameMatch = before.match(/([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\s*$/);
      if (nameMatch && isValidName(nameMatch[1])) {
        return { value: nameMatch[1], confidence: 0.78 };
      }
    }
  }

  const nameTitlePattern =
    /([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\s*\n\s*(?:Estimator|Project Manager|Account Manager|VP|Vice President|President|Owner|Manager|Superintendent)/g;
  const nameTitleMatches = [...text.matchAll(nameTitlePattern)];
  if (nameTitleMatches.length > 0) {
    const lastMatch = nameTitleMatches[nameTitleMatches.length - 1];
    if (lastMatch[1] && isValidName(lastMatch[1])) {
      return { value: lastMatch[1], confidence: 0.85 };
    }
  }

  if (emails.length > 0) {
    const localPart = emails[0].value.split('@')[0] || '';
    const formatted = formatNameFromEmail(localPart);
    if (formatted && isValidName(formatted)) {
      return { value: formatted, confidence: 0.55 };
    }
  }

  return null;
}
