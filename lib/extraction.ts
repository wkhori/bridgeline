import { ExtractedContact } from '@/types';
import {
  extractContactInfoFromDocument,
  extractContactInfoWithLLM,
  isLLMConfigured,
  supplementExtractionWithLLM,
} from './llm-extraction';
import { extractCompanyName } from './extraction/company';
import { extractContactName } from './extraction/contact';
import { extractEmails } from './extraction/email';
import { extractPhones } from './extraction/phone';
import { extractTrade } from './extraction/trade';
import {
  computeOverallConfidence,
  getLowConfidenceFields,
  mergeLLMValue,
  sanitizeLLMContactInfo,
} from './extraction/llm-utils';

type LLMField = 'companyName' | 'contactName' | 'email' | 'phone' | 'trade';

export async function extractContactInfo(
  text: string,
  filename: string,
  fileId: string,
  options?: {
    buffer?: Buffer;
    enableLLM?: boolean;
  },
): Promise<ExtractedContact> {
  const emails = extractEmails(text);
  const phones = extractPhones(text);
  const trade = extractTrade(text, filename);
  const company = extractCompanyName(text, filename);
  const contact = extractContactName(text, emails);

  const extracted: ExtractedContact = {
    id: fileId,
    companyName: company?.value,
    contactName: contact?.value,
    email: emails[0]?.value,
    phone: phones[0]?.value,
    trade: trade?.value,
    confidence: {
      companyName: company?.confidence || 0,
      contactName: contact?.confidence || 0,
      email: emails[0]?.confidence || 0,
      phone: phones[0]?.confidence || 0,
      trade: trade?.confidence || 0,
      overall: 0,
    },
    source: filename,
    rawText: text.substring(0, 500),
  };

  extracted.confidence.overall = computeOverallConfidence(extracted.confidence);

  const lowConfidenceFields = getLowConfidenceFields(extracted);
  const llmMeta = {
    attempted: false,
    used: false,
    warnings: [] as string[],
    supplementedFields: [] as string[],
  };

  if (lowConfidenceFields.length > 0 && options?.enableLLM !== false) {
    if (!isLLMConfigured()) {
      console.warn(
        `⚠ [${filename}] Low-confidence extraction but ANTHROPIC_API_KEY is not configured.`,
      );
    } else {
      llmMeta.attempted = true;
      const hasNoText = !text || text.trim().length < 100;
      const useDocumentExtraction = hasNoText && options?.buffer !== undefined;
      const useFullExtraction =
        extracted.confidence.overall < 0.55 || lowConfidenceFields.length >= 3;

      try {
        if (useDocumentExtraction) {
          const llmResult = await extractContactInfoFromDocument(
            options?.buffer as Buffer,
            filename,
          );
          const sanitized = sanitizeLLMContactInfo(llmResult.contactInfo || {});

          const companyMerge = mergeLLMValue(
            extracted.companyName,
            extracted.confidence.companyName,
            sanitized.companyName,
            llmResult.confidence,
          );
          const contactMerge = mergeLLMValue(
            extracted.contactName,
            extracted.confidence.contactName,
            sanitized.contactName,
            llmResult.confidence,
          );
          const emailMerge = mergeLLMValue(
            extracted.email,
            extracted.confidence.email,
            sanitized.email,
            llmResult.confidence,
          );
          const phoneMerge = mergeLLMValue(
            extracted.phone,
            extracted.confidence.phone,
            sanitized.phone,
            llmResult.confidence,
          );
          const tradeMerge = mergeLLMValue(
            extracted.trade,
            extracted.confidence.trade,
            sanitized.trade,
            llmResult.confidence,
          );

          extracted.companyName = companyMerge.value;
          extracted.contactName = contactMerge.value;
          extracted.email = emailMerge.value;
          extracted.phone = phoneMerge.value;
          extracted.trade = tradeMerge.value;
          extracted.confidence.companyName = companyMerge.confidence;
          extracted.confidence.contactName = contactMerge.confidence;
          extracted.confidence.email = emailMerge.confidence;
          extracted.confidence.phone = phoneMerge.confidence;
          extracted.confidence.trade = tradeMerge.confidence;

          llmMeta.used = [
            companyMerge.usedLLM,
            contactMerge.usedLLM,
            emailMerge.usedLLM,
            phoneMerge.usedLLM,
            tradeMerge.usedLLM,
          ].some(Boolean);
        } else if (useFullExtraction) {
          const llmResult = await extractContactInfoWithLLM(text, filename);
          const sanitized = sanitizeLLMContactInfo(llmResult.contactInfo || {});

          const companyMerge = mergeLLMValue(
            extracted.companyName,
            extracted.confidence.companyName,
            sanitized.companyName,
            llmResult.confidence,
          );
          const contactMerge = mergeLLMValue(
            extracted.contactName,
            extracted.confidence.contactName,
            sanitized.contactName,
            llmResult.confidence,
          );
          const emailMerge = mergeLLMValue(
            extracted.email,
            extracted.confidence.email,
            sanitized.email,
            llmResult.confidence,
          );
          const phoneMerge = mergeLLMValue(
            extracted.phone,
            extracted.confidence.phone,
            sanitized.phone,
            llmResult.confidence,
          );
          const tradeMerge = mergeLLMValue(
            extracted.trade,
            extracted.confidence.trade,
            sanitized.trade,
            llmResult.confidence,
          );

          extracted.companyName = companyMerge.value;
          extracted.contactName = contactMerge.value;
          extracted.email = emailMerge.value;
          extracted.phone = phoneMerge.value;
          extracted.trade = tradeMerge.value;
          extracted.confidence.companyName = companyMerge.confidence;
          extracted.confidence.contactName = contactMerge.confidence;
          extracted.confidence.email = emailMerge.confidence;
          extracted.confidence.phone = phoneMerge.confidence;
          extracted.confidence.trade = tradeMerge.confidence;

          llmMeta.used = [
            companyMerge.usedLLM,
            contactMerge.usedLLM,
            emailMerge.usedLLM,
            phoneMerge.usedLLM,
            tradeMerge.usedLLM,
          ].some(Boolean);
        } else {
          const supplement = await supplementExtractionWithLLM(text, filename, lowConfidenceFields);
          const sanitized = sanitizeLLMContactInfo(supplement.contactInfo);

          const fieldMerges: Array<[LLMField, string | undefined, number]> = [
            ['companyName', sanitized.companyName, extracted.confidence.companyName],
            ['contactName', sanitized.contactName, extracted.confidence.contactName],
            ['email', sanitized.email, extracted.confidence.email],
            ['phone', sanitized.phone, extracted.confidence.phone],
            ['trade', sanitized.trade, extracted.confidence.trade],
          ];

          for (const [field, value, currentConfidence] of fieldMerges) {
            if (!value) continue;
            const merged = mergeLLMValue(
              extracted[field] as string | undefined,
              currentConfidence,
              value,
              supplement.confidence || 0.8,
            );
            extracted[field] = merged.value as ExtractedContact[typeof field];
            const confidenceKey = field as keyof ExtractedContact['confidence'];
            extracted.confidence[confidenceKey] = merged.confidence;
            if (merged.usedLLM) {
              llmMeta.supplementedFields.push(field);
              llmMeta.used = true;
            }
          }

          if (supplement.warnings?.length) {
            llmMeta.warnings.push(...supplement.warnings);
          }
        }
      } catch (error) {
        llmMeta.warnings.push(error instanceof Error ? error.message : 'Unknown LLM error');
        console.error(`❌ [${filename}] LLM contact augmentation failed:`, error);
      }
    }
  }

  if (llmMeta.attempted || llmMeta.used || llmMeta.warnings.length > 0) {
    extracted.llm = {
      attempted: llmMeta.attempted,
      used: llmMeta.used,
      supplementedFields: llmMeta.supplementedFields.length
        ? llmMeta.supplementedFields
        : undefined,
      warnings: llmMeta.warnings.length ? llmMeta.warnings : undefined,
    };
  }

  extracted.confidence.overall = computeOverallConfidence(extracted.confidence);

  return extracted;
}
