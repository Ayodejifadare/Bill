import { scheduleRecurringBillSplits } from "./recurringBillSplitScheduler.js";
import { scheduleRecurringRequests } from "./recurringRequestScheduler.js";

export function initSchedulers(prisma) {
  if (process.env.ENABLE_SCHEDULERS === "false") {
    console.log("Schedulers disabled via ENABLE_SCHEDULERS flag");
    return;
  }
  scheduleRecurringBillSplits(prisma);
  scheduleRecurringRequests(prisma);
}
