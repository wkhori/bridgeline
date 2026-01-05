import * as XLSX from 'xlsx';
import { inflateRawSync, inflateSync } from 'node:zlib';
import { extractText } from 'unpdf';

// Global extraction statistics tracking
export interface ExtractionStats {
  totalFilesProcessed: number;
  llmFilesCount: number;
  totalCharactersExtracted: number;
  fileDetails: Array<{
    filename: string;
    method: 'native' | 'fallback' | 'llm';
    characters: number;
  }>;
}

// Global statistics object
let extractionStats: ExtractionStats = {
  totalFilesProcessed: 0,
  llmFilesCount: 0,
  totalCharactersExtracted: 0,
  fileDetails: [],
};

// Export functions to access and reset stats
export function getExtractionStats(): ExtractionStats {
  return { ...extractionStats };
}

export function resetExtractionStats(): void {
  extractionStats = {
    totalFilesProcessed: 0,
    llmFilesCount: 0,
    totalCharactersExtracted: 0,
    fileDetails: [],
  };
}

export function logExtractionSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('📊 EXTRACTION PROCESSING SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files processed: ${extractionStats.totalFilesProcessed}`);
  console.log(
    `Files using LLM: ${extractionStats.llmFilesCount} (${((extractionStats.llmFilesCount / extractionStats.totalFilesProcessed) * 100).toFixed(1)}%)`,
  );
  console.log(
    `Total characters extracted: ${extractionStats.totalCharactersExtracted.toLocaleString()}`,
  );

  if (extractionStats.fileDetails.length > 0) {
    console.log('\n📄 File-by-File Breakdown:');
    extractionStats.fileDetails.forEach((file, idx) => {
      const methodIcon = file.method === 'llm' ? '🤖' : file.method === 'fallback' ? '🔄' : '✓';
      console.log(
        `  ${idx + 1}. ${methodIcon} ${file.filename}: ${file.characters.toLocaleString()} chars [${file.method}]`,
      );
    });
  }
  console.log('='.repeat(60) + '\n');
}

/**
 * Parse PDF file with hybrid approach: text extraction + fallback parser
 */
