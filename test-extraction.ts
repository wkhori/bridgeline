/**
 * End-to-End Test for Proposal Extraction
 *
 * This script tests the extraction engine on all sample proposal files
 * and outputs the results to verify accuracy.
 */

import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { parseFile, resetExtractionStats, logExtractionSummary } from './lib/parsers';
import { extractContactInfo } from './lib/extraction';
import type { ExtractedContact } from './types';

async function testExtraction() {
  console.log('🚀 Starting End-to-End Extraction Test\n');
  console.log('='.repeat(80));

  // Reset extraction statistics at the start
  resetExtractionStats();

  const promptDir = join(process.cwd(), 'prompt');
  const files = readdirSync(promptDir)
    .filter((f) => f !== '00 - Founding Engineer Technical Exercise.pdf')
    .filter((f) => f.endsWith('.pdf') || f.endsWith('.xlsx') || f.endsWith('.xls'));

  console.log(`\n📁 Found ${files.length} files to process:\n`);
  files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  console.log('\n' + '='.repeat(80) + '\n');

  const results: {
    filename: string;
    contact: ExtractedContact | null;
    error?: string;
  }[] = [];

  for (const filename of files) {
    console.log(`\n📄 Processing: ${filename}`);
    console.log('-'.repeat(80));

    try {
      const filepath = join(promptDir, filename);
      const buffer = readFileSync(filepath);

      console.log(`  ⏳ Parsing file...`);
      const text = await parseFile(buffer, filename);
      console.log(`  ✅ Extracted ${text.length} characters`);

      console.log(`  ⏳ Extracting contact info...`);
      const contact = await extractContactInfo(
        text,
        filename,
        `test-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        {
          buffer,
          enableLLM: process.env.ENABLE_LLM_TEST === 'true',
        },
      );

      console.log(`  ✅ Extraction complete!\n`);
      console.log(`  📊 Results:`);
      console.log(
        `     Company:  ${contact.companyName || '❌ NOT FOUND'} (${(
          contact.confidence.companyName * 100
        ).toFixed(0)}%)`,
      );
      console.log(
        `     Contact:  ${contact.contactName || '❌ NOT FOUND'} (${(
          contact.confidence.contactName * 100
        ).toFixed(0)}%)`,
      );
      console.log(
        `     Email:    ${contact.email || '❌ NOT FOUND'} (${(
          contact.confidence.email * 100
        ).toFixed(0)}%)`,
      );
      console.log(
        `     Phone:    ${contact.phone || '❌ NOT FOUND'} (${(
          contact.confidence.phone * 100
        ).toFixed(0)}%)`,
      );
      console.log(
        `     Trade:    ${contact.trade || '❌ NOT FOUND'} (${(
          contact.confidence.trade * 100
        ).toFixed(0)}%)`,
      );

      results.push({ filename, contact });
    } catch (error) {
      console.error(`  ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.push({
        filename,
        contact: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📈 FINAL SUMMARY');
  console.log('='.repeat(80) + '\n');

  const successful = results.filter((r) => r.contact !== null);
  const failed = results.filter((r) => r.contact === null);

  console.log(`✅ Successfully processed: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}\n`);

  if (failed.length > 0) {
    console.log('Failed files:');
    failed.forEach((f) => console.log(`  - ${f.filename}: ${f.error}`));
    console.log('');
  }

  // Field extraction stats
  const stats = {
    company: successful.filter((r) => r.contact?.companyName).length,
    contact: successful.filter((r) => r.contact?.contactName).length,
    email: successful.filter((r) => r.contact?.email).length,
    phone: successful.filter((r) => r.contact?.phone).length,
    trade: successful.filter((r) => r.contact?.trade).length,
  };

  console.log('Field Extraction Success Rates:');
  console.log(
    `  📋 Company Name: ${stats.company}/${successful.length} (${(
      (stats.company / successful.length) *
      100
    ).toFixed(1)}%)`,
  );
  console.log(
    `  👤 Contact Name: ${stats.contact}/${successful.length} (${(
      (stats.contact / successful.length) *
      100
    ).toFixed(1)}%)`,
  );
  console.log(
    `  📧 Email:        ${stats.email}/${successful.length} (${(
      (stats.email / successful.length) *
      100
    ).toFixed(1)}%)`,
  );
  console.log(
    `  📞 Phone:        ${stats.phone}/${successful.length} (${(
      (stats.phone / successful.length) *
      100
    ).toFixed(1)}%)`,
  );
  console.log(
    `  🏗️  Trade:        ${stats.trade}/${successful.length} (${(
      (stats.trade / successful.length) *
      100
    ).toFixed(1)}%)`,
  );

  console.log('\n' + '='.repeat(80));

  // Display extraction statistics
  logExtractionSummary();

  console.log('✨ Test Complete!\n');

  // Exit with error code if any failures
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run the test
testExtraction().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
