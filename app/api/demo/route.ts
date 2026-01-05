import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseFile } from '@/lib/parsers';
import { extractContactInfo } from '@/lib/extraction';
import { ExtractedContact, ProcessedFile } from '@/types';

const DEMO_FILES = [
  'R Lee_Simpson Field Nicholas Contracting.pdf',
  'Dalton_ E. Simpson Stadium Park - REVISED PROPOSAL.pdf',
  '22 - Plumbing - BRPI 8.26.2025.pdf',
];

export async function GET() {
  try {
    const processedFiles: ProcessedFile[] = [];

    for (const filename of DEMO_FILES) {
      try {
        const filePath = join(process.cwd(), 'prompt', filename);
        const buffer = await readFile(filePath);
        const text = await parseFile(buffer, filename);

        const contact = await extractContactInfo(
          text,
          filename,
          `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          {
            buffer,
            enableLLM: true,
          },
        );

        processedFiles.push({
          filename,
          status: 'success',
          contacts: [contact],
        });
      } catch (error) {
        console.error(`Error processing demo file ${filename}:`, error);
        processedFiles.push({
          filename,
          status: 'error',
          contacts: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const contacts: ExtractedContact[] = processedFiles
      .filter((file) => file.status === 'success')
      .flatMap((file) => file.contacts);

    return NextResponse.json({
      success: true,
      processedFiles,
      contacts,
    });
  } catch (error) {
    console.error('Demo processing error:', error);
    return NextResponse.json(
      {
        error: 'Failed to load demo files',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
