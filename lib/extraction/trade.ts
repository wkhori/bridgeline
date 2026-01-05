import { TRADE_MAPPINGS } from './patterns';

export function extractTrade(
  text: string,
  filename: string,
): { value: string; confidence: number } | null {
  const lowerText = text.toLowerCase();
  const lowerFilename = filename.toLowerCase();

  const subjectPatterns = [
    /(?:re|subject|regarding|project):\s*[^:\n]*?(electrical|plumbing|concrete|hvac|mechanical|sitework|excavation|cabling|low voltage)[^:\n]*/gi,
    /proposal\s+(?:for\s+)?([^:\n]*?(?:electrical|plumbing|concrete|hvac|mechanical|sitework|excavation|cabling)[^:\n]*)/gi,
  ];

  for (const pattern of subjectPatterns) {
    const match = pattern.exec(text);
    if (match) {
      for (const mapping of TRADE_MAPPINGS) {
        for (const keyword of mapping.keywords) {
          if (match[0].toLowerCase().includes(keyword)) {
            return { value: mapping.trade, confidence: 0.95 };
          }
        }
      }
    }
  }

  const scopeMatch = text.match(/scope\s+of\s+work[:\s]*([^\n]+(?:\n[^\n]+){0,3})/i);
  if (scopeMatch) {
    const scopeText = scopeMatch[1].toLowerCase();
    for (const mapping of TRADE_MAPPINGS) {
      for (const keyword of mapping.keywords) {
        if (scopeText.includes(keyword)) {
          return { value: mapping.trade, confidence: 0.9 };
        }
      }
    }
  }

  const keywordCounts = new Map<string, number>();

  for (const mapping of TRADE_MAPPINGS) {
    let count = 0;
    for (const keyword of mapping.keywords) {
      if (lowerText.includes(keyword)) {
        count++;
      }
    }
    if (count > 0) {
      keywordCounts.set(mapping.trade, count);
    }
  }

  if (keywordCounts.size > 0) {
    const sorted = Array.from(keywordCounts.entries()).sort((a, b) => b[1] - a[1]);
    return { value: sorted[0][0], confidence: Math.min(0.85, 0.6 + sorted[0][1] * 0.05) };
  }

  for (const mapping of TRADE_MAPPINGS) {
    for (const keyword of mapping.keywords) {
      if (lowerFilename.includes(keyword.split(' ')[0])) {
        return { value: mapping.trade, confidence: 0.7 };
      }
    }
  }

  return null;
}
