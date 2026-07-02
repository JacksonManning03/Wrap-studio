"use client";

import { useState } from "react";

export default function ContactGate({
  onSubmit,
}: {
  onSubmit: (c: { name: string; email: string; phone: string }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [err, setErr] = useState("");

  const submit = () => {
    if (!name.trim()) return setErr("Add your name so we know who the design belongs to.");
    if (!/.+@.+\..+/.test(email)) return setErr("That email doesn't look complete.");
    if (phone.replace(/\D/g, "").length < 7) return setErr("Add a phone number we can reach you on.");
    setErr("");
    onSubmit({ name: name.trim(), email: email.trim(), phone: phone.trim() });
  };

  return (
    <div className="mx-auto max-w-md">
      <div className="card overflow-hidden">
        <div className="border-b border-line bg-ink px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-teal" />
            </span>
            <p className="font-semibold">Rendering your wrap…</p>
          </div>
          <p className="mt-1 text-[13px] text-white/70">
            Your design is being painted onto your vehicle right now.
          </p>
        </div>
        <div className="p-6">
          <h2 className="text-lg font-bold">Where should we send it?</h2>
          <p className="hint mb-4">
            Enter your details to view your design and price the moment it&apos;s ready.
          </p>
          <label className="label" htmlFor="g-name">Name</label>
          <input id="g-name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
          <label className="label mt-3" htmlFor="g-email">Email</label>
          <input id="g-email" className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <label className="label mt-3" htmlFor="g-phone">Phone</label>
          <input id="g-phone" className="field" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
          {err && <p className="mt-3 rounded-lg bg-vinyl/10 px-3 py-2 text-[13px] font-medium text-vinyl">{err}</p>}
          <button className="btn-accent mt-4 w-full" onClick={submit}>
            Show my design
          </button>
          <p className="hint mt-3 text-center">
            We&apos;ll only use this to follow up about your wrap.
          </p>
        </div>
      </div>
    </div>
  );
}
