export interface LLMContactInfo {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  trade?: string;
}

export interface LLMExtractionResult {
  text?: string;
  contactInfo?: LLMContactInfo;
  confidence: number;
  method: 'llm';
  warnings?: string[];
}

export interface LLMSupplementResult {
  contactInfo: Partial<LLMContactInfo>;
  confidence: number;
  method: 'llm';
  warnings?: string[];
}

export interface LLMContactMeta {
  attempted: boolean;
  used: boolean;
  strategy?: 'full' | 'supplement';
  confidence?: number;
  supplementedFields?: string[];
  warnings?: string[];
}

export interface ExtractedContact {
  id: string;
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  trade?: string;
  confidence: {
    companyName: number;
    contactName: number;
    email: number;
    phone: number;
    trade: number;
    overall: number; // Average of all field confidences
  };
  source: string; // filename
  rawText?: string; // for debugging
  llm?: LLMContactMeta;
}

export interface ProcessedFile {
  filename: string;
  status: 'success' | 'error';
  contacts: ExtractedContact[];
  error?: string;
}

export interface SubcontractorGroup {
  companyName: string;
  contacts: ExtractedContact[];
  trade?: string;
  isDuplicate: boolean;
  mergedFrom?: string[]; // source files merged
}
