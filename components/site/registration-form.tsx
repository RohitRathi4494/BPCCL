"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Check,
  Loader2,
  AlertTriangle,
  Copy,
  ArrowRight,
  ArrowLeft,
  Pencil,
  CheckCircle2,
  Download,
} from "lucide-react";
import {
  submitRegistration,
  type RegistrationState,
} from "@/app/register/actions";
import {
  TSHIRT_SIZES,
  LOWER_SIZES,
  OTHER_SIZE,
  SLEEVE_TYPES,
  MIN_AGE,
  MAX_AGE,
  ROLE_GROUPS,
  STAT_FIELDS,
  computeAge,
  normalizePhone,
  isValidPhone,
  type StatKey,
} from "@/lib/registration";
import { PhotoUpload } from "@/components/site/photo-upload";
import {
  PrivateDocUpload,
  type PrivateDocHandle,
} from "@/components/site/private-doc-upload";
import { Confetti } from "@/components/site/confetti";
import { WhatsAppIcon } from "@/components/site/social-icons";
import { leagueConfig } from "@/lib/league.config";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-lg border border-navy-900/15 bg-white px-4 py-3 text-base text-ink-900 placeholder:text-muted-ink/50 outline-none transition-colors focus:border-navy-700 focus:ring-2 focus:ring-navy-700/20";
const labelClass =
  "text-[11px] font-semibold tracking-[0.1em] text-muted-ink uppercase";

const initial: RegistrationState = { status: "idle" };

type StatValues = Record<StatKey, string>;
type FormValues = {
  full_name: string;
  dob: string;
  phone: string;
  email: string;
  company: string;
  work_email: string;
  photo_url: string;
  cricheroes_url: string;
  linkedin_url: string;
  roles: string[];
  tshirt_size: string;
  tshirt_size_other: string;
  lower_size: string;
  lower_size_other: string;
  sleeve_type: string;
  jersey_number: string;
  jersey_name: string;
  payment_utr: string;
  data_consent: boolean;
  terms_accepted: boolean;
} & StatValues;

