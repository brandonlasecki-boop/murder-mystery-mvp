import { Suspense } from "react";
import SuccessClient from "./success-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <SuccessClient />
    </Suspense>
  );
}
