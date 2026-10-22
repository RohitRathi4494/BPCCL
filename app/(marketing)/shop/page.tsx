import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "The Urban Sports Shop is coming soon — your complete cricket equipment store.",
};

export default function ShopPage() {
  return (
    <section className="lamp-glow">
      <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center px-5 py-24 text-center">
        <span className="inline-flex size-20 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
          <ShoppingBag className="size-9" />
        </span>

        <span className="mt-8 font-mono text-xs tracking-[0.28em] text-primary uppercase">
          Coming Soon
        </span>

        <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight text-foreground uppercase sm:text-6xl">
          Urban Sports Shop
        </h1>

        <p className="mt-5 max-w-xl text-lg text-foreground/85">
          Your complete cricket equipment store is coming soon. From bats, balls
          and pads to gloves, kit bags and apparel — it&apos;s all on the way.
          The shop is currently under development, so check back shortly.
        </p>

        <span className="mt-8 inline-flex items-center rounded-sm border border-border bg-muted px-4 py-2 font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
          Under Development
        </span>
      </div>
    </section>
  );
}