const EMPTY_STATS = Object.fromEntries(STAT_FIELDS.map((f) => [f.key, ""])) as StatValues;
const EMPTY_VALUES: FormValues = {
  full_name: "", dob: "", phone: "", email: "", company: "", work_email: "",
  photo_url: "", cricheroes_url: "", linkedin_url: "", roles: [],
  tshirt_size: "", tshirt_size_other: "", lower_size: "", lower_size_other: "",
  sleeve_type: "",
  jersey_number: "", jersey_name: "", payment_utr: "", data_consent: false,
  terms_accepted: false,
  ...EMPTY_STATS,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DRAFT_KEY = "bpccl-reg-draft";

const STEPS = [
  { n: 1, label: "Personal" },
  { n: 2, label: "Cricket" },
  { n: 3, label: "Jersey Details" },
  { n: 4, label: "Docs & Pay" },
  { n: 5, label: "Review" },
] as const;

// Which field keys are validated on each step.
const STEP_KEYS: Record<number, string[]> = {
  1: ["full_name", "dob", "phone", "email", "company", "work_email", "linkedin_url"],
  2: ["roles", "cricheroes_url", ...STAT_FIELDS.map((f) => f.key)],
  3: ["tshirt_size", "lower_size", "sleeve_type", "jersey_number", "jersey_name"],
  4: ["photo_url", "aadhaar_doc_key", "payment_utr", "payment_screenshot_key", "data_consent"],
};

function validate(v: FormValues, hasAadhaar: boolean, hasPayment: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.full_name.trim()) e.full_name = "Please enter your full name.";
  if (!v.dob) e.dob = "Please enter your date of birth.";
  else {
    const d = new Date(v.dob);
    if (Number.isNaN(d.getTime()) || d > new Date()) e.dob = "Enter a valid date of birth.";
    else {
      const age = computeAge(v.dob);
      if (age < MIN_AGE) e.dob = `Open to players aged ${MIN_AGE} and above.`;
      else if (age > MAX_AGE) e.dob = "Please double-check your date of birth.";
    }
  }
  if (!v.phone.trim()) e.phone = "Please enter a contact number.";
  else if (!isValidPhone(normalizePhone(v.phone))) e.phone = "Enter a valid contact number (10–13 digits).";
  if (!v.email.trim()) e.email = "Please enter your email.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (!v.company.trim()) e.company = "Please enter your company.";
  if (!v.work_email.trim()) e.work_email = "Please enter a work or personal email.";
  else if (!EMAIL_RE.test(v.work_email.trim())) e.work_email = "Enter a valid email address.";
  if (!v.cricheroes_url.trim()) e.cricheroes_url = "A CricHeroes profile link is required.";
  if (!v.linkedin_url.trim()) e.linkedin_url = "A LinkedIn profile link is required.";
  const sizeOk = (sel: string, other: string) => (sel === OTHER_SIZE ? other.trim().length > 0 : sel.length > 0);
  if (!sizeOk(v.tshirt_size, v.tshirt_size_other)) e.tshirt_size = "Please select a size.";
  if (!sizeOk(v.lower_size, v.lower_size_other)) e.lower_size = "Please select a size.";
  if (!v.sleeve_type) e.sleeve_type = "Please pick a sleeve type.";
  if (!v.jersey_number.trim()) e.jersey_number = "Enter your jersey number.";
  else if (!/^\d{1,3}$/.test(v.jersey_number)) e.jersey_number = "Jersey number must be 1–3 digits.";
  if (!v.jersey_name.trim()) e.jersey_name = "Enter the name for your jersey.";
  if (v.roles.length === 0) e.roles = "Select at least one playing role.";
  for (const f of STAT_FIELDS) if (!v[f.key].trim()) e[f.key] = `Enter ${f.label} (or NA).`;
  if (!v.photo_url) e.photo_url = "Please upload a player photo.";
  if (!hasAadhaar) e.aadhaar_doc_key = "Please upload your masked Aadhaar.";
  if (!hasPayment) e.payment_screenshot_key = "Please upload your payment screenshot.";
  if (!v.payment_utr.trim()) e.payment_utr = "Enter your UPI transaction ID (UTR).";
  else if (!/^\d{12}$/.test(v.payment_utr.trim())) e.payment_utr = "The UTR must be exactly 12 digits.";
  if (!v.data_consent) e.data_consent = "Please consent to the verification use of your documents.";
  if (!v.terms_accepted) e.terms_accepted = "Please accept the terms & conditions to submit.";
  return e;
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-ball-red">{msg}</p>;
}

