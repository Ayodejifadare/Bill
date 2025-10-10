export type TransactionType =
  | "sent"
  | "received"
  | "split"
  | "bill_split"
  | "request";
export type TransactionStatus = "completed" | "pending" | "failed";
export type TransactionCategory =
  | "food"
  | "rent"
  | "utilities"
  | "entertainment"
  | "other";

export const TRANSACTION_TYPE_MAP: Record<string, TransactionType>;
export const TRANSACTION_STATUS_MAP: Record<string, TransactionStatus>;
export const TRANSACTION_CATEGORY_MAP: Record<string, TransactionCategory>;
