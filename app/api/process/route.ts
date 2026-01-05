import { NextRequest, NextResponse } from 'next/server';
import { parseFile } from '@/lib/parsers';
import { extractContactInfo } from '@/lib/extraction';
import { ProcessedFile, ExtractedContact } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const processedFiles: ProcessedFile[] = [];

    // Process each file
    for (const file of files) {
      try {
        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse file content
        const text = await parseFile(buffer, file.name);

        // Extract contact information with AI enhancement enabled by default
        const contact = await extractContactInfo(
          text,
          file.name,
          `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          {
            buffer,
            enableLLM: true, // Enable AI by default - cost is negligible (~$0.01 per batch)
          },
        );

        processedFiles.push({
          filename: file.name,
          status: 'success',
          contacts: [contact],
        });
      } catch (error) {
        console.error(`Error processing ${file.name}:`, error);
        processedFiles.push({
          filename: file.name,
          status: 'error',
          contacts: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Extract all contacts
    const allContacts: ExtractedContact[] = processedFiles
      .filter((f) => f.status === 'success')
      .flatMap((f) => f.contacts);

    return NextResponse.json({
      success: true,
      processedFiles,
      contacts: allContacts,
    });
  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process files',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
