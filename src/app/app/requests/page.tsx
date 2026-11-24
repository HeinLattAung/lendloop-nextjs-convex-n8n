"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import LoanList from "@/components/LoanList";

export default function MyRequestsPage() {
  const loans = useQuery(api.loans.myRequests);
  const cancel = useMutation(api.loans.cancel);
  return (
    <LoanList
      loans={loans}
      perspective="borrower"
      empty="You haven't requested anything yet. Browse the board to find a tool."
      actions={(l, run) =>
        l.status === "pending" && (
          <button className="btn-secondary" onClick={() => run(() => cancel({ loanId: l._id }))}>
            Cancel request
          </button>
        )
      }
    />
  );
}
