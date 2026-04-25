import { useState } from "react";

export function ObfuscatedEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const at = email.indexOf("@");
  if (at < 1) return <span className="text-xs text-ink-muted">({email})</span>;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Kopyala"
      className="text-xs text-ink-muted hover:text-ink"
    >
      ({local}
      <span aria-hidden="true"> [at] </span>
      <span className="sr-only">@</span>
      {domain})
      {copied && <span className="ml-1 text-emerald-600">✓ kopyalandı</span>}
    </button>
  );
}
