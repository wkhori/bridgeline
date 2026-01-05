# Bridgeline Proposal Ingestion

Extracts subcontractor contact info from proposal documents (PDF, Excel, text) and generates an ITB-ready review flow.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000 and upload files from `/prompt`.

## How It Works

Upload → Parse (unpdf/xlsx) → Extract (regex + heuristics) → LLM fallback → Review & Edit → Deduplicate → ITB

## Tech

- Next.js 16 + React 19 + TypeScript
- unpdf for native PDF text, XLSX for spreadsheets
- Anthropic Claude API for low-confidence fallback

## Testing

```bash
npm run test:extraction
```

## Next Steps

- Add OCR fallback before LLM to reduce cost and improve speed on scanned PDFs
- Send invitation emails to all subcontractors
- Export this data to your bidding system
- Track responses and manage the bidding process
- Generate reports and analytics
