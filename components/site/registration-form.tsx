"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import {
  submitRegistration,
  type RegistrationState,
} from "@/app/register/actions";
import {
  TSHIRT_SIZES,
  LOWER_SIZES,
  OTHER_SIZE,
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
import { cn } from "@/lib/utils";

const fieldClass =
  "w-full rounded-sm border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary";
const labelClass =
  "font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase";

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
  jersey_number: string;
  jersey_name: string;
  payment_utr: string;
  data_consent: boolean;
} & StatValues;

const EMPTY_STATS = Object.fromEntries(
  STAT_FIELDS.map((f) => [f.key, ""]),
) as StatValues;

const EMPTY_VALUES: FormValues = {
  full_name: "",
  dob: "",
  phone: "",
  email: "",
  company: "",
  work_email: "",
  photo_url: "",
  cricheroes_url: "",
  linkedin_url: "",
  roles: [],
  tshirt_size: "",
  tshirt_size_other: "",
  lower_size: "",
  lower_size_other: "",
  jersey_number: "",
  jersey_name: "",
  payment_utr: "",
  data_consent: false,
  ...EMPTY_STATS,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Client-side validation that mirrors the server. We run this BEFORE uploading
 * the private docs so an incomplete form never creates orphan objects in R2.
 */
function validate(
  v: FormValues,
  hasAadhaar: boolean,
  hasPayment: boolean,
): Record<string, string> {
  const e: Record<string, string> = {};
  if (!v.full_name.trim()) e.full_name = "Please enter your full name.";

  if (!v.dob) e.dob = "Please enter your date of birth.";
  else {
    const d = new Date(v.dob);
    if (Number.isNaN(d.getTime()) || d > new Date())
      e.dob = "Enter a valid date of birth.";
    else {
      const age = computeAge(v.dob);
      if (age < MIN_AGE)
        e.dob = `Registration is open to players aged ${MIN_AGE} and above.`;
      else if (age > MAX_AGE) e.dob = "Please double-check your date of birth.";
    }
  }

  if (!v.phone.trim()) e.phone = "Please enter a contact number.";
  else if (!isValidPhone(normalizePhone(v.phone)))
    e.phone = "Enter a valid contact number (10–13 digits).";

  if (!v.email.trim()) e.email = "Please enter your email.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address.";

  if (!v.company.trim()) e.company = "Please enter your company.";

  if (!v.work_email.trim()) e.work_email = "Please enter a work or personal email.";
  else if (!EMAIL_RE.test(v.work_email.trim()))
    e.work_email = "Enter a valid email address.";

  if (!v.photo_url) e.photo_url = "Please upload a player photo.";
  if (!v.cricheroes_url.trim())
    e.cricheroes_url = "A CricHeroes profile link is required.";
  if (!v.linkedin_url.trim())
    e.linkedin_url = "A LinkedIn profile link is required.";

  const sizeOk = (sel: string, other: string) =>
    sel === OTHER_SIZE ? other.trim().length > 0 : sel.length > 0;
  if (!sizeOk(v.tshirt_size, v.tshirt_size_other))
    e.tshirt_size = "Please select a size.";
  if (!sizeOk(v.lower_size, v.lower_size_other))
    e.lower_size = "Please select a size.";

  if (!v.jersey_number.trim()) e.jersey_number = "Enter your jersey number.";
  else if (!/^\d{1,3}$/.test(v.jersey_number))
    e.jersey_number = "Jersey number must be 1–3 digits.";
  if (!v.jersey_name.trim()) e.jersey_name = "Enter the name for your jersey.";

  if (v.roles.length === 0) e.roles = "Select at least one playing role.";

  for (const f of STAT_FIELDS) {
    if (!v[f.key].trim()) e[f.key] = `Enter ${f.label} (or NA).`;
  }

  if (!hasAadhaar) e.aadhaar_doc_key = "Please upload your masked Aadhaar.";
  if (!hasPayment) e.payment_screenshot_key = "Please upload your payment screenshot.";

  if (!v.payment_utr.trim()) e.payment_utr = "Enter your UPI transaction ID (UTR).";
  else if (!/^\d{12}$/.test(v.payment_utr.trim()))
    e.payment_utr = "The UTR must be exactly 12 digits.";

  if (!v.data_consent)
    e.data_consent = "Please consent to the verification use of your documents.";

  return e;
}

function Err({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-[var(--closed)]">{msg}</p>;
}

function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className={labelClass}>
        {label} {required && <span className="text-primary">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      <Err msg={error} />
    </div>
  );
}

function Legend({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-xs tracking-[0.24em] text-primary uppercase">
      {children}
    </span>
  );
}

export function RegistrationForm({
  registrationFee,
  upiId,
  upiQrUrl,
}: {
  registrationFee: number;
  upiId: string | null;
  upiQrUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(
    submitRegistration,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const aadhaarRef = useRef<PrivateDocHandle>(null);
  const paymentRef = useRef<PrivateDocHandle>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [confirmTick, setConfirmTick] = useState(0);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const [docKeys, setDocKeys] = useState({ aadhaar: "", payment: "" });
  const [uploading, setUploading] = useState(false);
  const [submitTick, setSubmitTick] = useState(0);

  // After docs upload + keys set, actually submit the form (one tick later so the
  // hidden key inputs are in the DOM before the server action reads them).
  useEffect(() => {
    if (submitTick > 0 && docKeys.aadhaar && docKeys.payment) {
      formRef.current?.requestSubmit();
    }
  }, [submitTick, docKeys]);

  // "Submit anyway" (duplicate phone) — docs are already uploaded, just resubmit.
  useEffect(() => {
    if (confirmTick > 0 && confirmDuplicate) formRef.current?.requestSubmit();
  }, [confirmTick, confirmDuplicate]);

  const set =
    (key: keyof FormValues) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const value =
        e.target instanceof HTMLInputElement && e.target.type === "checkbox"
          ? e.target.checked
          : e.target.value;
      setValues((v) => ({ ...v, [key]: value }));
      if (confirmDuplicate) setConfirmDuplicate(false);
      if (clientErrors[key as string])
        setClientErrors((c) => {
          const next = { ...c };
          delete next[key as string];
          return next;
        });
    };

  const toggleRoleInGroup =
    (groupRoles: readonly string[], role: string) => () => {
      setValues((v) => {
        const already = v.roles.includes(role);
        const withoutGroup = v.roles.filter((r) => !groupRoles.includes(r));
        return {
          ...v,
          roles: already ? withoutGroup : [...withoutGroup, role],
        };
      });
      if (confirmDuplicate) setConfirmDuplicate(false);
    };

  async function handleSubmit() {
    const hasAadhaar = aadhaarRef.current?.hasFile() ?? false;
    const hasPayment = paymentRef.current?.hasFile() ?? false;
    const errs = validate(values, hasAadhaar, hasPayment);
    setClientErrors(errs);
    if (Object.keys(errs).length > 0) return;

    // Validation passed → upload the private docs, then submit with their keys.
    setUploading(true);
    const [aKey, pKey] = await Promise.all([
      aadhaarRef.current!.upload(),
      paymentRef.current!.upload(),
    ]);
    setUploading(false);
    if (!aKey || !pKey) return; // each uploader shows its own error
    setDocKeys({ aadhaar: aKey, payment: pKey });
    setSubmitTick((t) => t + 1);
  }

  const feeText = new Intl.NumberFormat("en-IN").format(registrationFee);
  const err = (k: string) => clientErrors[k] ?? state.errors?.[k];
  const busy = pending || uploading;

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-primary/40 bg-card p-10 text-center">
        <CheckCircle2 className="size-11 text-primary" />
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground uppercase">
          You&apos;re In
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-8">
      <input
        type="hidden"
        name="confirm_duplicate"
        value={confirmDuplicate ? "true" : "false"}
      />
      <input type="hidden" name="aadhaar_doc_key" value={docKeys.aadhaar} />
      <input
        type="hidden"
        name="payment_screenshot_key"
        value={docKeys.payment}
      />

      {state.status === "error" && state.message && (
        <p className="rounded-sm border border-[var(--closed)]/40 bg-[var(--closed)]/10 px-3.5 py-2.5 text-sm text-[var(--closed)]">
          {state.message}
        </p>
      )}

      {state.status === "duplicate" && (
        <div className="flex items-start gap-3 rounded-sm border border-primary/40 bg-primary/10 px-3.5 py-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground/90">{state.message}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirmDuplicate(true);
                setConfirmTick((t) => t + 1);
              }}
              className="inline-flex w-fit items-center gap-2 rounded-sm border border-primary bg-transparent px-4 py-2 font-heading text-xs font-bold tracking-wide text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-70"
            >
              {busy && <Loader2 className="size-3.5 animate-spin" />}
              Submit Anyway
            </button>
          </div>
        </div>
      )}

      {/* ---- Personal info ---- */}
      <fieldset className="flex flex-col gap-5">
        <Legend>Personal Details</Legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full Name" htmlFor="full_name" required error={err("full_name")}>
            <input id="full_name" name="full_name" value={values.full_name} onChange={set("full_name")} className={fieldClass} placeholder="Full name" />
          </Field>
          <Field
            label="Date of Birth"
            htmlFor="dob"
            required
            error={err("dob")}
            hint={`Open to players aged ${MIN_AGE}+`}
          >
            <input id="dob" name="dob" type="date" value={values.dob} onChange={set("dob")} className={cn(fieldClass, "appearance-none")} />
          </Field>
          <Field label="Contact Number" htmlFor="phone" required error={err("phone")}>
            <input id="phone" name="phone" type="tel" inputMode="tel" value={values.phone} onChange={set("phone")} className={fieldClass} placeholder="10-digit mobile" />
          </Field>
          <Field label="Email ID" htmlFor="email" required error={err("email")}>
            <input id="email" name="email" type="email" value={values.email} onChange={set("email")} className={fieldClass} placeholder="you@email.com" />
          </Field>
          <Field label="Company" htmlFor="company" required error={err("company")}>
            <input id="company" name="company" value={values.company} onChange={set("company")} className={fieldClass} placeholder="Where you work" />
          </Field>
          <Field
            label="Work Email"
            htmlFor="work_email"
            required
            error={err("work_email")}
            hint="Prefer your company email. If you don't have one, a personal email is fine."
          >
            <input id="work_email" name="work_email" type="email" value={values.work_email} onChange={set("work_email")} className={fieldClass} placeholder="you@company.com (or personal)" />
          </Field>
          <Field
            label="CricHeroes Profile Link"
            htmlFor="cricheroes_url"
            required
            error={err("cricheroes_url")}
            hint="Reviewers open this to assess your profile."
          >
            <input id="cricheroes_url" name="cricheroes_url" value={values.cricheroes_url} onChange={set("cricheroes_url")} className={fieldClass} placeholder="cricheroes.com/player/…" />
          </Field>
          <Field label="LinkedIn Profile Link" htmlFor="linkedin_url" required error={err("linkedin_url")}>
            <input id="linkedin_url" name="linkedin_url" value={values.linkedin_url} onChange={set("linkedin_url")} className={fieldClass} placeholder="linkedin.com/in/…" />
          </Field>
        </div>

        {/* Photo upload writes its public URL into a hidden field for submit. */}
        <input type="hidden" name="photo_url" value={values.photo_url} />
        <PhotoUpload
          value={values.photo_url}
          error={err("photo_url")}
          onUploaded={(url) => {
            setValues((v) => ({ ...v, photo_url: url }));
            if (confirmDuplicate) setConfirmDuplicate(false);
            setClientErrors((c) => {
              const next = { ...c };
              delete next.photo_url;
              return next;
            });
          }}
        />
      </fieldset>

      <hr className="crease-rule w-full" />

      {/* ---- Playing profile: roles + stats ---- */}
      <fieldset className="flex flex-col gap-5">
        <Legend>Playing Profile</Legend>

        {values.roles.map((r) => (
          <input key={r} type="hidden" name="roles" value={r} />
        ))}
        <div className="flex flex-col gap-3">
          <span className={labelClass}>
            Playing Role <span className="text-primary">*</span>
          </span>
          <p className="text-xs text-muted-foreground">
            Pick one option per category. You can select across categories (e.g.
            a batter who also bowls).
          </p>
          <div className="flex flex-col gap-4">
            {ROLE_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-2">
                <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground/80 uppercase">
                  {group.label}
                </span>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {group.roles.map((role) => {
                    const checked = values.roles.includes(role);
                    return (
                      <label
                        key={role}
                        className={cn(
                          "flex cursor-pointer items-center gap-2.5 rounded-sm border px-3 py-2.5 text-sm transition-colors",
                          checked
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-input bg-background text-foreground/80 hover:border-primary/50",
                        )}
                      >
                        <input
                          type="radio"
                          checked={checked}
                          onChange={() => {}}
                          onClick={toggleRoleInGroup(group.roles, role)}
                          className="size-4 shrink-0 accent-[var(--gold)]"
                        />
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
          <span className={labelClass}>
            Career Stats <span className="text-primary">*</span>
          </span>
          <p className="text-xs text-muted-foreground">
            Enter <span className="font-medium text-foreground/90">NA</span> for
            any stat that doesn&apos;t apply to you.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {STAT_FIELDS.map((f) => (
              <Field
                key={f.key}
                label={f.label}
                htmlFor={f.key}
                required
                error={err(f.key)}
              >
                <input
                  id={f.key}
                  name={f.key}
                  value={values[f.key]}
                  onChange={set(f.key)}
                  className={fieldClass}
                  placeholder="e.g. 42 or NA"
                />
              </Field>
            ))}
          </div>
        </div>
      </fieldset>

      <hr className="crease-rule w-full" />

      {/* ---- Kit ---- */}
      <fieldset className="flex flex-col gap-5">
        <Legend>Kit & Jersey</Legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="T-Shirt Size" htmlFor="tshirt_size" required error={err("tshirt_size")}>
            <div className="flex flex-col gap-2">
              <select id="tshirt_size" name="tshirt_size" value={values.tshirt_size} onChange={set("tshirt_size")} className={cn(fieldClass, "appearance-none")}>
                <option value="" disabled>Select size…</option>
                {TSHIRT_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value={OTHER_SIZE}>Other</option>
              </select>
              {values.tshirt_size === OTHER_SIZE && (
                <input name="tshirt_size_other" value={values.tshirt_size_other} onChange={set("tshirt_size_other")} className={fieldClass} placeholder="Enter your size" />
              )}
            </div>
          </Field>
          <Field label="Lower Size" htmlFor="lower_size" required error={err("lower_size")}>
            <div className="flex flex-col gap-2">
              <select id="lower_size" name="lower_size" value={values.lower_size} onChange={set("lower_size")} className={cn(fieldClass, "appearance-none")}>
                <option value="" disabled>Select size…</option>
                {LOWER_SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
                <option value={OTHER_SIZE}>Other</option>
              </select>
              {values.lower_size === OTHER_SIZE && (
                <input name="lower_size_other" value={values.lower_size_other} onChange={set("lower_size_other")} className={fieldClass} placeholder="Enter your size" />
              )}
            </div>
          </Field>
          <Field label="Number on Jersey" htmlFor="jersey_number" required error={err("jersey_number")}>
            <input id="jersey_number" name="jersey_number" inputMode="numeric" value={values.jersey_number} onChange={set("jersey_number")} className={fieldClass} placeholder="e.g. 7" />
          </Field>
          <Field label="Name on Jersey" htmlFor="jersey_name" required error={err("jersey_name")}>
            <input id="jersey_name" name="jersey_name" maxLength={20} value={values.jersey_name} onChange={set("jersey_name")} className={fieldClass} placeholder="As printed on the back" />
          </Field>
        </div>
      </fieldset>

      <hr className="crease-rule w-full" />

      {/* ---- Identity (masked Aadhaar) ---- */}
      <fieldset className="flex flex-col gap-5">
        <Legend>Identity Verification</Legend>
        <PrivateDocUpload
          ref={aadhaarRef}
          kind="aadhaar"
          label="Masked Aadhaar"
          help="Download your masked Aadhaar from the UIDAI website. Only the last 4 digits should be visible. JPG, PNG or PDF."
          error={err("aadhaar_doc_key")}
        />
      </fieldset>

      <hr className="crease-rule w-full" />

      {/* ---- Payment ---- */}
      <fieldset className="flex flex-col gap-5">
        <Legend>Registration Fee Payment</Legend>
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className={labelClass}>Amount Payable</span>
              <span className="font-heading text-3xl font-bold text-primary">
                ₹{feeText}
              </span>
              {upiId ? (
                <span className="mt-1 text-sm text-foreground/85">
                  Pay via UPI to{" "}
                  <span className="font-mono font-semibold text-foreground">
                    {upiId}
                  </span>
                  , then enter your transaction ID and upload the screenshot below.
                </span>
              ) : (
                <span className="mt-1 text-sm text-muted-foreground">
                  Pay the fee via UPI, then enter your transaction ID and upload
                  the screenshot below.
                </span>
              )}
            </div>
            {upiQrUrl && (
              <div className="shrink-0 rounded-md border border-border bg-background p-2">
                <Image
                  src={upiQrUrl}
                  alt="UPI payment QR code"
                  width={132}
                  height={132}
                  unoptimized
                  className="size-32 object-contain"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="UPI Transaction ID (UTR)"
            htmlFor="payment_utr"
            required
            error={err("payment_utr")}
            hint="The 12-digit reference from your UPI app."
          >
            <input id="payment_utr" name="payment_utr" inputMode="numeric" maxLength={12} value={values.payment_utr} onChange={set("payment_utr")} className={fieldClass} placeholder="12-digit UTR" />
          </Field>
          <PrivateDocUpload
            ref={paymentRef}
            kind="payment"
            label="Payment Screenshot"
            help="A screenshot of the successful UPI payment. JPG or PNG."
            error={err("payment_screenshot_key")}
          />
        </div>
      </fieldset>

      <hr className="crease-rule w-full" />

      {/* ---- Consent (data usage) ---- */}
      <div className="flex flex-col gap-1.5">
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
          <label className="flex items-start gap-3 text-sm text-foreground/90">
            <input type="checkbox" name="data_consent" checked={values.data_consent} onChange={set("data_consent")} className="mt-0.5 size-4 shrink-0 accent-[var(--gold)]" />
            <span>
              I consent to the league using my Aadhaar and payment proof{" "}
              <span className="font-semibold text-foreground">only</span> to
              verify my identity, age and payment. They will be deleted after
              verification.
            </span>
          </label>
        </div>
        <Err msg={err("data_consent")} />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 self-start rounded-sm bg-primary px-7 py-3 font-heading text-sm font-bold tracking-wide text-primary-foreground uppercase shadow-[0_0_20px_rgba(61,123,239,0.3)] transition-shadow hover:shadow-[0_0_30px_rgba(61,123,239,0.55)] disabled:opacity-70"
      >
        {busy && <Loader2 className="size-4 animate-spin" />}
        {uploading
          ? "Uploading documents…"
          : pending
            ? "Submitting…"
            : "Submit Registration"}
      </button>
    </form>
  );
}
