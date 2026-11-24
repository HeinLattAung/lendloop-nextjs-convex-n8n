"use client";

import { useMutation, useQuery } from "convex/react";
import { Check, Inbox, Undo2, X } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import LoanList from "@/components/LoanList";
import { EmptyState, PageHeader } from "@/components/ui";

export default function IncomingPage() {
  const loans = useQuery(api.loans.incoming);
  const respond = useMutation(api.loans.respond);
  const markReturned = useMutation(api.loans.markReturned);
  const pending = loans?.filter((l) => l.status === "pending").length ?? 0;
  return (
    <div>
      <PageHeader
        title="Incoming requests"
        subtitle={pending > 0 ? `${pending} waiting for your answer` : "Requests from neighbors to borrow your tools."}
      />
      <LoanList
        loans={loans}
        perspective="lender"
        empty={
          <EmptyState icon={Inbox} title="Inbox zero" body="No one has asked to borrow your tools yet. Requests show up here instantly." />
        }
        actions={(l, run) => (
          <>
            {l.status === "pending" && (
              <>
                <button
                  className="btn-secondary"
                  onClick={() => run(() => respond({ loanId: l._id, decision: "declined" }))}
                >
                  <X className="size-4" /> Decline
                </button>
                <button
                  className="btn-primary"
                  onClick={() => run(() => respond({ loanId: l._id, decision: "approved" }))}
                >
                  <Check className="size-4" /> Approve
                </button>
              </>
            )}
            {l.status === "approved" && (
              <button className="btn-secondary" onClick={() => run(() => markReturned({ loanId: l._id }))}>
                <Undo2 className="size-4" /> Mark returned
              </button>
            )}
          </>
        )}
      />
    </div>
  );
}
