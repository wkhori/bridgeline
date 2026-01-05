'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ExtractedContact, SubcontractorGroup } from '@/types';
import { deduplicateAndGroup, groupByCompany, mergeGroupingStrategies } from '@/lib/deduplication';
import FileUpload from '@/components/FileUpload';
import ReviewTable from '@/components/ReviewTable';
import InvitationToBid from '@/components/InvitationToBid';

type Step = 'upload' | 'review' | 'itb';

export default function Home() {
  const [step, setStep] = useState<Step>('upload');
  const [contacts, setContacts] = useState<ExtractedContact[]>([]);
  const [groups, setGroups] = useState<SubcontractorGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesProcessed = (processedContacts: ExtractedContact[]) => {
    setContacts(processedContacts);
    setStep('review');
  };

  const handleReviewComplete = (editedContacts: ExtractedContact[]) => {
    // Apply deduplication and grouping
    const deduped = deduplicateAndGroup(editedContacts);
    const grouped = groupByCompany(editedContacts);

    // Merge the two approaches for best results
    const finalGroups = mergeGroupingStrategies(deduped, grouped);

    setGroups(finalGroups);
    setStep('itb');
  };

  const handleBack = () => {
    if (step === 'itb') {
      setStep('review');
    } else if (step === 'review') {
      setStep('upload');
    }
  };

  const handleReset = () => {
    setStep('upload');
    setContacts([]);
    setGroups([]);
    setError(null);
  };

  const handleDemo = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/demo');
      if (!response.ok) {
        throw new Error('Failed to load demo files');
      }

      const data = await response.json();
      if (data.success) {
        setContacts(data.contacts);
        setStep('review');
      } else {
        throw new Error(data.error || 'Demo processing failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load demo files');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-(--brand-mist) px-4 py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-24 h-104 w-104 rounded-full bg-(--brand-moss) opacity-70 blur-3xl" />
        <div className="absolute -bottom-48 -left-24 h-112 w-md rounded-full bg-(--brand-ivory) opacity-90 blur-3xl" />
      </div>
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-10">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="shrink-0">
            <Image src="/logo.png" alt="Bridgeline Technologies" width={240} height={64} priority />
          </div>
          <div className="max-w-2xl text-left">
            <h1 className="text-4xl font-semibold tracking-tight text-(--brand-graphite) md:text-5xl">
              Proposal Intake Demo
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-(--brand-slate)">
              Automate subcontractor proposal processing, reconcile duplicates, and generate a
              ready-to-send Invitation to Bid in minutes.
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <StepIndicator
            number={1}
            title="Upload"
            active={step === 'upload'}
            completed={step === 'review' || step === 'itb'}
          />
          <div className="hidden h-px w-16 bg-[linear-gradient(90deg,#0b5b2a,#1c1f1c)] md:block" />
          <StepIndicator
            number={2}
            title="Review"
            active={step === 'review'}
            completed={step === 'itb'}
          />
          <div className="hidden h-px w-16 bg-[linear-gradient(90deg,#0b5b2a,#1c1f1c)] md:block" />
          <StepIndicator number={3} title="ITB" active={step === 'itb'} completed={false} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="w-full">
          {step === 'upload' && (
            <FileUpload
              onFilesProcessed={handleFilesProcessed}
              onError={setError}
              setLoading={setLoading}
              onDemo={handleDemo}
              demoLoading={loading}
            />
          )}

          {step === 'review' && (
            <ReviewTable
              contacts={contacts}
              onComplete={handleReviewComplete}
              onBack={handleBack}
            />
          )}

          {step === 'itb' && (
            <InvitationToBid groups={groups} onBack={handleBack} onReset={handleReset} />
          )}
        </div>
      </div>
    </main>
  );
}

// Helper component for step indicators
function StepIndicator({
  number,
  title,
  active,
  completed,
}: {
  number: number;
  title: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold tracking-tight ${
          completed
            ? 'bg-(--brand-forest-dark) text-white'
            : active
              ? 'bg-(--brand-forest) text-white'
              : 'bg-white text-(--brand-slate) ring-1 ring-(--brand-moss)'
        }`}
      >
        {completed ? '✓' : number}
      </div>
      <span className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-(--brand-slate)">
        {title}
      </span>
    </div>
  );
}
