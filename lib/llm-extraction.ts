import Anthropic from '@anthropic-ai/sdk';
import type { LLMExtractionResult, LLMSupplementResult, LLMContactInfo } from '@/types';

const DEFAULT_LLM_MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function extractJSONBlock(responseText: string): string | null {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : null;
}

function normalizeContactInfo(raw: Record<string, unknown>): LLMContactInfo {
  const getField = (field: string) => {
    const value = raw[field];
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : undefined;
    }
    return undefined;
  };

  return {
    companyName: getField('companyName'),
    contactName: getField('contactName'),
    email: getField('email'),
    phone: getField('phone'),
    trade: getField('trade'),
  };
}

/**
 * Extract structured contact information directly from a document using Claude
 * This is used as a fallback when text extraction is low-confidence or empty
 */
export async function extractContactInfoFromDocument(
  buffer: Buffer,
  filename: string,
): Promise<LLMExtractionResult> {
  try {
    console.log(`🤖 [${filename}] Using Claude API for document contact extraction...`);

    const base64Data = buffer.toString('base64');

    const message = await anthropic.messages.create({
      model: DEFAULT_LLM_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `Extract the following information in JSON format:

{
  "companyName": "Company name (with LLC, Inc, etc. if present)",
  "contactName": "Full name of the contact person",
  "email": "Email address",
  "phone": "Phone number in format (XXX) XXX-XXXX",
  "trade": "Trade/scope (e.g., Electrical, Plumbing, HVAC, Concrete, Sitework, Low Voltage, etc.)"
}

Rules:
- Only include fields if you find them with high confidence
- For trade, identify the primary construction trade/specialty
- For phone, format as (XXX) XXX-XXXX
- If a field is not found or unclear, set it to null
- Be specific and accurate
- Return ONLY the JSON object, no extra text`,
            },
          ],
        },
      ],
    });

    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n');

    const jsonBlock = extractJSONBlock(responseText);
    if (!jsonBlock) {
      throw new Error('No JSON found in LLM response');
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonBlock);
    } catch (parseError) {
      console.error(`❌ [${filename}] Failed to parse LLM JSON:`, jsonBlock.substring(0, 300));
      throw new Error(
        `Invalid JSON in LLM response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      );
    }

    const contactInfo = normalizeContactInfo(parsed);

    console.log(`✓ [${filename}] Claude extracted contact info from document:`, contactInfo);

    return {
      contactInfo,
      confidence: 0.9,
      method: 'llm',
    };
  } catch (error) {
    console.error(`❌ [${filename}] LLM document contact extraction error:`, error);
    throw new Error(
      `Failed to extract contacts from document with LLM: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Extract text from a document using Claude's vision capabilities
 * This works for PDFs, images, and documents with poor text extraction
 */
export async function extractTextWithLLM(
  buffer: Buffer,
  filename: string,
): Promise<LLMExtractionResult> {
  try {
    console.log(`🤖 [${filename}] Using Claude API for text extraction...`);

    const base64Data = buffer.toString('base64');

    const message = await anthropic.messages.create({
      model: DEFAULT_LLM_MODEL,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `Please extract ALL text content from this document. Include:
- All visible text, headings, and body content
- Contact information (names, emails, phone numbers, addresses)
- Company names and trade/scope information
- Any tables, lists, or structured data
- Preserve the general layout and structure where possible

Return the complete text content as if you were performing OCR on this document.`,
            },
          ],
        },
      ],
    });

    const extractedText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n');

    console.log(`✓ [${filename}] Claude extracted ${extractedText.length} characters`);

    return {
      text: extractedText,
      confidence: 0.85,
      method: 'llm',
    };
  } catch (error) {
    console.error(`❌ [${filename}] LLM extraction error:`, error);
    throw new Error(
      `Failed to extract text with LLM: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Extract structured contact information directly using Claude
 * This is useful when rule-based extraction produces low confidence results
 */
export async function extractContactInfoWithLLM(
  text: string,
  filename: string,
): Promise<LLMExtractionResult> {
  try {
    console.log(`🤖 [${filename}] Using Claude API for contact extraction...`);

    const message = await anthropic.messages.create({
      model: DEFAULT_LLM_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Extract contact information from this construction proposal/bid document. Return JSON with these fields:

{
  "companyName": "string or null",
  "contactName": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "trade": "string or null"
}

IMPORTANT INSTRUCTIONS:
- companyName: Look for company name in letterhead, footer, "FROM:", or filename. Include suffixes like LLC, Inc, Corp if present. Do NOT include personal names.
- contactName: Look for "Contact:", "Attn:", "From:", "Prepared by:", or signature blocks. Full first and last name only.
- email: Any email address found (exclude generic like info@, support@)
- phone: Format as (XXX) XXX-XXXX. Look for "Phone:", "Tel:", "Office:", or standalone numbers
- trade: The primary construction trade - choose from: Electrical, Plumbing, HVAC, Concrete, Sitework, Excavation, Low Voltage, Roofing, Demolition, Paving, Landscaping, Fire Protection, Steel, Carpentry, Drywall, Masonry

CRITICAL: Make your best guess for each field even if confidence is medium. Only use null if truly no relevant information exists. Be thorough - check the entire document.

Return ONLY valid JSON, no markdown, no explanations.

Document:
${text.substring(0, 10000)}`,
        },
      ],
    });

    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n');

    // Parse JSON response
    const jsonBlock = extractJSONBlock(responseText);
    if (!jsonBlock) {
      throw new Error('No JSON found in LLM response');
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonBlock);
    } catch (parseError) {
      console.error(`❌ [${filename}] Failed to parse LLM JSON:`, jsonBlock.substring(0, 300));
      throw new Error(
        `Invalid JSON in LLM response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
      );
    }

    const contactInfo = normalizeContactInfo(parsed);

    console.log(`✓ [${filename}] Claude extracted contact info:`, contactInfo);

    return {
      contactInfo,
      confidence: 0.88,
      method: 'llm',
    };
  } catch (error) {
    console.error(`❌ [${filename}] LLM contact extraction error:`, error);
    throw new Error(
      `Failed to extract contacts with LLM: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Hybrid approach: Use LLM to supplement low-confidence rule-based extraction
 */
export async function supplementExtractionWithLLM(
  text: string,
  filename: string,
  missingFields: string[],
): Promise<LLMSupplementResult> {
  try {
    console.log(
      `🤖 [${filename}] Using Claude to fill missing fields: ${missingFields.join(', ')}`,
    );

    const fieldDescriptions = {
      companyName: 'the subcontractor company name (with LLC, Inc, etc.)',
      contactName: 'the full name of the contact person',
      email: 'the email address',
      phone: 'the phone number in format (XXX) XXX-XXXX',
      trade: 'the construction trade/specialty (Electrical, Plumbing, HVAC, etc.)',
    };

    const fieldsToExtract = missingFields
      .map(
        (field) =>
          `- ${field}: ${fieldDescriptions[field as keyof typeof fieldDescriptions] || field}`,
      )
      .join('\n');

    const message = await anthropic.messages.create({
      model: DEFAULT_LLM_MODEL,
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Find the following information in this construction proposal/bid document. Make your best guess even if confidence is medium - only use null if truly nothing relevant exists.

Extract these fields:
${fieldsToExtract}

Return ONLY valid JSON, no markdown:
{
  ${missingFields.map((f) => `"${f}": "value or null"`).join(',\n  ')}
}

Document:
${text.substring(0, 8000)}`,
        },
      ],
    });

    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => ('text' in block ? block.text : ''))
      .join('\n');

    const jsonBlock = extractJSONBlock(responseText);
    if (!jsonBlock) {
      return {
        contactInfo: {},
        confidence: 0,
        method: 'llm',
        warnings: ['No JSON found in LLM response'],
      };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonBlock);
    } catch (parseError) {
      console.error(`❌ [${filename}] Failed to parse LLM JSON:`, jsonBlock.substring(0, 300));
      return {
        contactInfo: {},
        confidence: 0,
        method: 'llm',
        warnings: [
          `Invalid JSON in LLM response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        ],
      };
    }

    const supplementedInfo = normalizeContactInfo(parsed);
    console.log(`✓ [${filename}] Claude supplemented fields:`, supplementedInfo);

    return {
      contactInfo: supplementedInfo,
      confidence: 0.8,
      method: 'llm',
    };
  } catch (error) {
    console.error(`❌ [${filename}] LLM supplementation error:`, error);
    return {
      contactInfo: {},
      confidence: 0,
      method: 'llm',
      warnings: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Check if API key is configured
 */
export function isLLMConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
