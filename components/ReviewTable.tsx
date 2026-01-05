'use client';

import { useState } from 'react';
import { ExtractedContact } from '@/types';

interface ReviewTableProps {
  contacts: ExtractedContact[];
  onComplete: (contacts: ExtractedContact[]) => void;
  onBack: () => void;
}

export default function ReviewTable({ contacts, onComplete, onBack }: ReviewTableProps) {
  const [editedContacts, setEditedContacts] = useState<ExtractedContact[]>(contacts);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(
    new Set(contacts.map((c) => c.id)),
  );
  const inputClassName =
    'w-full rounded-md border border-(--brand-moss) px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-forest)';
  const secondaryButtonClass =
    'rounded-full border border-(--brand-moss) px-6 py-3 text-sm font-semibold text-(--brand-slate) transition hover:border-(--brand-forest) hover:text-(--brand-graphite)';
  const actionButtonBase =
    'rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-forest) focus-visible:ring-offset-2';
  const actionButtonEnabled = 'bg-(--brand-forest) text-white hover:bg-(--brand-forest-dark)';
  const actionButtonDisabled = 'bg-gray-200 text-gray-400 cursor-not-allowed';

  const updateContact = (id: string, field: keyof ExtractedContact, value: string) => {
    setEditedContacts((prev) =>
      prev.map((contact) => (contact.id === id ? { ...contact, [field]: value } : contact)),
    );
  };

  const toggleContact = (id: string) => {
    setSelectedContacts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleContinue = () => {
    const confirmed = editedContacts.filter((c) => selectedContacts.has(c.id));
    onComplete(confirmed);
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence > 0) return 'Low';
    return 'None';
  };

  return (
    <div className="rounded-2xl border border-(--brand-moss) bg-white/90 p-8 shadow-[0_25px_60px_-45px_rgba(0,0,0,0.6)] backdrop-blur">
      <h2 className="text-2xl font-semibold text-(--brand-graphite) mb-6">
        Review & Edit Extracted Data
      </h2>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="rounded-xl border border-(--brand-moss) bg-(--brand-ivory)/70 p-4">
          <p className="text-sm text-(--brand-slate)">
            <strong>Review:</strong> Please verify the extracted information below. Edit any
            incorrect fields, and uncheck any entries you want to exclude.
            <br />
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-(--brand-moss)">
          <thead className="bg-(--brand-ivory)">
            <tr>
              {[
                'Include',
                'Company Name',
                'Contact Name',
                'Email',
                'Phone',
                'Trade',
                'Confidence',
                'Source',
              ].map((label) => (
                <th
                  key={label}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-(--brand-slate)"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-(--brand-moss)">
            {editedContacts.map((contact) => {
              const overallConf = contact.confidence.overall || 0;
              return (
                <tr key={contact.id} className="hover:bg-(--brand-ivory)/70">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedContacts.has(contact.id)}
                      onChange={() => toggleContact(contact.id)}
                      className="h-4 w-4 rounded accent-(--brand-forest)"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={contact.companyName || ''}
                      onChange={(e) => updateContact(contact.id, 'companyName', e.target.value)}
                      className={inputClassName}
                      placeholder="Company name"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={contact.contactName || ''}
                      onChange={(e) => updateContact(contact.id, 'contactName', e.target.value)}
                      className={inputClassName}
                      placeholder="Contact name"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="email"
                      value={contact.email || ''}
                      onChange={(e) => updateContact(contact.id, 'email', e.target.value)}
                      className={inputClassName}
                      placeholder="email@example.com"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="tel"
                      value={contact.phone || ''}
                      onChange={(e) => updateContact(contact.id, 'phone', e.target.value)}
                      className={inputClassName}
                      placeholder="(555) 555-5555"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={contact.trade || ''}
                      onChange={(e) => updateContact(contact.id, 'trade', e.target.value)}
                      className={inputClassName}
                      placeholder="Trade/scope"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <ConfidenceBadge
                      confidence={overallConf}
                      getColor={getConfidenceColor}
                      getLabel={getConfidenceLabel}
                    />
                  </td>
                  <td className="px-4 py-3 text-xs text-(--brand-slate)">{contact.source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={onBack} className={secondaryButtonClass}>
          Back to Upload
        </button>

        <div className="flex items-center space-x-4">
          <span className="text-sm text-(--brand-slate)">
            {selectedContacts.size} of {editedContacts.length} selected
          </span>
          <button
            onClick={handleContinue}
            disabled={selectedContacts.size === 0}
            className={`${actionButtonBase} ${
              selectedContacts.size === 0 ? actionButtonDisabled : actionButtonEnabled
            }`}
          >
            Generate ITB
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfidenceBadge({
  confidence,
  getColor,
  getLabel,
}: {
  confidence: number;
  getColor: (c: number) => string;
  getLabel: (c: number) => string;
}) {
  if (confidence === 0) return null;

  return (
    <span className={`text-xs ${getColor(confidence)} font-medium`}>
      {getLabel(confidence)} ({(confidence * 100).toFixed(0)}%)
    </span>
  );
}
