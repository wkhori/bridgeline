import { ExtractedContact, LLMContactInfo } from '@/types';
import { normalizeLLMEmail } from './email';
import { normalizeLLMPhone } from './phone';

type ContactField = keyof LLMContactInfo & keyof ExtractedContact;

const LLM_FIELD_THRESHOLDS: Record<ContactField, number> = {
  companyName: 0.6,
  contactName: 0.6,
  email: 0.7,
  phone: 0.7,
  trade: 0.6,
};

export function sanitizeLLMContactInfo(info: Partial<LLMContactInfo>): Partial<LLMContactInfo> {
  return {
    companyName: info.companyName?.trim() || undefined,
    contactName: info.contactName?.trim() || undefined,
    email: normalizeLLMEmail(info.email),
    phone: normalizeLLMPhone(info.phone),
    trade: info.trade?.trim() || undefined,
  };
}

export function getLowConfidenceFields(contact: ExtractedContact): ContactField[] {
  const fields: ContactField[] = [];
  if (!contact.companyName || contact.confidence.companyName < LLM_FIELD_THRESHOLDS.companyName) {
    fields.push('companyName');
  }
  if (!contact.contactName || contact.confidence.contactName < LLM_FIELD_THRESHOLDS.contactName) {
    fields.push('contactName');
  }
  if (!contact.email || contact.confidence.email < LLM_FIELD_THRESHOLDS.email) {
    fields.push('email');
  }
  if (!contact.phone || contact.confidence.phone < LLM_FIELD_THRESHOLDS.phone) {
    fields.push('phone');
  }
  if (!contact.trade || contact.confidence.trade < LLM_FIELD_THRESHOLDS.trade) {
    fields.push('trade');
  }
  return fields;
}

export function mergeLLMValue(
  currentValue: string | undefined,
  currentConfidence: number,
  llmValue: string | undefined,
  llmConfidence: number,
): { value: string | undefined; confidence: number; usedLLM: boolean } {
  if (!llmValue) {
    return { value: currentValue, confidence: currentConfidence, usedLLM: false };
  }
  if (!currentValue || llmConfidence >= currentConfidence) {
    return { value: llmValue, confidence: llmConfidence, usedLLM: true };
  }
  return { value: currentValue, confidence: currentConfidence, usedLLM: false };
}

export function computeOverallConfidence(confidence: ExtractedContact['confidence']): number {
  const values = [
    confidence.companyName,
    confidence.contactName,
    confidence.email,
    confidence.phone,
    confidence.trade,
  ];
  return values.reduce((a, b) => a + b, 0) / values.length;
}