export async function parsePDF(buffer: Buffer, filename: string = 'unknown.pdf'): Promise<string> {
  extractionStats.totalFilesProcessed++;

  try {
    // Step 1: Try native text extraction with unpdf
    const uint8Array = new Uint8Array(buffer);
    const { text } = await extractText(uint8Array, { mergePages: true });

    // Check if we got meaningful text (>100 chars indicates native PDF text)
    if (text.trim().length > 100) {
      console.log(`✓ [${filename}] PDF has native text, using unpdf extraction`);

      // Track statistics
      extractionStats.fileDetails.push({
        filename,
        method: 'native',
        characters: text.length,
      });

      return text;
    }

    // Step 2: Text extraction yielded little/no text - likely scanned PDF
    console.log(`⚠ [${filename}] Low text content detected, trying fallback parser...`);

    // Try basic fallback first
    const fallbackText = extractPdfTextFallback(buffer);

    // Check if fallback extracted meaningful text (not binary garbage)
    const isBinaryGarbage =
      fallbackText.length > 100 &&
      (fallbackText.includes('%PDF-') ||
        fallbackText.includes('/DCTDecode') ||
        fallbackText.includes('/FlateDecode') ||
        fallbackText.includes('stream\n') ||
        /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(fallbackText.substring(0, 500)));

    if (fallbackText.length > 100 && !isBinaryGarbage) {
      console.log(`✓ [${filename}] Fallback extraction successful`);

      // Track statistics
      extractionStats.fileDetails.push({
        filename,
        method: 'fallback',
        characters: fallbackText.length,
      });

      return fallbackText;
    }

    if (isBinaryGarbage) {
      console.log(`⚠ [${filename}] Fallback returned binary data, skipping text extraction`);
    }

    extractionStats.fileDetails.push({
      filename,
      method: 'fallback',
      characters: 0,
    });

    return '';
  } catch (error) {
    console.error(`PDF parsing error [${filename}]:`, error);
    throw new Error(
      `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

function findPdfStreams(buffer: Buffer): Buffer[] {
  const streams: Buffer[] = [];
  const streamMarker = Buffer.from('stream');
  const endMarker = Buffer.from('endstream');
  let offset = 0;

  while (offset < buffer.length) {
    const streamIndex = buffer.indexOf(streamMarker, offset);
    if (streamIndex === -1) break;

    let dataStart = streamIndex + streamMarker.length;
    if (buffer[dataStart] === 0x0d && buffer[dataStart + 1] === 0x0a) {
      dataStart += 2;
    } else if (buffer[dataStart] === 0x0a) {
      dataStart += 1;
    }

    const endIndex = buffer.indexOf(endMarker, dataStart);
    if (endIndex === -1) break;

    streams.push(buffer.subarray(dataStart, endIndex));
    offset = endIndex + endMarker.length;
  }

  return streams;
}

function decodePdfString(value: string): string {
  let decoded = '';
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === '\\') {
      const next = value[++i];
      if (!next) break;
      if (next === 'n') decoded += '\n';
      else if (next === 'r') decoded += '\r';
      else if (next === 't') decoded += '\t';
      else if (next === 'b') decoded += '\b';
      else if (next === 'f') decoded += '\f';
      else if (/[0-7]/.test(next)) {
        let octal = next;
        for (let j = 0; j < 2; j++) {
          const peek = value[i + 1];
          if (peek && /[0-7]/.test(peek)) {
            octal += peek;
            i++;
          } else {
            break;
          }
        }
        decoded += String.fromCharCode(parseInt(octal, 8));
      } else {
        decoded += next;
      }
    } else {
      decoded += ch;
    }
  }
  return decoded;
}

function parseTJBlock(block: string): string {
  let result = '';
  let i = 0;

  while (i < block.length) {
    if (block[i] === '(') {
      i++;
      let depth = 1;
      let buf = '';
      while (i < block.length) {
        const current = block[i];
        if (current === '\\') {
          buf += current;
          i++;
          if (i < block.length) {
            buf += block[i];
            i++;
          }
          continue;
        }
        if (current === '(') {
          depth++;
          buf += current;
          i++;
          continue;
        }
        if (current === ')') {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
          buf += current;
          i++;
          continue;
        }
        buf += current;
        i++;
      }
      result += decodePdfString(buf);
      continue;
    }
    i++;
  }

  return result;
}

function extractPdfTextFallback(buffer: Buffer): string {
  const streams = findPdfStreams(buffer);
  const decodedStreams: string[] = [];

  for (const stream of streams) {
    try {
      const inflated = inflateSync(stream);
      decodedStreams.push(inflated.toString('latin1'));
      continue;
    } catch {
      // Try raw inflate for streams without zlib headers.
    }

    try {
      const inflatedRaw = inflateRawSync(stream);
      decodedStreams.push(inflatedRaw.toString('latin1'));
    } catch {
      // Skip non-flate or invalid streams.
    }
  }

  const combined = decodedStreams.join('\n');
  const chunks: string[] = [];

  if (combined.length > 0) {
    const tjRegex = /\[(.*?)\]\s*TJ/gs;
    let match: RegExpExecArray | null;
    while ((match = tjRegex.exec(combined))) {
      const parsed = parseTJBlock(match[1]);
      if (parsed.trim()) chunks.push(parsed.trim());
    }

    const tjSingleRegex = /\((.*?)\)\s*Tj/gs;
    while ((match = tjSingleRegex.exec(combined))) {
      const parsed = decodePdfString(match[1]);
      if (parsed.trim()) chunks.push(parsed.trim());
    }
  }

  if (chunks.length === 0) {
    return extractAsciiStrings(buffer);
  }

  return chunks.join('\n');
}

function extractAsciiStrings(buffer: Buffer, minLength = 4): string {
  const results: string[] = [];
  let current = '';

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    if (byte >= 32 && byte <= 126) {
      current += String.fromCharCode(byte);
    } else {
      if (current.length >= minLength) {
        results.push(current);
      }
      current = '';
    }
  }

  if (current.length >= minLength) {
    results.push(current);
  }

  return results.join('\n');
}

/**
 * Parse Excel file and extract text content
 */
export function parseExcel(buffer: Buffer): string {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let allText = '';

    // Iterate through all sheets
    workbook.SheetNames.forEach((sheetName) => {
      const sheet = workbook.Sheets[sheetName];

      // Convert sheet to CSV for easier text extraction
      const csv = XLSX.utils.sheet_to_csv(sheet);
      allText += csv + '\n';
    });

    return allText;
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error('Failed to parse Excel file');
  }
}

/**
 * Parse file based on extension
 */
export async function parseFile(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.toLowerCase().split('.').pop();

  switch (ext) {
    case 'pdf':
      return await parsePDF(buffer, filename);
    case 'xlsx':
    case 'xls':
      return parseExcel(buffer);
    case 'txt':
      return buffer.toString('utf-8');
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}
