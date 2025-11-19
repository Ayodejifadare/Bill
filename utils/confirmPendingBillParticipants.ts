import { apiClient } from "./apiClient";

interface RawParticipant {
  userId?: string | null;
  name?: string;
  amount?: number | string;
  paid?: boolean;
  isPaid?: boolean;
  status?: string;
}

interface BillSplitResponse {
  creatorId?: string;
  participants?: RawParticipant[];
}

export interface ConfirmPendingResult {
  confirmed: number;
  pendingOwingCount: number;
  actionableCount: number;
  skippedCount: number;
  confirmedNames: string[];
}

const isPaid = (participant: RawParticipant): boolean => {
  if (typeof participant?.paid === "boolean") return participant.paid;
  if (typeof participant?.isPaid === "boolean") return participant.isPaid;
  const status = typeof participant?.status === "string"
    ? participant.status.toLowerCase()
    : "";
  return status === "paid" || status === "confirmed";
};

const getAmount = (participant: RawParticipant): number => {
  if (typeof participant?.amount === "number") return participant.amount;
  if (typeof participant?.amount === "string") {
    const parsed = Number(participant.amount);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

/**
 * Confirms all pending & owing participants for a bill split by calling the
 * existing confirm-payment endpoint sequentially. It mirrors the manual
 * confirmation notification flow so settle actions can safely proceed.
 */
export async function confirmPendingBillParticipants(
  billSplitId: string,
): Promise<ConfirmPendingResult> {
  const data = await apiClient(`/bill-splits/${billSplitId}`);
  const bill: BillSplitResponse = data?.billSplit ?? data ?? {};
  const participants: RawParticipant[] = Array.isArray(bill?.participants)
    ? bill.participants
    : [];

  const pendingOwing = participants.filter((participant) => {
    if (!participant) return false;
    if (isPaid(participant)) return false;
    return getAmount(participant) > 0;
  });

  const actionable = pendingOwing.filter(
    (participant) =>
      typeof participant?.userId === "string" &&
      participant.userId !== bill?.creatorId,
  );

  const confirmedNames: string[] = [];
  for (const participant of actionable) {
    const participantUserId = participant.userId as string;
    await apiClient(`/bill-splits/${billSplitId}/confirm-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantUserId }),
    });
    if (participant?.name) {
      confirmedNames.push(participant.name);
    }
  }

  return {
    confirmed: confirmedNames.length,
    pendingOwingCount: pendingOwing.length,
    actionableCount: actionable.length,
    skippedCount: pendingOwing.length - actionable.length,
    confirmedNames,
  };
}
