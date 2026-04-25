import { useState } from "react";

export function ObfuscatedEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const at = email.indexOf("@");
  const prefix = at > 0 ? email.slice(0, at) : email;

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
      title={copied ? "kopyalandı" : "Tam adresi kopyala"}
      className="text-xs text-ink-muted dark:text-paper-muted hover:text-ink dark:hover:text-paper"
    >
      ({prefix})
      {copied && <span className="ml-1 text-emerald-600">✓</span>}
    </button>
  );
}
