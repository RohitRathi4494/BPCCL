import { Marquee } from "@/components/site/primitives";
import type { ClientLogo } from "@/lib/queries/ground";

/* A single logo in a fixed-height box, greyscale → colour on hover/focus. */
function Logo({ client }: { client: ClientLogo }) {
  const inner = client.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={client.logoUrl}
      alt={client.name}
      loading="lazy"
      className="max-h-full w-auto max-w-[160px] object-contain opacity-60 grayscale transition duration-300 group-hover:opacity-100 group-hover:grayscale-0 group-focus-visible:opacity-100 group-focus-visible:grayscale-0"
    />
  ) : (
    <span className="font-display text-base font-semibold text-navy-900/70 transition group-hover:text-navy-900">
      {client.name}
    </span>
  );

  const box = "group grid h-12 shrink-0 place-items-center";
  if (client.websiteUrl) {
    return (
      <a
        href={client.websiteUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={client.name}
        className={box}
      >
        {inner}
      </a>
    );
  }
  return (
    <span className={box} aria-label={client.name} role="img">
      {inner}
    </span>
  );
}

/** Infinite marquee of client logos (pauses on hover; static on reduced motion). */
export function ClientMarquee({ clients }: { clients: ClientLogo[] }) {
  if (clients.length === 0) return null;
  return (
    <Marquee durationSeconds={34}>
      {clients.map((c) => (
        <span key={c.id} className="mx-10 inline-flex items-center">
          <Logo client={c} />
        </span>
      ))}
    </Marquee>
  );
}

/** Static logo wall (used on /ballpark). */
export function ClientWall({ clients }: { clients: ClientLogo[] }) {
  if (clients.length === 0) return null;
  return (
    <div className="grid grid-cols-2 items-center gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
      {clients.map((c) => (
        <div key={c.id} className="flex justify-center">
          <Logo client={c} />
        </div>
      ))}
    </div>
  );
}
