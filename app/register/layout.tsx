/**
 * Standalone chrome for the shareable registration page — intentionally separate
 * from the marketing layout so `/register` is a focused, split-screen page. The
 * page itself renders the left brand panel + right form.
 */
export default function RegisterLayout({ children }: LayoutProps<"/register">) {
  return <div className="min-h-dvh bg-cream-100">{children}</div>;
}
