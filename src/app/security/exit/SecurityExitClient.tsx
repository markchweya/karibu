"use client";

import { useEffect, useState } from "react";

export default function SecurityExitClient() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/security-search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  async function confirmExit(id: string) {
    await fetch("/api/security-exit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    setResults(results.filter((r) => r.id !== id));
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="label">Visitor full name</div>
        <input
          placeholder="Type visitor name..."
          className="field mt-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {results.map((v) => (
          <div
            key={v.id}
            className="glass p-5 flex justify-between items-center"
          >
            <div>
              <div className="font-semibold text-white">
                {v.visitor.fullName}
              </div>
              <div className="text-sm text-white/70">
                ID: {v.visitor.idNumber}
              </div>
              <div className="text-sm text-white/70">
                {v.destination}
              </div>
            </div>

            <button
              onClick={() => confirmExit(v.id)}
              className="btn-primary"
            >
              Confirm Exit
            </button>
          </div>
        ))}

        {query && results.length === 0 && (
          <div className="text-white/60 text-sm">No matching checked-in visitors.</div>
        )}
      </div>
    </div>
  );
}
