"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ContactGate({ token, propertyId, propertyTitle }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(
        `/api/public/property-shares/${encodeURIComponent(token)}/properties/${encodeURIComponent(propertyId)}/contact`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone }),
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.error || "Unable to continue");
      }
      setName("");
      setPhone("");
      router.refresh();
    } catch (submissionError) {
      setError(submissionError.message || "Unable to continue");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-[#111318]/95 p-6 shadow-2xl md:p-8">
      <div className="mb-6 flex items-start gap-3">
        <span className="rounded-full bg-sky-400/10 p-2 text-sky-300">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-xl font-semibold text-white">
            View {propertyTitle}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Enter your name and phone to access this property&apos;s shared
            files. Access lasts for up to 24 hours.
          </p>
        </div>
      </div>
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-zinc-200"
            htmlFor="share-contact-name"
          >
            Name
          </label>
          <Input
            id="share-contact-name"
            name="name"
            autoComplete="name"
            maxLength={100}
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="border-white/10 bg-black/20 text-white"
          />
        </div>
        <div className="grid gap-2">
          <label
            className="text-sm font-medium text-zinc-200"
            htmlFor="share-contact-phone"
          >
            Phone
          </label>
          <Input
            id="share-contact-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={40}
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="border-white/10 bg-black/20 text-white"
          />
        </div>
        {error ? (
          <p role="alert" className="text-sm text-rose-300">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={submitting} className="mt-1 w-full">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitting ? "Checking..." : "View shared files"}
        </Button>
      </form>
      <p className="mt-4 text-xs leading-5 text-zinc-500">
        Only your name and phone are collected for the property owner. Public
        request-view totals do not identify unique visitors.
      </p>
    </section>
  );
}
