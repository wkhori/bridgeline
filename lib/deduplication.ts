import { ExtractedContact, SubcontractorGroup } from '@/types';

/**
 * Calculate Jaccard similarity between two strings
 */
function similarityScore(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Jaccard similarity: intersection over union
  const chars1 = new Set(s1.split(''));
  const chars2 = new Set(s2.split(''));
  const intersection = new Set([...chars1].filter((x) => chars2.has(x)));
  const union = new Set([...chars1, ...chars2]);

  return intersection.size / union.size;
}

/**
 * Check if two contacts are duplicates using multiple strategies
 */
function areDuplicates(contact1: ExtractedContact, contact2: ExtractedContact): boolean {
  // Exact email match (highest confidence)
  if (contact1.email && contact2.email && contact1.email === contact2.email) {
    return true;
  }

  // Exact phone match
  if (contact1.phone && contact2.phone && contact1.phone === contact2.phone) {
    return true;
  }

  // Company name + contact name similarity
  if (contact1.companyName && contact2.companyName) {
    const companySimilarity = similarityScore(contact1.companyName, contact2.companyName);

    if (companySimilarity > 0.85) {
      if (contact1.contactName && contact2.contactName) {
        const nameSimilarity = similarityScore(contact1.contactName, contact2.contactName);
        if (nameSimilarity > 0.8) return true;
      }

      if (contact1.email && contact2.email) {
        const emailBase1 = contact1.email.split('@')[0];
        const emailBase2 = contact2.email.split('@')[0];
        if (similarityScore(emailBase1, emailBase2) > 0.8) return true;
      }
    }
  }

  return false;
}

/**
 * Merge two contacts by selecting highest-confidence values for each field
 */
function mergeContacts(contact1: ExtractedContact, contact2: ExtractedContact): ExtractedContact {
  const selectField = <K extends keyof ExtractedContact>(
    field: K,
    confidenceKey: keyof ExtractedContact['confidence'],
  ): ExtractedContact[K] => {
    return contact1.confidence[confidenceKey] >= contact2.confidence[confidenceKey]
      ? contact1[field]
      : contact2[field];
  };

  return {
    id: contact1.id,
    companyName: selectField('companyName', 'companyName'),
    contactName: selectField('contactName', 'contactName'),
    email: selectField('email', 'email'),
    phone: selectField('phone', 'phone'),
    trade: selectField('trade', 'trade'),
    confidence: {
      companyName: Math.max(contact1.confidence.companyName, contact2.confidence.companyName),
      contactName: Math.max(contact1.confidence.contactName, contact2.confidence.contactName),
      email: Math.max(contact1.confidence.email, contact2.confidence.email),
      phone: Math.max(contact1.confidence.phone, contact2.confidence.phone),
      trade: Math.max(contact1.confidence.trade, contact2.confidence.trade),
      overall: Math.max(contact1.confidence.overall || 0, contact2.confidence.overall || 0),
    },
    source: `${contact1.source}, ${contact2.source}`,
    rawText: contact1.rawText,
  };
}

/**
 * Group contacts by company and handle duplicates
 */
export function deduplicateAndGroup(contacts: ExtractedContact[]): SubcontractorGroup[] {
  const groups: SubcontractorGroup[] = [];

  for (const contact of contacts) {
    let foundGroup = false;

    for (const group of groups) {
      for (const existingContact of group.contacts) {
        if (areDuplicates(contact, existingContact)) {
          const merged = mergeContacts(existingContact, contact);
          group.contacts = [merged];
          group.mergedFrom = group.mergedFrom || [];
          group.mergedFrom.push(contact.source);
          group.isDuplicate = true;
          foundGroup = true;
          break;
        }
      }
      if (foundGroup) break;
    }

    if (!foundGroup) {
      groups.push({
        companyName: contact.companyName || 'Unknown Company',
        contacts: [contact],
        trade: contact.trade,
        isDuplicate: false,
      });
    }
  }

  return groups;
}

/**
 * Group contacts by company, preserving multiple distinct contacts per company
 */
export function groupByCompany(contacts: ExtractedContact[]): SubcontractorGroup[] {
  const companyMap = new Map<string, ExtractedContact[]>();

  for (const contact of contacts) {
    const companyKey = (contact.companyName || contact.email || contact.id).toLowerCase();
    const existing = companyMap.get(companyKey);

    if (existing) {
      existing.push(contact);
    } else {
      companyMap.set(companyKey, [contact]);
    }
  }

  const groups: SubcontractorGroup[] = [];

  for (const groupContacts of companyMap.values()) {
    if (groupContacts.length > 1) {
      const uniqueContacts: ExtractedContact[] = [];

      for (const contact of groupContacts) {
        const isDup = uniqueContacts.some(
          (existing) =>
            existing.email === contact.email ||
            existing.phone === contact.phone ||
            (existing.contactName &&
              contact.contactName &&
              existing.contactName === contact.contactName),
        );

        if (!isDup) {
          uniqueContacts.push(contact);
        }
      }

      groups.push({
        companyName: groupContacts[0].companyName || 'Unknown Company',
        contacts: uniqueContacts,
        trade: groupContacts[0].trade,
        isDuplicate: uniqueContacts.length < groupContacts.length,
        mergedFrom:
          uniqueContacts.length < groupContacts.length
            ? groupContacts.map((c) => c.source)
            : undefined,
      });
    } else {
      groups.push({
        companyName: groupContacts[0].companyName || 'Unknown Company',
        contacts: groupContacts,
        trade: groupContacts[0].trade,
        isDuplicate: false,
      });
    }
  }

  return groups;
}

export function mergeGroupingStrategies(
  deduped: SubcontractorGroup[],
  grouped: SubcontractorGroup[],
): SubcontractorGroup[] {
  const result: SubcontractorGroup[] = [];

  deduped.forEach((dedupedGroup) => {
    const companyKey = dedupedGroup.companyName.toLowerCase();
    const matchingGroup = grouped.find((g) => g.companyName.toLowerCase() === companyKey);

    if (matchingGroup && matchingGroup.contacts.length > dedupedGroup.contacts.length) {
      result.push(matchingGroup);
    } else {
      result.push(dedupedGroup);
    }
  });

  return result;
}
