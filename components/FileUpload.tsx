'use client';

import { useState, useRef } from 'react';
import { ExtractedContact } from '@/types';

interface FileUploadProps {
  onFilesProcessed: (contacts: ExtractedContact[]) => void;
  onError: (error: string) => void;
  setLoading: (loading: boolean) => void;
  onDemo: () => void;
  demoLoading: boolean;
}

export default function FileUpload({
  onFilesProcessed,
  onError,
  setLoading,
  onDemo,
  demoLoading,
}: FileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const primaryButtonBase =
    'rounded-full text-sm font-semibold transition focus-visible:outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-(--brand-forest) focus-visible:ring-offset-2';
  const primaryButtonSmPadding = 'px-5 py-2';
  const primaryButtonLgPadding = 'px-6 py-3';
  const primaryButtonEnabled = 'bg-(--brand-forest) text-white hover:bg-(--brand-forest-dark)';
  const primaryButtonDisabled = 'bg-gray-200 text-gray-400 cursor-not-allowed';
  const secondaryButtonClass =
    'rounded-full border border-(--brand-moss) px-6 py-3 text-sm font-semibold text-(--brand-slate) ' +
    'transition hover:border-(--brand-forest) hover:text-(--brand-graphite) focus-visible:outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-(--brand-forest) focus-visible:ring-offset-2';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      onError('Please select at least one file');
      return;
    }

    setUploading(true);
    setLoading(true);
    onError('');

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to process files');
      }

      const data = await response.json();

      if (data.success) {
        onFilesProcessed(data.contacts);
      } else {
        throw new Error(data.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      onError(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-(--brand-moss) bg-white/90 p-8 shadow-[0_25px_60px_-45px_rgba(0,0,0,0.6)] backdrop-blur">
      <h2 className="text-2xl font-semibold text-(--brand-graphite) mb-6">Upload Proposal Files</h2>

      <div className="space-y-6">
        {/* File Input */}
        <div>
          <label className="block text-sm font-medium text-(--brand-slate) mb-2">
            Select Files (PDF, Excel, Text)
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept=".pdf,.xlsx,.xls,.txt"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`${primaryButtonBase} ${primaryButtonSmPadding} ${primaryButtonEnabled}`}
            >
              Choose Files
            </button>
            <span className="text-sm text-(--brand-slate)">
              {selectedFiles.length} file(s) selected
            </span>
          </div>
        </div>

        {/* Selected Files List */}
        {selectedFiles.length > 0 && (
          <div className="rounded-xl border border-(--brand-moss) bg-(--brand-ivory)/70 p-4">
            <h3 className="text-sm font-semibold text-(--brand-graphite) mb-3">Selected Files:</h3>
            <ul className="space-y-2">
              {selectedFiles.map((file, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-white/80 p-2"
                >
                  <div className="flex items-center space-x-3">
                    <FileIcon extension={file.name.split('.').pop() || ''} />
                    <div>
                      <p className="text-sm font-semibold text-(--brand-graphite)">{file.name}</p>
                      <p className="text-xs text-(--brand-slate)">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-sm font-semibold text-(--brand-forest) hover:text-(--brand-forest-dark)"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upload Button */}
        <div className="flex flex-wrap justify-end gap-3">
          <button
            onClick={onDemo}
            disabled={demoLoading || uploading}
            className={`${secondaryButtonClass} ${
              demoLoading || uploading ? 'cursor-not-allowed opacity-60' : ''
            }`}
          >
            {demoLoading ? 'Loading Demo...' : 'Try Demo'}
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
            className={`${primaryButtonBase} ${primaryButtonLgPadding} ${
              uploading || selectedFiles.length === 0 ? primaryButtonDisabled : primaryButtonEnabled
            }`}
          >
            {uploading ? 'Processing...' : 'Process Files'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper component for file icons
function FileIcon({ extension }: { extension: string }) {
  const colors: Record<string, string> = {
    pdf: 'bg-red-100 text-red-600',
    xlsx: 'bg-green-100 text-green-600',
    xls: 'bg-green-100 text-green-600',
    txt: 'bg-gray-100 text-gray-600',
  };

  const color = colors[extension.toLowerCase()] || 'bg-gray-100 text-gray-600';

  return (
    <div className={`w-8 h-8 rounded flex items-center justify-center ${color}`}>
      <span className="text-xs font-bold uppercase">{extension}</span>
    </div>
  );
}
