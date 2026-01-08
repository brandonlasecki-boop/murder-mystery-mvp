import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: 760, margin: "40px auto", padding: 16 }}>
      <h1>Murder Night (MVP)</h1>
      <p>Create a game room, share player codes, unlock rounds.</p>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <Link href="/create">Create Game Room (Host)</Link>
        <Link href="/join">Join With Code (Player)</Link>
      </div>
    </main>
  );
}
