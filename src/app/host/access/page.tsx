import { Suspense } from "react";
import HostAccessClient from "./host-access-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function HostAccessPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <HostAccessClient />
    </Suspense>
  );
}
