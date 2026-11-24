"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Send } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import LoanList from "@/components/LoanList";
import { EmptyState, PageHeader } from "@/components/ui";

export default function MyRequestsPage() {
  const loans = useQuery(api.loans.myRequests);
  const cancel = useMutation(api.loans.cancel);
  return (
    <div>
      <PageHeader title="My requests" subtitle="Things you've asked to borrow and where each request stands." />
      <LoanList
        loans={loans}
        perspective="borrower"
        empty={
          <EmptyState
            icon={Send}
            title="No requests yet"
            body="Find something on the board and send your first borrow request."
            action={
              <Link href="/app" className="btn-primary">
                Browse tools
              </Link>
            }
          />
        }
        actions={(l, run) =>
          l.status === "pending" && (
            <button className="btn-secondary" onClick={() => run(() => cancel({ loanId: l._id }))}>
              Cancel request
            </button>
          )
        }
      />
    </div>
  );
}
