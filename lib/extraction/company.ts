import { ADDRESS_HINTS, COMPANY_LINE_BLACKLIST, COMPANY_SUFFIXES, EMAIL_REGEX } from './patterns';

function isAddressLike(line: string): boolean {
  const lower = line.toLowerCase();
  const hasStreetHint = ADDRESS_HINTS.some((hint) => new RegExp(`\\b${hint}\\b`, 'i').test(lower));
  const hasZip = /\b\d{5}(?:-\d{4})?\b/.test(lower);
  const digitCount = (line.match(/\d/g) || []).length;
  return (hasStreetHint && digitCount >= 3) || hasZip;
}

function isLikelyNonCompanyLine(line: string): boolean {
  const lower = line.toLowerCase();
  if (COMPANY_LINE_BLACKLIST.some((term) => lower.includes(term))) return true;
  if (EMAIL_REGEX.test(line)) return true;
  if (isAddressLike(line)) return true;
  return false;
}

export function extractCompanyName(
  text: string,
  filename: string,
): { value: string; confidence: number } | null {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const suffixPattern = new RegExp(
    `([A-Z][A-Za-z0-9\\s&.,'-]+(?:${COMPANY_SUFFIXES.join('|')})\\.?)`,
    'gi',
  );

  const first40Lines = lines.slice(0, 40).join('\n');
  const suffixMatches = first40Lines.match(suffixPattern);

  if (suffixMatches && suffixMatches.length > 0) {
    for (const match of suffixMatches) {
      const cleaned = match.trim();
      if (cleaned.length > 5 && cleaned.length < 80) {
        if (/^(to|from|bill|ship|project|attn|attention|re|subject)/i.test(cleaned)) continue;
        if (isLikelyNonCompanyLine(cleaned)) continue;
        return { value: cleaned, confidence: 0.92 };
      }
    }
  }

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    if (line.length < 5 || line.length > 80) continue;
    if (/^\d|^(date|to|from|re|subject|attn)/i.test(line)) continue;
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line)) continue;
    if (isLikelyNonCompanyLine(line)) continue;

    const letters = line.replace(/[^A-Za-z]/g, '');
    if (letters.length > 3) {
      const upperRatio = (line.match(/[A-Z]/g) || []).length / letters.length;
      if (upperRatio > 0.8) {
        return { value: line, confidence: 0.88 };
      }
    }
  }

  const fromMatch = text.match(/(?:^|\n)\s*(?:from|submitted by)[:\s]+([^\n]+)/i);
  if (fromMatch) {
    const candidate = fromMatch[1].trim();
    if (candidate.length > 3 && candidate.length < 80) {
      if (isLikelyNonCompanyLine(candidate)) return null;
      return { value: candidate, confidence: 0.85 };
    }
  }

  const proposalIndex = text.search(/\bPROPOSAL\b/i);
  if (proposalIndex !== -1 && proposalIndex < 500) {
    const beforeProposal = text.substring(0, proposalIndex);
    const linesBeforeProposal = beforeProposal
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 3);
    if (linesBeforeProposal.length > 0) {
      const candidate = linesBeforeProposal[linesBeforeProposal.length - 1];
      if (candidate.length < 80 && !/^\d/.test(candidate)) {
        if (isLikelyNonCompanyLine(candidate)) return null;
        return { value: candidate, confidence: 0.8 };
      }
    }
  }

  const filenameWithoutExt = filename.replace(/\.(pdf|xlsx?|txt)$/i, '');
  const cleanName = filenameWithoutExt
    .replace(/[-_]/g, ' ')
    .replace(/\b(proposal|bid|quote|revised?|rev\d*|original|\d+)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleanName.length > 3) {
    return { value: cleanName, confidence: 0.6 };
  }

  return null;
}
