"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();

  // ✅ host access via purchase code only
  const [purchaseCode, setPurchaseCode] = useState("");
  const [hostError, setHostError] = useState<string | null>(null);

  // ✅ simple dropdown for links
  const [linkOpen, setLinkOpen] = useState(false);

  const theme = useMemo(() => {
    return {
      bg: `radial-gradient(900px 520px at 15% 10%, rgba(177,29,42,0.18), transparent 60%),
           radial-gradient(900px 520px at 85% 0%, rgba(210,180,140,0.12), transparent 60%),
           linear-gradient(180deg, #0b0d10, #07080a)`,
      gold: "#d4af37",
      cream: "rgba(255,255,255,0.92)",
      muted: "rgba(255,255,255,0.72)",
      dim: "rgba(255,255,255,0.56)",
      shadow: "0 18px 65px rgba(0,0,0,0.55)",
      sans:
        "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
      mono:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      serif: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
    };
  }, []);

  function normalizeCode(s: string) {
    return (s ?? "").trim();
  }

  // ✅ robust scroll helper (hash + scrollIntoView + fallback)
  function goToId(id: string) {
    if (typeof window === "undefined") return;
    window.location.hash = id;

    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ✅ Pricing should ALWAYS go to /pricing
  function goPricing() {
    router.push("/pricing");
  }

  function goHostWithPurchaseCode() {
    const code = normalizeCode(purchaseCode);
    if (!code || code.length < 6) {
      setHostError("Enter your purchase code.");
      return;
    }
    setHostError(null);

    router.push(`/host/access?code=${encodeURIComponent(code)}`);
  }

  function goDemo() {
    router.push(`/`);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const Feature = (props: { title: string; body: string; icon: string }) => (
    <div className="card">
      <div className="icon">{props.icon}</div>
      <div>
        <div className="cardTitle">{props.title}</div>
        <div className="cardBody">{props.body}</div>
      </div>
    </div>
  );

  const Pill = (props: { children: React.ReactNode }) => (
    <span className="pill">{props.children}</span>
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.cream,
        fontFamily: theme.sans,
      }}
      onClick={() => setLinkOpen(false)}
    >
      <style jsx>{`
        :global(html, body) {
          height: 100%;
        }
        :global(*) {
          box-sizing: border-box;
        }

        .wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 22px 18px 72px;
        }

        /* Top nav */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          padding: 10px 0 6px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 240px;
        }
        .mark {
          width: 34px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid rgba(212, 175, 55, 0.24);
          background: linear-gradient(
            180deg,
            rgba(212, 175, 55, 0.2),
            rgba(177, 29, 42, 0.18)
          );
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
          display: grid;
          place-items: center;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.92);
          font-family: ${theme.serif};
          letter-spacing: 0.2px;
        }
        .brandTitle {
          font-weight: 900;
          letter-spacing: 0.2px;
          font-size: 14px;
        }
        .brandSub {
          font-size: 12px;
          color: ${theme.dim};
          margin-top: 2px;
        }

        .navRight {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
          color: rgba(255, 255, 255, 0.82);
          font-size: 12px;
        }
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: rgba(177, 29, 42, 0.9);
          box-shadow: 0 0 0 3px rgba(177, 29, 42, 0.12);
        }

        .btn {
          border-radius: 12px;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(0, 0, 0, 0.18);
          color: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          font-weight: 900;
          font-family: ${theme.sans};
          letter-spacing: 0.2px;
          min-height: 44px; /* ✅ tap target */
        }
        .btn:hover {
          border-color: rgba(255, 255, 255, 0.2);
          background: rgba(0, 0, 0, 0.24);
        }
        .btnPrimary {
          border: 1px solid rgba(212, 175, 55, 0.26);
          background: rgba(177, 29, 42, 0.78);
          box-shadow: 0 16px 45px rgba(177, 29, 42, 0.22);
        }
        .btnPrimary:hover {
          background: rgba(177, 29, 42, 0.9);
        }
        .btnGold {
          border: 1px solid rgba(212, 175, 55, 0.34);
          background: rgba(212, 175, 55, 0.12);
        }
        .btnGold:hover {
          background: rgba(212, 175, 55, 0.16);
        }

        /* link dropdown */
        .menuWrap {
          position: relative;
        }
        .menuBtn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .menu {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          width: 220px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(14, 16, 20, 0.92);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
          overflow: hidden;
          z-index: 50;
          backdrop-filter: blur(10px);
        }
        .menuItem {
          width: 100%;
          text-align: left;
          padding: 10px 12px;
          border: 0;
          background: transparent;
          color: rgba(255, 255, 255, 0.9);
          cursor: pointer;
          font-family: ${theme.sans};
          font-weight: 800;
          letter-spacing: 0.2px;
          min-height: 44px; /* ✅ tap target */
        }
        .menuItem:hover {
          background: rgba(255, 255, 255, 0.06);
        }
        .menuSub {
          display: block;
          margin-top: 4px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.62);
          font-size: 12px;
        }
        .menuHr {
          height: 1px;
          background: rgba(255, 255, 255, 0.08);
        }

        /* Hero */
        .hero {
          margin-top: 18px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(
            180deg,
            rgba(16, 18, 22, 0.86),
            rgba(16, 18, 22, 0.52)
          );
          box-shadow: ${theme.shadow};
          overflow: hidden;
          position: relative;
        }
        .heroGlow {
          position: absolute;
          inset: -120px -120px auto -120px;
          height: 260px;
          background: radial-gradient(
            520px 240px at 30% 40%,
            rgba(212, 175, 55, 0.18),
            transparent 60%
          );
          pointer-events: none;
        }
        .heroRow {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .wrap {
            padding: 16px 14px 60px;
          }
          .nav {
            padding: 6px 0 4px;
            gap: 10px;
          }
          .brand {
            min-width: unset;
            flex: 1 1 auto;
          }
          .navRight {
            width: 100%;
            justify-content: flex-start;
          }
          .pill {
            width: 100%;
            justify-content: center;
          }
          .menuWrap {
            flex: 1 1 auto;
          }
          .menuBtn {
            width: 100%;
            justify-content: center;
          }
          .hero {
            padding: 14px;
          }
          .heroRow {
            grid-template-columns: 1fr;
            gap: 12px;
          }
        }

        .kicker {
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(212, 175, 55, 0.92);
          font-family: ${theme.mono};
        }
        .h1 {
          margin: 10px 0 0;
          font-size: 42px;
          letter-spacing: -0.4px;
          line-height: 1.05;
          font-family: ${theme.serif};
          color: rgba(255, 255, 255, 0.96);
        }
        @media (max-width: 520px) {
          .h1 {
            font-size: 32px; /* slightly tighter */
          }
        }
        .sub {
          margin: 12px 0 0;
          color: ${theme.muted};
          line-height: 1.55;
          font-size: 15px;
          max-width: 62ch;
        }

        .heroActions {
          margin-top: 14px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        @media (max-width: 900px) {
          .heroActions {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .heroActions .btn {
            width: 100%;
          }
        }

        .trustRow {
          margin-top: 12px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          color: rgba(255, 255, 255, 0.72);
          font-size: 12px;
        }
        .trustItem {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.14);
        }
        @media (max-width: 900px) {
          .trustItem {
            width: 100%;
            justify-content: center;
            text-align: center;
          }
        }

        /* Host access card */
        .hostCard {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.22);
          padding: 14px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
        }
        @media (max-width: 900px) {
          .hostCard {
            padding: 14px;
          }
        }
        .hostTitle {
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.82);
          font-family: ${theme.mono};
        }
        .hostDesc {
          margin-top: 8px;
          color: ${theme.dim};
          font-size: 13px;
          line-height: 1.45;
        }
        .form {
          margin-top: 12px;
          display: grid;
          gap: 10px;
        }
        .field {
          display: grid;
          gap: 6px;
        }
        .label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.76);
          font-family: ${theme.mono};
          letter-spacing: 0.6px;
          text-transform: uppercase;
        }
        .input {
          width: 100%;
          padding: 12px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(16, 18, 22, 0.65);
          color: rgba(255, 255, 255, 0.92);
          outline: none;
          font-family: ${theme.mono};
          font-size: 14px; /* ✅ more readable on mobile */
          min-height: 44px; /* ✅ tap target */
        }
        .input:focus {
          border-color: rgba(212, 175, 55, 0.35);
          box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.08);
        }
        .hostBtns {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          margin-top: 4px;
        }
        @media (max-width: 900px) {
          .hostBtns {
            display: grid;
            grid-template-columns: 1fr;
            gap: 10px;
          }
          .hostBtns .btn {
            width: 100%;
          }
        }
        .err {
          margin-top: 8px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(177, 29, 42, 0.35);
          background: rgba(177, 29, 42, 0.12);
          color: rgba(255, 255, 255, 0.9);
          font-size: 13px;
        }

        /* Sections */
        .section {
          margin-top: 16px;
          padding: 18px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(
            180deg,
            rgba(16, 18, 22, 0.76),
            rgba(16, 18, 22, 0.42)
          );
          box-shadow: 0 14px 55px rgba(0, 0, 0, 0.45);
        }
        @media (max-width: 900px) {
          .section {
            padding: 14px;
          }
        }
        .sectionTitle {
          margin: 0;
          font-size: 18px;
          letter-spacing: 0.2px;
          color: rgba(255, 255, 255, 0.92);
        }
        .sectionSub {
          margin: 8px 0 0;
          color: ${theme.muted};
          line-height: 1.55;
          font-size: 14px;
          max-width: 80ch;
        }

        .grid3 {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 900px) {
          .grid3 {
            grid-template-columns: 1fr;
          }
        }

        .card {
          display: flex;
          gap: 12px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
        }
        .icon {
          width: 36px;
          height: 36px;
          border-radius: 14px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(212, 175, 55, 0.22);
          background: rgba(212, 175, 55, 0.1);
          color: rgba(255, 255, 255, 0.92);
          font-size: 16px;
          flex: 0 0 auto;
        }
        .cardTitle {
          font-weight: 900;
          font-size: 14px;
          letter-spacing: 0.2px;
          color: rgba(255, 255, 255, 0.92);
        }
        .cardBody {
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.74);
          font-size: 13px;
          line-height: 1.45;
        }

        /* Reviews */
        .reviewTop {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 8px;
        }
        .reviewMeta {
          color: rgba(255, 255, 255, 0.72);
          font-size: 13px;
          line-height: 1.45;
        }
        .stars {
          font-family: ${theme.mono};
          letter-spacing: 1px;
          color: rgba(212, 175, 55, 0.92);
          font-size: 12px;
        }
        .reviewGrid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 900px) {
          .reviewGrid {
            grid-template-columns: 1fr;
          }
        }
        .reviewCard {
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
        }
        .reviewQuote {
          margin: 0;
          color: rgba(255, 255, 255, 0.84);
          font-size: 13px;
          line-height: 1.55;
        }
        .reviewFooter {
          margin-top: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
        }
        .reviewer {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 14px;
          border: 1px solid rgba(212, 175, 55, 0.22);
          background: rgba(212, 175, 55, 0.1);
          display: grid;
          place-items: center;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.9);
          font-family: ${theme.serif};
        }
        .reviewerName {
          font-weight: 900;
          color: rgba(255, 255, 255, 0.92);
          font-size: 13px;
        }
        .reviewerMeta {
          color: rgba(255, 255, 255, 0.62);
          font-size: 12px;
          margin-top: 2px;
        }
        .badge {
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.14);
          color: rgba(255, 255, 255, 0.72);
        }
        @media (max-width: 900px) {
          .reviewFooter {
            align-items: flex-start;
          }
          .badge {
            align-self: flex-start;
          }
        }

        /* How it works */
        .steps {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 900px) {
          .steps {
            grid-template-columns: 1fr;
          }
        }
        .step {
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
        }
        .stepNum {
          font-family: ${theme.mono};
          letter-spacing: 1.8px;
          text-transform: uppercase;
          font-size: 12px;
          color: rgba(212, 175, 55, 0.9);
        }
        .stepTitle {
          margin: 8px 0 0;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.92);
        }
        .stepBody {
          margin: 8px 0 0;
          color: rgba(255, 255, 255, 0.74);
          line-height: 1.45;
          font-size: 13px;
        }

        /* Pricing */
        .pricingRow {
          margin-top: 14px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          align-items: stretch;
        }
        @media (max-width: 900px) {
          .pricingRow {
            grid-template-columns: 1fr;
          }
        }
        .priceCard {
          padding: 16px;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
        }
        @media (max-width: 900px) {
          .priceCard {
            padding: 14px;
          }
        }
        .priceTop {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 10px;
          flex-wrap: wrap;
        }
        .priceName {
          font-weight: 900;
          font-size: 15px;
        }
        .priceTag {
          font-family: ${theme.mono};
          font-size: 12px;
          color: rgba(255, 255, 255, 0.72);
        }
        .priceValue {
          margin-top: 10px;
          font-size: 34px;
          font-family: ${theme.serif};
          letter-spacing: -0.3px;
        }
        .priceNote {
          margin-top: 6px;
          color: rgba(255, 255, 255, 0.72);
          font-size: 13px;
          line-height: 1.45;
        }
        .ul {
          margin: 12px 0 0;
          padding: 0;
          list-style: none;
          display: grid;
          gap: 10px;
        }
        .li {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          color: rgba(255, 255, 255, 0.78);
          font-size: 13px;
          line-height: 1.45;
        }
        .check {
          width: 18px;
          height: 18px;
          border-radius: 6px;
          border: 1px solid rgba(212, 175, 55, 0.22);
          background: rgba(212, 175, 55, 0.1);
          display: grid;
          place-items: center;
          flex: 0 0 auto;
        }

        /* FAQ */
        .faq {
          margin-top: 12px;
          display: grid;
          gap: 10px;
        }
        details {
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(0, 0, 0, 0.18);
          padding: 12px 14px;
        }
        summary {
          cursor: pointer;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.92);
          list-style: none;
          min-height: 44px; /* ✅ tap target */
          display: flex;
          align-items: center;
        }
        summary::-webkit-details-marker {
          display: none;
        }
        .faqBody {
          margin-top: 10px;
          color: rgba(255, 255, 255, 0.74);
          font-size: 13px;
          line-height: 1.55;
        }

        /* Footer */
        .footer {
          margin-top: 18px;
          padding: 14px 6px 0;
          color: rgba(255, 255, 255, 0.56);
          font-size: 12px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .footer a {
          color: rgba(255, 255, 255, 0.72);
          text-decoration: none;
          padding: 8px 0; /* easier taps */
        }
        .footer a:hover {
          text-decoration: underline;
        }

        /* ✅ Mobile niceties: prevent layout squeeze in small phones */
        @media (max-width: 520px) {
          .menu {
            width: min(92vw, 260px);
          }
        }
      `}</style>

      <div className="wrap">
        {/* Nav */}
        <div className="nav">
          <div className="brand">
            <div className="mark">DA</div>
            <div>
              <div className="brandTitle">Dead Air</div>
              <div className="brandSub">
                Audio-first murder mystery for real friend groups
              </div>
            </div>
          </div>

          <div className="navRight">
            <Pill>
              <span className="dot" />
              4 rounds · host paced · no eliminations
            </Pill>

            <div className="menuWrap" onClick={(e) => e.stopPropagation()}>
              <button
                className={`btn ${linkOpen ? "btnGold" : ""} menuBtn`}
                onClick={() => setLinkOpen((v) => !v)}
                aria-expanded={linkOpen}
              >
                Links ▾
              </button>

              {linkOpen && (
                <div className="menu" role="menu" aria-label="Links">
                  <button
                    className="menuItem"
                    onClick={() => goToId("how")}
                    role="menuitem"
                  >
                    How it works{" "}
                    <span className="menuSub">The flow in 60 seconds</span>
                  </button>
                  <button
                    className="menuItem"
                    onClick={goPricing}
                    role="menuitem"
                  >
                    Pricing <span className="menuSub">$10 / player · locked</span>
                  </button>
                  <button
                    className="menuItem"
                    onClick={() => goToId("host")}
                    role="menuitem"
                  >
                    Host access{" "}
                    <span className="menuSub">Purchase code → dashboard</span>
                  </button>
                  <div className="menuHr" />
                  <button
                    className="menuItem"
                    onClick={() =>
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }
                    role="menuitem"
                  >
                    Back to top <span className="menuSub">Return to hero</span>
                  </button>
                </div>
              )}
            </div>

            <button className="btn btnGold" onClick={() => goToId("how")}>
              How it works
            </button>
            <button className="btn" onClick={goPricing}>
              Pricing
            </button>
          </div>
        </div>

        {/* Hero */}
        <section className="hero">
          <div className="heroGlow" aria-hidden />
          <div className="heroRow">
            <div>
              <div className="kicker">THE NARRATOR IS LIVE</div>
              <h1 className="h1">
                A murder mystery that
                <br />
                knows your friends.
              </h1>
              <p className="sub">
                Dead Air is a host-paced, audio-first murder mystery built from
                player intake forms. It’s sharp, social, and controlled — the
                story lands, the room stays moving, and nobody gets kicked out.
              </p>

              <div className="heroActions">
                <button className="btn btnPrimary" onClick={goPricing}>
                  Buy a pack
                </button>
                <button
                  className="btn"
                  onClick={goDemo}
                  title="Scrolls to top (placeholder demo)"
                >
                  See the vibe
                </button>
                {/* ✅ Removed the redundant Host login button here */}
              </div>

              <div className="trustRow">
                <span className="trustItem">🎧 No props. Just vibes.</span>
                <span className="trustItem">🧾 Intake makes it personal.</span>
                <span className="trustItem">🍸 Drinking optional.</span>
                <span className="trustItem">🩸 4 rounds. No eliminations.</span>
              </div>
            </div>

            {/* Host access */}
            <div id="host" className="hostCard">
              <div className="hostTitle">Host access</div>
              <div className="hostDesc">
                Already purchased? Enter your <b>purchase code</b> to open your
                dashboard.
              </div>

              <div className="form">
                <div className="field">
                  <div className="label">Purchase code</div>
                  <input
                    className="input"
                    value={purchaseCode}
                    onChange={(e) => setPurchaseCode(e.target.value)}
                    placeholder="e.g. DA-8H3K-29QF"
                    autoComplete="off"
                    inputMode="text"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") goHostWithPurchaseCode();
                    }}
                  />
                </div>

                <div className="hostBtns">
                  <button
                    className="btn btnPrimary"
                    onClick={goHostWithPurchaseCode}
                  >
                    Open dashboard →
                  </button>
                  <button
                    className="btn"
                    onClick={() => {
                      setPurchaseCode("");
                      setHostError(null);
                    }}
                  >
                    Clear
                  </button>
                </div>

                {hostError ? <div className="err">{hostError}</div> : null}

                <div
                  style={{
                    marginTop: 10,
                    color: theme.dim,
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  Your purchase email includes this code.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="section">
          <h2 className="sectionTitle">
            Built for real rooms, not improv theater kids
          </h2>
          <p className="sectionSub">
            Host controls the pacing. Narrator does the talking. Your friends do
            the accusing.
          </p>

          <div className="grid3">
            <Feature
              icon="🧾"
              title="Intake makes it personal"
              body="Short questions → suspiciously accurate story beats + private prompts. It feels targeted. Because it is."
            />
            <Feature
              icon="🎙️"
              title="Press play, keep it moving"
              body="Audio-first narration keeps the room synced. Host starts rounds when everyone’s ready."
            />
            <Feature
              icon="🩸"
              title="Nobody gets kicked out"
              body="No elimination. No bored spectators. Everyone stays in and keeps talking."
            />
          </div>
        </section>

        {/* Reviews */}
        <section className="section">
          <h2 className="sectionTitle">Andy said “run this at a pregame.”</h2>

          <div className="reviewTop">
            <p className="reviewMeta">
              <span className="stars">★★★★★</span>{" "}
              <b style={{ color: "rgba(255,255,255,0.92)" }}>4.9 average</b> ·
              1,200+ groups <span style={{ color: theme.dim }}></span>
            </p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span className="badge">“not cringe”</span>
              <span className="badge">“no props”</span>
              <span className="badge">“we got loud”</span>
            </div>
          </div>

          <div className="reviewGrid">
            {[
              {
                quote:
                  "We started as a chill hang. By Round 3 we were FULL courtroom. Accusations flying. Friendships tested.",
                name: "Kay",
                meta: "pregame · 8 players",
                badge: "unhinged",
              },
              {
                quote:
                  "The narrator clocked my bestie so hard it felt illegal. Like… who told you that??",
                name: "Noah",
                meta: "game night · 7 players",
                badge: "too accurate",
              },
              {
                quote:
                  "Finally a mystery where nobody gets eliminated and bored. Everyone stayed in and stayed loud.",
                name: "Liv",
                meta: "birthday · 10 players",
                badge: "no sit-outs",
              },
              {
                quote:
                  "Private prompts in Round 4?? I was lying with confidence. It worked. I’m not proud.",
                name: "Zee",
                meta: "NYE · 11 players",
                badge: "round 4",
              },
              {
                quote:
                  "Zero props. Zero prep. Press play and watch your friends spiral in HD.",
                name: "Jules",
                meta: "house party · 9 players",
                badge: "easy W",
              },
              {
                quote:
                  "Not therapy. Not fanfic. Just messy social deduction with a narrator who knows what buttons to push.",
                name: "Mina",
                meta: "friendsgiving · 6 players",
                badge: "not cringe",
              },
            ].map((r) => (
              <div key={r.name + r.badge} className="reviewCard">
                <p className="reviewQuote">“{r.quote}”</p>

                <div className="reviewFooter">
                  <div className="reviewer">
                    <div className="avatar">
                      {r.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="reviewerName">{r.name}</div>
                      <div className="reviewerMeta">{r.meta}</div>
                    </div>
                  </div>

                  <span className="badge">{r.badge}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="section">
          <h2 className="sectionTitle">How it works</h2>
          <p className="sectionSub">
            Quick setup. Clean pacing. The room stays together the whole time.
          </p>

          <div className="steps">
            <div className="step">
              <div className="stepNum">Step 1</div>
              <div className="stepTitle">Set up players</div>
              <div className="stepBody">
                Create a game, assign players, and (optionally) add emails so you
                can send intake links.
              </div>
            </div>

            <div className="step">
              <div className="stepNum">Step 2</div>
              <div className="stepTitle">Collect all intakes</div>
              <div className="stepBody">
                Players do it on their phone — or the host fills them out. Story
                generation stays locked until all are complete.
              </div>
            </div>

            <div className="step">
              <div className="stepNum">Step 3</div>
              <div className="stepTitle">Play 4 rounds</div>
              <div className="stepBody">
                Narrator drives the beats. Host starts each round. No
                eliminations — everyone stays in.
              </div>
            </div>
          </div>
        </section>

        {/* Pricing (kept for layout, buttons route to /pricing) */}
        <section id="pricing" className="section">
          <h2 className="sectionTitle">Pricing</h2>
          <p className="sectionSub">One price. No surprises.</p>

          <div className="pricingRow">
            <div className="priceCard">
              <div className="priceTop">
                <div className="priceName">Standard Pack</div>
                <div className="priceTag">6–12 players</div>
              </div>

              <div className="priceValue">$10 / player</div>
              <div className="priceNote">
                Your case is built from the group’s intakes, then delivered to
                your host dashboard.
              </div>

              <ul className="ul">
                <li className="li">
                  <span className="check">✓</span> 4 rounds, host-paced,
                  audio-first narration
                </li>
                <li className="li">
                  <span className="check">✓</span> Private prompts per player,
                  per round
                </li>
                <li className="li">
                  <span className="check">✓</span> Boundaries collected (keep it
                  fun, not harmful)
                </li>
              </ul>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button className="btn btnPrimary" onClick={goPricing}>
                  Buy a pack →
                </button>

                <button className="btn" onClick={() => goToId("host")}>
                  Already purchased?
                </button>
              </div>
            </div>

            <div
              className="priceCard"
              style={{ borderColor: "rgba(212,175,55,0.22)" }}
            >
              <div className="priceTop">
                <div className="priceName">Host-friendly guarantees</div>
                <div className="priceTag">The “it won’t derail” list</div>
              </div>

              <ul className="ul" style={{ marginTop: 12 }}>
                <li className="li">
                  <span className="check">✓</span> Host controls pacing (no
                  chaos branching)
                </li>
                <li className="li">
                  <span className="check">✓</span> No one is eliminated
                  (everyone stays engaged)
                </li>
                <li className="li">
                  <span className="check">✓</span> Players don’t see future
                  rounds early
                </li>
                <li className="li">
                  <span className="check">✓</span> Drinking-optional tone (fun
                  without pressure)
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section">
          <h2 className="sectionTitle">FAQ</h2>
          <p className="sectionSub">Crisp answers so nobody panics mid-setup.</p>

          <div className="faq">
            <details>
              <summary>Do players need to download anything?</summary>
              <div className="faqBody">
                No. It’s web-based. Players open their link on their phone.
                Audio plays from the host dashboard.
              </div>
            </details>

            <details>
              <summary>Can we do SMS instead of email?</summary>
              <div className="faqBody">
                Later. Ship email first. SMS adds compliance, deliverability
                issues, and paid messaging plumbing. Email is enough to validate
                the flow.
              </div>
            </details>

            <details>
              <summary>Why are intakes required before the story generates?</summary>
              <div className="faqBody">
                Because the personalization is the product. If you generate
                early, late intakes won’t match the tone or suspicion map.
              </div>
            </details>

            <details>
              <summary>Is it awkward / cringe?</summary>
              <div className="faqBody">
                It doesn’t have to be. Keep the writing sharp and controlled:
                observational, not fanfiction. The boundary section helps.
              </div>
            </details>
          </div>
        </section>

        <div className="footer">
          <div>© {new Date().getFullYear()} Dead Air</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a
              href="#how"
              onClick={(e) => {
                e.preventDefault();
                goToId("how");
              }}
            >
              How it works
            </a>
            <a
              href="/pricing"
              onClick={(e) => {
                e.preventDefault();
                goPricing();
              }}
            >
              Pricing
            </a>
            <a
              href="#host"
              onClick={(e) => {
                e.preventDefault();
                goToId("host");
              }}
            >
              Host access
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
