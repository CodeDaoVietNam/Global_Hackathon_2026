const CONTRIBUTOR_KEY = "contextcue_contributor_id";
const RECEIPTS_KEY = "contextcue_contribution_receipts";

export function getOrCreateContributorId(): string {
  let id = localStorage.getItem(CONTRIBUTOR_KEY);
  if (!id) {
    id = "anon-" + Math.random().toString(36).substring(2, 11);
    localStorage.setItem(CONTRIBUTOR_KEY, id);
  }
  return id;
}

export function saveReceiptId(receiptId: string): void {
  const receipts = getSavedReceiptIds();
  if (!receipts.includes(receiptId)) {
    receipts.unshift(receiptId);
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts.slice(0, 20)));
  }
}

export function getSavedReceiptIds(): string[] {
  try {
    const raw = localStorage.getItem(RECEIPTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
