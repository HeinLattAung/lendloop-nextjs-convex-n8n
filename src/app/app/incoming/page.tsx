"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import LoanList from "@/components/LoanList";

export default function IncomingPage() {
  const loans = useQuery(api.loans.incoming);
  const respond = useMutation(api.loans.respond);
  const markReturned = useMutation(api.loans.markReturned);
  return (
    <LoanList
      loans={loans}
      perspective="lender"
      empty="No one has asked to borrow your tools yet."
      actions={(l, run) => (
        <>
          {l.status === "pending" && (
            <>
              <button className="btn-primary" onClick={() => run(() => respond({ loanId: l._id, decision: "approved" }))}>
                Approve
              </button>
              <button className="btn-secondary" onClick={() => run(() => respond({ loanId: l._id, decision: "declined" }))}>
                Decline
              </button>
            </>
          )}
          {l.status === "approved" && (
            <button className="btn-secondary" onClick={() => run(() => markReturned({ loanId: l._id }))}>
              Mark returned
            </button>
          )}
        </>
      )}
    />
  );
}