function Field({
  label, htmlFor, required, error, hint, children,
}: {
  label: string; htmlFor: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className={labelClass}>
        {label} {required && <span className="text-ball-red">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-ink">{hint}</p>}
      <Err msg={error} />
    </div>
  );
}

export function RegistrationForm({
  registrationFee, upiId, upiQrUrl,
}: {
  registrationFee: number; upiId: string | null; upiQrUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(submitRegistration, initial);
  const aadhaarRef = useRef<PrivateDocHandle>(null);
  const paymentRef = useRef<PrivateDocHandle>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [step, setStep] = useState(1);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [docKeys, setDocKeys] = useState({ aadhaar: "", payment: "" });
  const [docSel, setDocSel] = useState({ aadhaar: false, payment: false });
  const [uploading, setUploading] = useState(false);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [copied, setCopied] = useState<"upi" | "code" | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  // Client-side submit error (e.g. the on-submit private-doc upload failing),
  // surfaced so a failed submit is never a silent dead-end on the Review step.
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load the saved draft (text fields only) once on mount. Deferred out of the
  // effect body so it isn't a synchronous setState-in-effect.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as Partial<FormValues>;
          // Never restore files or contact/payment PII, even from a draft that
          // predates the no-PII change above (defence against a stale draft).
          setValues((v) => ({
            ...v,
            ...saved,
            photo_url: "",
            phone: "",
            email: "",
            work_email: "",
            payment_utr: "",
            terms_accepted: false,
          }));
        }
      } catch {}
      setDraftLoaded(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // Persist the draft (never files) whenever values change. Contact / payment
  // PII is deliberately NOT persisted: the draft lives in the browser, so on a
  // shared or public device it must never carry one person's phone/email/UTR
  // into the next person's form.
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      const {
        photo_url: _p,
        phone: _ph,
        email: _em,
        work_email: _we,
        payment_utr: _utr,
        terms_accepted: _tc,
        ...rest
      } = values;
      void _p; void _ph; void _em; void _we; void _utr; void _tc;
      localStorage.setItem(DRAFT_KEY, JSON.stringify(rest));
    } catch {}
  }, [values, draftLoaded]);

  // Clear the draft on success.
  useEffect(() => {
    if (state.status === "success") {
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
    }
  }, [state.status]);

  // Surface a server-side error/duplicate result: scroll the banner (rendered at
  // the top of the form) into view, so a failed submit from the Review step
  // never looks like the button silently "stuck".
  useEffect(() => {
    if (state.status === "error" || state.status === "duplicate") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [state]);

  const set =
    (key: keyof FormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const value =
        e.target instanceof HTMLInputElement && e.target.type === "checkbox" ? e.target.checked : e.target.value;
      setValues((v) => ({ ...v, [key]: value }));
      if (confirmDuplicate) setConfirmDuplicate(false);
      if (clientErrors[key as string]) {
        setClientErrors((c) => { const n = { ...c }; delete n[key as string]; return n; });
      }
    };

  const toggleRoleInGroup = (groupRoles: readonly string[], role: string) => () => {
    setValues((v) => {
      const already = v.roles.includes(role);
      const withoutGroup = v.roles.filter((r) => !groupRoles.includes(r));
      return { ...v, roles: already ? withoutGroup : [...withoutGroup, role] };
    });
    if (confirmDuplicate) setConfirmDuplicate(false);
  };

  function stepErrorsFor(n: number): Record<string, string> {
    const all = validate(values, docSel.aadhaar, docSel.payment);
    const out: Record<string, string> = {};
    for (const k of STEP_KEYS[n] ?? []) if (all[k]) out[k] = all[k];
    return out;
  }

  function goNext() {
    const errs = stepErrorsFor(step);
    setClientErrors(errs);
    if (Object.keys(errs).length === 0) {
      setStep((s) => Math.min(5, s + 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  function goBack() {
    setClientErrors({});
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function goEdit(n: number) {
    setStep(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /** Build FormData from state + the uploaded keys and dispatch the action
   *  directly. Avoids relying on input name attributes and on requestSubmit()
   *  (which was aborting the server-action POST in the wizard). */
  function submit(aadhaarKey: string, paymentKey: string, confirm: boolean) {
    const fd = new FormData();
    const s = (k: string, v: string) => fd.set(k, v ?? "");
    s("full_name", values.full_name);
    s("dob", values.dob);
    s("phone", values.phone);
    s("email", values.email);
    s("company", values.company);
    s("work_email", values.work_email);
    s("cricheroes_url", values.cricheroes_url);
    s("linkedin_url", values.linkedin_url);
    s("tshirt_size", values.tshirt_size);
    s("tshirt_size_other", values.tshirt_size_other);
    s("lower_size", values.lower_size);
    s("lower_size_other", values.lower_size_other);
    s("sleeve_type", values.sleeve_type);
    s("jersey_number", values.jersey_number);
    s("jersey_name", values.jersey_name);
    s("payment_utr", values.payment_utr);
    for (const f of STAT_FIELDS) s(f.key, values[f.key]);
    for (const r of values.roles) fd.append("roles", r);
    s("photo_url", values.photo_url);
    s("aadhaar_doc_key", aadhaarKey);
    s("payment_screenshot_key", paymentKey);
    if (values.data_consent) fd.set("data_consent", "on");
    fd.set("confirm_duplicate", confirm ? "true" : "false");
    startTransition(() => formAction(fd));
  }

  async function handleSubmit() {
    const errs = validate(values, docSel.aadhaar, docSel.payment);
    if (Object.keys(errs).length > 0) {
      setClientErrors(errs);
      // Jump to the earliest step that has an error.
      const firstStep = [1, 2, 3, 4].find((n) => STEP_KEYS[n].some((k) => errs[k]));
      if (firstStep) setStep(firstStep);
      return;
    }
    setSubmitError(null);
    setUploading(true);
    // Reuse keys if already uploaded (e.g. the duplicate-confirm re-submit).
    const aKey = docKeys.aadhaar || (await aadhaarRef.current!.upload());
    const pKey = aKey ? docKeys.payment || (await paymentRef.current!.upload()) : null;
    setUploading(false);
    if (!aKey || !pKey) {
      // The upload (direct-to-storage PUT) failed — surface it instead of
      // silently returning, and jump to the Docs step where the per-file error
      // is shown so the user isn't stranded on Review with no feedback.
      setSubmitError(
        "We couldn't upload your documents. Please check your connection and try submitting again. If it keeps failing, contact us.",
      );
      setStep(4);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setDocKeys({ aadhaar: aKey, payment: pKey });
    submit(aKey, pKey, confirmDuplicate);
  }

  async function copy(kind: "upi" | "code", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    } catch {}
  }

  const feeText = new Intl.NumberFormat("en-IN").format(registrationFee);
  const err = (k: string) => clientErrors[k] ?? state.errors?.[k];
  const busy = pending || uploading;

  // ----- Success screen -----
  if (state.status === "success") {
    const shareText = `I just registered for ${site.name} ${site.season}! Join the corporate cricket league:`;
    const shareHref = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${leagueConfig.prodSiteUrl}/register`)}`;
    return (
      <div className="relative">
        <Confetti />
        <div className="flex flex-col items-center gap-6 rounded-2xl border border-navy-700/30 bg-white p-8 text-center sm:p-12">
          <span className="grid size-16 place-items-center rounded-full bg-navy-700/10 text-navy-700">
            <CheckCircle2 className="size-9" />
          </span>
          <div>
            <h2 className="editorial-heading text-3xl text-navy-900 sm:text-4xl">You&apos;re in!</h2>
            <p className="mt-2 max-w-md text-sm text-muted-ink">{state.message}</p>
          </div>
          {state.code && (
            <div className="w-full max-w-xs">
              <span className={labelClass}>Your registration ID</span>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-navy-900/15 bg-cream-100 px-4 py-3">
                <span className="font-display text-xl font-extrabold tracking-wider text-navy-900">{state.code}</span>
                <button
                  type="button"
                  onClick={() => copy("code", state.code!)}
                  className="inline-flex items-center gap-1 rounded-md border border-navy-900/15 px-2.5 py-1.5 text-xs font-medium text-navy-700 hover:border-navy-700"
                >
                  {copied === "code" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied === "code" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}
          <div className="w-full max-w-sm text-left">
            <span className={labelClass}>What happens next</span>
            <ol className="mt-3 flex flex-col gap-3">
              {[
                ["Verification", "We verify your identity, age and payment."],
                ["Categorisation", "Selectors assess your profile and set a category."],
                ["Auction day", "Franchises bid to draft you into a squad."],
              ].map(([t, d], i) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-navy-950 text-xs font-bold text-white">{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{t}</p>
                    <p className="text-xs text-muted-ink">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <a
            href={shareHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-navy-700 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <WhatsAppIcon className="size-4" /> Share on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  const stepPanel = (n: number, children: React.ReactNode) => (
    <div className={cn("flex flex-col gap-6", step === n ? "" : "hidden")}>{children}</div>
  );

  return (
    <form onSubmit={(e) => e.preventDefault()} autoComplete="off" className="flex flex-col gap-8">
      {/* Progress */}
      <div>
        <div className="flex items-center justify-between">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-1 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full text-xs font-bold transition-colors",
                  step > s.n ? "bg-navy-700 text-white"
                    : step === s.n ? "bg-navy-950 text-white"
                    : "bg-navy-900/10 text-muted-ink",
                )}
              >
                {step > s.n ? <Check className="size-4" /> : s.n}
              </span>
              <span className={cn("text-[10px] font-medium tracking-wide uppercase", step === s.n ? "text-navy-900" : "text-muted-ink")}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-navy-900/10">
          <div className="h-full rounded-full bg-gold-400 transition-all duration-300" style={{ width: `${((step - 1) / 4) * 100}%` }} />
        </div>
      </div>

      {state.status === "error" && state.message && (
        <p className="rounded-lg border border-ball-red/30 bg-ball-red/5 px-4 py-3 text-sm text-ball-red">{state.message}</p>
      )}
      {submitError && (
        <p className="rounded-lg border border-ball-red/30 bg-ball-red/5 px-4 py-3 text-sm text-ball-red">{submitError}</p>
      )}
      {state.status === "duplicate" && (
        <div className="flex items-start gap-3 rounded-lg border border-gold-600/40 bg-gold-400/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold-600" />
          <div className="flex flex-col gap-3">
            <p className="text-sm text-ink-900">{state.message}</p>
            <button
              type="button" disabled={busy}
              onClick={() => { setConfirmDuplicate(true); submit(docKeys.aadhaar, docKeys.payment, true); }}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-navy-900 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-navy-900 hover:bg-navy-950 hover:text-white disabled:opacity-70"
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />} Submit Anyway
            </button>
          </div>
        </div>
      )}

      {/* STEP 1 — Personal */}
      {stepPanel(1, <>
        <h3 className="editorial-heading text-2xl text-navy-900">Personal details</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full Name" htmlFor="full_name" required error={err("full_name")}>
            <input id="full_name" autoComplete="off" value={values.full_name} onChange={set("full_name")} className={fieldClass} placeholder="Your full name" />
          </Field>
          <Field label="Date of Birth" htmlFor="dob" required error={err("dob")} hint={`Open to players aged ${MIN_AGE}+ (as of 1 Jan 2027)`}>
            <input id="dob" type="date" value={values.dob} onChange={set("dob")} className={cn(fieldClass, "appearance-none")} />
          </Field>
          <Field label="Contact Number" htmlFor="phone" required error={err("phone")}>
            <input id="phone" type="tel" inputMode="tel" autoComplete="off" value={values.phone} onChange={set("phone")} className={fieldClass} placeholder="10-digit mobile" />
          </Field>
          <Field label="Email ID" htmlFor="email" required error={err("email")}>
            <input id="email" type="email" inputMode="email" autoComplete="off" value={values.email} onChange={set("email")} className={fieldClass} placeholder="you@email.com" />
          </Field>
          <Field label="Company" htmlFor="company" required error={err("company")}>
            <input id="company" autoComplete="off" value={values.company} onChange={set("company")} className={fieldClass} placeholder="Where you work" />
          </Field>
          <Field label="Work Email" htmlFor="work_email" required error={err("work_email")} hint="Prefer your company email; a personal email is fine.">
            <input id="work_email" type="email" inputMode="email" autoComplete="off" value={values.work_email} onChange={set("work_email")} className={fieldClass} placeholder="you@company.com" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="LinkedIn Profile Link" htmlFor="linkedin_url" required error={err("linkedin_url")}>
              <input id="linkedin_url" autoComplete="off" value={values.linkedin_url} onChange={set("linkedin_url")} className={fieldClass} placeholder="linkedin.com/in/…" />
            </Field>
          </div>
        </div>
      </>)}

      {/* STEP 2 — Cricket */}
      {stepPanel(2, <>
        <h3 className="editorial-heading text-2xl text-navy-900">Your cricket</h3>
        <Field label="CricHeroes Profile Link" htmlFor="cricheroes_url" required error={err("cricheroes_url")} hint="Selectors open this to assess your profile.">
          <input id="cricheroes_url" value={values.cricheroes_url} onChange={set("cricheroes_url")} className={fieldClass} placeholder="cricheroes.com/player/…" />
        </Field>
        <div className="flex flex-col gap-3">
          <span className={labelClass}>Playing Role <span className="text-ball-red">*</span></span>
          <p className="text-xs text-muted-ink">Pick one per category; you can select across categories.</p>
          <div className="flex flex-col gap-4">
            {ROLE_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-2">
                <span className="text-[10px] font-semibold tracking-wide text-muted-ink uppercase">{group.label}</span>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.roles.map((role) => {
                    const checked = values.roles.includes(role);
                    return (
                      <label key={role} className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors", checked ? "border-navy-700 bg-navy-700/5 text-navy-900" : "border-navy-900/15 text-ink-900 hover:border-navy-700/40")}>
                        <input type="radio" checked={checked} onChange={() => {}} onClick={toggleRoleInGroup(group.roles, role)} className="size-4 shrink-0 accent-navy-700" />
                        {role}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <Err msg={err("roles")} />
        </div>
        <div className="flex flex-col gap-2">
          <span className={labelClass}>Career Stats <span className="text-ball-red">*</span></span>
          <p className="text-xs text-muted-ink">Please enter the stats shown on your <span className="font-medium text-ink-900">CricHeroes</span> profile. Enter <span className="font-medium text-ink-900">NA</span> for any stat that doesn&apos;t apply.</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STAT_FIELDS.map((f) => (
              <Field key={f.key} label={f.label} htmlFor={f.key} required error={err(f.key)}>
                <input id={f.key} value={values[f.key]} onChange={set(f.key)} className={fieldClass} placeholder="e.g. 42 or NA" />
              </Field>
            ))}
          </div>
        </div>
      </>)}

      {/* STEP 3 — Kit */}
      {stepPanel(3, <>
        <h3 className="editorial-heading text-2xl text-navy-900">Jersey Details</h3>
        <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="T-Shirt Size" htmlFor="tshirt_size" required error={err("tshirt_size")}>
              <div className="flex flex-col gap-2">
                <select id="tshirt_size" value={values.tshirt_size} onChange={set("tshirt_size")} className={cn(fieldClass, "appearance-none")}>
                  <option value="" disabled>Select size…</option>
                  {TSHIRT_SIZES.map((s) => (<option key={s} value={s}>{s}</option>))}
                  <option value={OTHER_SIZE}>Other</option>
                </select>
                {values.tshirt_size === OTHER_SIZE && (<input value={values.tshirt_size_other} onChange={set("tshirt_size_other")} className={fieldClass} placeholder="Enter your size" />)}
              </div>
            </Field>
            <Field label="Lower Size" htmlFor="lower_size" required error={err("lower_size")}>
              <div className="flex flex-col gap-2">
                <select id="lower_size" value={values.lower_size} onChange={set("lower_size")} className={cn(fieldClass, "appearance-none")}>
                  <option value="" disabled>Select size…</option>
                  {LOWER_SIZES.map((s) => (<option key={s} value={s}>{s}</option>))}
                  <option value={OTHER_SIZE}>Other</option>
                </select>
                {values.lower_size === OTHER_SIZE && (<input value={values.lower_size_other} onChange={set("lower_size_other")} className={fieldClass} placeholder="Enter your size" />)}
              </div>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Sleeve Type" htmlFor="sleeve_type" required error={err("sleeve_type")}>
                <div className="grid grid-cols-2 gap-2">
                  {SLEEVE_TYPES.map((s) => {
                    const checked = values.sleeve_type === s;
                    return (
                      <label key={s} className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors", checked ? "border-navy-700 bg-navy-700/5 text-navy-900" : "border-navy-900/15 text-ink-900 hover:border-navy-700/40")}>
                        <input type="radio" name="sleeve_type" checked={checked} onChange={set("sleeve_type")} value={s} className="size-4 shrink-0 accent-navy-700" />
                        {s}
                      </label>
                    );
                  })}
                </div>
              </Field>
            </div>
            <Field label="Number on Jersey" htmlFor="jersey_number" required error={err("jersey_number")}>
              <input id="jersey_number" inputMode="numeric" maxLength={3} value={values.jersey_number} onChange={set("jersey_number")} className={fieldClass} placeholder="e.g. 7" />
            </Field>
            <Field label="Name on Jersey" htmlFor="jersey_name" required error={err("jersey_name")}>
              <input id="jersey_name" maxLength={20} value={values.jersey_name} onChange={set("jersey_name")} className={fieldClass} placeholder="As printed on the back" />
            </Field>
          </div>
          {/* Live jersey preview */}
          <div className="flex flex-col items-center gap-2">
            <span className={labelClass}>Preview</span>
            <div className="relative grid h-56 w-44 place-items-center rounded-t-[3rem] bg-gradient-to-b from-navy-700 to-navy-900 shadow-lg">
              <div className="absolute inset-x-0 top-0 h-6 rounded-t-[3rem] bg-navy-900/40" />
              <div className="flex flex-col items-center">
                <span className="max-w-[9rem] truncate px-2 font-display text-lg font-bold tracking-wide text-white uppercase">{values.jersey_name || "NAME"}</span>
                <span className="font-display text-6xl font-extrabold text-gold-400">{values.jersey_number || "0"}</span>
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* STEP 4 — Documents & Payment */}
      {stepPanel(4, <>
        <h3 className="editorial-heading text-2xl text-navy-900">Documents &amp; payment</h3>
        <PhotoUpload value={values.photo_url} error={err("photo_url")} onUploaded={(url) => {
          setValues((v) => ({ ...v, photo_url: url }));
          if (confirmDuplicate) setConfirmDuplicate(false);
          setClientErrors((c) => { const n = { ...c }; delete n.photo_url; return n; });
        }} />
        <PrivateDocUpload ref={aadhaarRef} kind="aadhaar" label="Masked Aadhaar" help="Download your masked Aadhaar from the UIDAI website — only the last 4 digits should be visible. JPG, PNG or PDF." error={err("aadhaar_doc_key")} onChange={(h) => setDocSel((d) => ({ ...d, aadhaar: h }))} />

        <div className="rounded-xl border border-navy-900/10 bg-cream-100 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className={labelClass}>Registration fee</span>
              <p className="font-display text-3xl font-extrabold text-navy-900">₹{feeText}</p>
              {upiId ? (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-ink-900">Pay via UPI to <span className="font-mono font-semibold">{upiId}</span></span>
                  <button type="button" onClick={() => copy("upi", upiId)} className="inline-flex items-center gap-1 rounded-md border border-navy-900/15 px-2 py-1 text-xs font-medium text-navy-700 hover:border-navy-700">
                    {copied === "upi" ? <Check className="size-3" /> : <Copy className="size-3" />} {copied === "upi" ? "Copied" : "Copy"}
                  </button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted-ink">Pay the fee via UPI, then enter your transaction ID below.</p>
              )}
            </div>
            {upiQrUrl && (
              <div className="flex shrink-0 flex-col items-center gap-1.5">
                <a
                  href={upiQrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Tap to view the QR full size"
                  className="block rounded-lg border border-navy-900/10 bg-white p-2 transition-colors hover:border-navy-700"
                >
                  <Image src={upiQrUrl} alt="UPI payment QR" width={120} height={120} unoptimized className="size-28 object-contain" />
                </a>
                <a
                  href={upiQrUrl}
                  download="BPCCL-payment-qr.jpeg"
                  className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-gold-600"
                >
                  <Download className="size-3" /> Save QR
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="UPI Transaction ID (UTR)" htmlFor="payment_utr" required error={err("payment_utr")} hint="The 12-digit reference from your UPI app.">
            <input id="payment_utr" inputMode="numeric" maxLength={12} value={values.payment_utr} onChange={set("payment_utr")} className={fieldClass} placeholder="12-digit UTR" />
          </Field>
          <PrivateDocUpload ref={paymentRef} kind="payment" label="Payment Screenshot" help="A screenshot of the successful UPI payment. JPG or PNG." error={err("payment_screenshot_key")} onChange={(h) => setDocSel((d) => ({ ...d, payment: h }))} />
        </div>

        <div className="rounded-xl border border-navy-900/10 bg-white p-4">
          <label className="flex items-start gap-3 text-sm text-ink-900">
            <input type="checkbox" name="data_consent" checked={values.data_consent} onChange={set("data_consent")} className="mt-0.5 size-4 shrink-0 accent-navy-700" />
            <span>I consent to the league using my Aadhaar and payment proof <span className="font-semibold">only</span> to verify my identity, age and payment. They will be deleted after verification.</span>
          </label>
          <Err msg={err("data_consent")} />
        </div>
      </>)}

      {/* STEP 5 — Review */}
      {stepPanel(5, <>
        <h3 className="editorial-heading text-2xl text-navy-900">Review &amp; submit</h3>
        <ReviewBlock title="Personal" onEdit={() => goEdit(1)} rows={[
          ["Name", values.full_name], ["DOB", values.dob], ["Phone", values.phone],
          ["Email", values.email], ["Company", values.company], ["LinkedIn", values.linkedin_url],
        ]} />
        <ReviewBlock title="Cricket" onEdit={() => goEdit(2)} rows={[
          ["Roles", values.roles.join(", ")], ["CricHeroes", values.cricheroes_url],
        ]} />
        <ReviewBlock title="Jersey Details" onEdit={() => goEdit(3)} rows={[
          ["T-Shirt", values.tshirt_size === OTHER_SIZE ? values.tshirt_size_other : values.tshirt_size],
          ["Lower", values.lower_size === OTHER_SIZE ? values.lower_size_other : values.lower_size],
          ["Sleeves", values.sleeve_type],
          ["Jersey", `${values.jersey_name} · ${values.jersey_number}`],
        ]} />
        <ReviewBlock title="Documents & Payment" onEdit={() => goEdit(4)} rows={[
          ["Photo", values.photo_url ? "Uploaded" : "—"],
          ["Aadhaar", docSel.aadhaar ? "Ready" : "—"],
          ["UTR", values.payment_utr], ["Amount", `₹${feeText}`],
          ["Payment proof", docSel.payment ? "Ready" : "—"],
        ]} />
        <div className="rounded-xl border border-gold-500/30 bg-gold-400/10 p-4">
          <p className="text-sm text-ink-900">
            <span className="font-semibold">Please note:</span> the ₹{feeText} paid now is
            your registration fee. If you are picked by a franchise in the auction, a
            further selection fee of <span className="font-semibold">₹3,000</span> is payable.
          </p>
        </div>

        <div className="rounded-xl border border-navy-900/10 bg-white p-4">
          <label className="flex items-start gap-3 text-sm text-ink-900">
            <input type="checkbox" name="terms_accepted" checked={values.terms_accepted} onChange={set("terms_accepted")} className="mt-0.5 size-4 shrink-0 accent-navy-700" />
            <span>
              I have read and accept the <span className="font-semibold">Terms &amp; Conditions</span>:
              the registration fee is non-refundable; if I am selected in the auction I agree to
              pay the ₹3,000 selection fee; I confirm the information I have provided is accurate;
              and I agree to abide by the league&apos;s rules and code of conduct.
            </span>
          </label>
          <Err msg={err("terms_accepted")} />
        </div>

        <p className="text-xs text-muted-ink">By submitting, your documents are uploaded securely and your registration is sent for review.</p>
      </>)}

      {/* Nav */}
      <div className="flex items-center justify-between gap-3 border-t border-navy-900/10 pt-6">
        {step > 1 ? (
          <button type="button" onClick={goBack} disabled={busy} className="inline-flex items-center gap-1.5 rounded-full border border-navy-900/20 px-5 py-3 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-900 disabled:opacity-60">
            <ArrowLeft className="size-4" /> Back
          </button>
        ) : <span />}
        {step < 5 ? (
          <button type="button" onClick={goNext} className="inline-flex items-center gap-1.5 rounded-full bg-navy-950 px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90">
            Next <ArrowRight className="size-4" />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={busy || !values.terms_accepted} className="inline-flex items-center gap-2 rounded-full bg-gold-400 px-7 py-3 text-sm font-bold uppercase tracking-wide text-navy-950 transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {uploading ? "Uploading…" : pending ? "Submitting…" : "Submit Registration"}
          </button>
        )}
      </div>
    </form>
  );
}

function ReviewBlock({ title, rows, onEdit }: { title: string; rows: [string, string][]; onEdit: () => void }) {
  return (
    <div className="rounded-xl border border-navy-900/10 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className={labelClass}>{title}</span>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:text-gold-600">
          <Pencil className="size-3" /> Edit
        </button>
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="text-[10px] font-semibold tracking-wide text-muted-ink uppercase">{k}</dt>
            <dd className="truncate text-sm text-ink-900">{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
