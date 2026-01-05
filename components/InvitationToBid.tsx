'use client';

import { SubcontractorGroup } from '@/types';

interface InvitationToBidProps {
  groups: SubcontractorGroup[];
  onBack: () => void;
  onReset: () => void;
}

export default function InvitationToBid({ groups, onBack, onReset }: InvitationToBidProps) {
  const secondaryButtonClass =
    'rounded-full border border-(--brand-moss) px-4 py-2 text-sm font-semibold ' +
    'text-(--brand-slate) transition hover:border-(--brand-forest) hover:text-(--brand-graphite)';
  const primaryButtonClass =
    'rounded-full bg-(--brand-forest) px-4 py-2 text-sm font-semibold text-white ' +
    'transition hover:bg-(--brand-forest-dark)';

  return (
    <div className="rounded-2xl border border-(--brand-moss) bg-white/90 p-8 shadow-[0_25px_60px_-45px_rgba(0,0,0,0.6)] backdrop-blur">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-(--brand-graphite)">Invitation to Bid</h2>
          <p className="text-sm text-(--brand-slate) mt-1">
            Mock ITB - Populated with extracted subcontractor information
          </p>
        </div>
        <div className="flex space-x-3">
          <button onClick={onBack} className={secondaryButtonClass}>
            Back to Review
          </button>
          <button onClick={onReset} className={primaryButtonClass}>
            Start Over
          </button>
        </div>
      </div>

      {/* ITB Header Information */}
      <div className="mb-6 rounded-xl border border-(--brand-moss) bg-(--brand-ivory)/80 p-6">
        <h3 className="mb-4 text-lg font-semibold text-(--brand-graphite)">Project Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-(--brand-slate)">Project Name</label>
            <p className="mt-1 text-sm font-semibold text-(--brand-graphite)">
              Sample Construction Project
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-(--brand-slate)">Bid Deadline</label>
            <p className="mt-1 text-sm font-semibold text-(--brand-graphite)">
              {new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-(--brand-slate)">
              Total Subcontractors
            </label>
            <p className="mt-1 text-sm font-semibold text-(--brand-graphite)">{groups.length}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-(--brand-slate)">Total Contacts</label>
            <p className="mt-1 text-sm font-semibold text-(--brand-graphite)">
              {groups.reduce((sum, g) => sum + g.contacts.length, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Subcontractor List */}
      <div className="overflow-hidden rounded-xl border border-(--brand-moss)">
        <div className="border-b border-(--brand-moss) bg-(--brand-ivory) px-6 py-3">
          <h3 className="text-lg font-semibold text-(--brand-graphite)">Invited Subcontractors</h3>
        </div>

        <div className="divide-y divide-(--brand-moss)">
          {groups.map((group, index) => (
            <div key={index} className="p-6 hover:bg-(--brand-ivory)/70">
              {/* Company Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-lg font-semibold text-(--brand-graphite)">
                      {group.companyName}
                    </h4>
                    {group.isDuplicate && (
                      <span className="rounded-full bg-(--brand-moss) px-3 py-1 text-xs font-semibold text-(--brand-forest-dark)">
                        Merged from {group.mergedFrom?.length || 1} source(s)
                      </span>
                    )}
                  </div>
                  {group.trade && (
                    <div className="mt-1 flex items-center space-x-2">
                      <span className="text-sm font-medium text-(--brand-slate)">Trade:</span>
                      <span className="rounded-full bg-(--brand-forest)/10 px-3 py-1 text-xs font-semibold text-(--brand-forest)">
                        {group.trade}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Contacts */}
              <div className="space-y-3">
                {group.contacts.map((contact, contactIndex) => (
                  <div key={contactIndex} className="border-l-2 border-(--brand-moss) pl-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {contact.contactName && (
                        <div>
                          <span className="text-xs font-medium text-(--brand-slate)">Contact:</span>
                          <p className="text-sm text-(--brand-graphite)">{contact.contactName}</p>
                        </div>
                      )}
                      {contact.email && (
                        <div>
                          <span className="text-xs font-medium text-(--brand-slate)">Email:</span>
                          <p className="text-sm text-(--brand-graphite)">
                            <a
                              href={`mailto:${contact.email}`}
                              className="text-(--brand-forest) hover:underline"
                            >
                              {contact.email}
                            </a>
                          </p>
                        </div>
                      )}
                      {contact.phone && (
                        <div>
                          <span className="text-xs font-medium text-(--brand-slate)">Phone:</span>
                          <p className="text-sm text-(--brand-graphite)">
                            <a
                              href={`tel:${contact.phone}`}
                              className="text-(--brand-forest) hover:underline"
                            >
                              {contact.phone}
                            </a>
                          </p>
                        </div>
                      )}
                    </div>
                    {group.contacts.length > 1 && (
                      <p className="mt-1 text-xs text-(--brand-slate)">
                        Contact {contactIndex + 1} of {group.contacts.length}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Source Files */}
              {group.mergedFrom && (
                <div className="mt-3 border-t border-(--brand-moss) pt-3">
                  <p className="text-xs text-(--brand-slate)">
                    <strong>Sources:</strong> {group.mergedFrom.join(', ')}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-(--brand-moss) bg-(--brand-ivory)/80 p-4">
          <p className="text-sm font-medium text-(--brand-slate)">Total Companies</p>
          <p className="mt-1 text-2xl font-semibold text-(--brand-forest)">{groups.length}</p>
        </div>
        <div className="rounded-xl border border-(--brand-moss) bg-(--brand-ivory)/80 p-4">
          <p className="text-sm font-medium text-(--brand-slate)">Total Contacts</p>
          <p className="mt-1 text-2xl font-semibold text-(--brand-forest)">
            {groups.reduce((sum, g) => sum + g.contacts.length, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-(--brand-moss) bg-(--brand-ivory)/80 p-4">
          <p className="text-sm font-medium text-(--brand-slate)">Duplicates Merged</p>
          <p className="mt-1 text-2xl font-semibold text-(--brand-forest)">
            {groups.filter((g) => g.isDuplicate).length}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 rounded-xl border border-(--brand-moss) bg-(--brand-ivory)/70 p-4">
        <p className="mb-3 text-sm text-(--brand-slate)">
          <strong>Next Steps:</strong> In a production system, you would be able to:
        </p>
        <ul className="list-inside list-disc space-y-1 text-sm text-(--brand-slate)">
          <li>Send invitation emails to all subcontractors</li>
          <li>Export this data to your bidding system</li>
          <li>Track responses and manage the bidding process</li>
          <li>Generate reports and analytics</li>
        </ul>
      </div>
    </div>
  );
}
