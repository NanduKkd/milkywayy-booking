import Link from "next/link";

export default function SharedPropertyNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#08090c] px-6 text-white">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
          Shared property
        </p>
        <h1 className="mt-4 text-3xl font-bold">This link is unavailable</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">
          The link may be invalid, disabled, rotated, or no longer eligible for
          sharing.
        </p>
        <Link href="/" className="mt-8 inline-flex text-sm text-sky-300">
          Return to Milkywayy
        </Link>
      </div>
    </main>
  );
}
