export const VisitStatus = {
  REGISTERED: "REGISTERED",
  CHECKED_IN: "CHECKED_IN",
  CHECKOUT_PENDING: "CHECKOUT_PENDING",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
  ESCALATED: "ESCALATED",
} as const;

export type VisitStatusType =
  (typeof VisitStatus)[keyof typeof VisitStatus];

export const allowedTransitions: Record<VisitStatusType, VisitStatusType[]> = {
  REGISTERED: ["CHECKED_IN", "REJECTED", "CANCELLED"],
  CHECKED_IN: ["CHECKOUT_PENDING", "COMPLETED", "ESCALATED"],
  CHECKOUT_PENDING: ["COMPLETED", "ESCALATED"],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
  ESCALATED: ["COMPLETED"],
};

export function canTransition(
  from: VisitStatusType,
  to: VisitStatusType
) {
  return allowedTransitions[from]?.includes(to);
}
