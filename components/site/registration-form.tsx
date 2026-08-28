"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  ROLE_GROUPS,
  STAT_FIELDS,
  type StatKey,
} from "@/lib/registration";
import { PhotoUpload } from "@/components/site/photo-upload";
import { AadhaarUpload } from "@/components/site/aadhaar-upload";
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
  aadhaar_path: string;
  cricheroes_url: string;
  linkedin_url: string;
  roles: string[];
  tshirt_size: string;
  tshirt_size_other: string;
  lower_size: string;
  lower_size_other: string;
  jersey_number: string;
  jersey_name: string;
  consent: boolean;
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
  aadhaar_path: "",
  cricheroes_url: "",
  linkedin_url: "",
  roles: [],
  tshirt_size: "",
  tshirt_size_other: "",
  lower_size: "",
  lower_size_other: "",
  jersey_number: "",
  jersey_name: "",
  consent: false,
  ...EMPTY_STATS,
};

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

export function RegistrationForm({ registrationFee }: { registrationFee: number }) {
  const [state, formAction, pending] = useActionState(
    submitRegistration,
    initial,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [confirmTick, setConfirmTick] = useState(0);

  useEffect(() => {
    if (confirmTick > 0 && confirmDuplicate) formRef.current?.requestSubmit();
  }, [confirmTick, confirmDuplicate]);

  // Controlled inputs keep everything the player typed across a failed submit
  // (React 19 auto-resets uncontrolled form fields after an action runs).
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
    };

  // One selection per category: picking a role clears any other role from the
  // same group; clicking the selected role again deselects it.
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

  const feeText = new Intl.NumberFormat("en-IN").format(registrationFee);

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
              disabled={pending}
              onClick={() => {
                setConfirmDuplicate(true);
                setConfirmTick((t) => t + 1);
              }}
              className="inline-flex w-fit items-center gap-2 rounded-sm border border-primary bg-transparent px-4 py-2 font-heading text-xs font-bold tracking-wide text-primary uppercase transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-70"
            >
              {pending && <Loader2 className="size-3.5 animate-spin" />}
              Submit Anyway
            </button>
          </div>
        </div>
      )}

      {/* ---- Personal info ---- */}
      <fieldset className="flex flex-col gap-5">
        <Legend>Personal Details</Legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full Name" htmlFor="full_name" required error={state.errors?.full_name}>
            <input id="full_name" name="full_name" value={values.full_name} onChange={set("full_name")} className={fieldClass} placeholder="Full name" />
          </Field>
          <Field
            label="Date of Birth"
            htmlFor="dob"
            required
            error={state.errors?.dob}
            hint={`Open to players aged ${MIN_AGE}+`}
          >
            <input id="dob" name="dob" type="date" value={values.dob} onChange={set("dob")} className={cn(fieldClass, "appearance-none")} />
          </Field>
          <Field label="Contact Number" htmlFor="phone" required error={state.errors?.phone}>
            <input id="phone" name="phone" type="tel" inputMode="tel" value={values.phone} onChange={set("phone")} className={fieldClass} placeholder="10-digit mobile" />
          </Field>
          <Field label="Email ID" htmlFor="email" required error={state.errors?.email}>
            <input id="email" name="email" type="email" value={values.email} onChange={set("email")} className={fieldClass} placeholder="you@email.com" />
          </Field>
          <Field label="Company" htmlFor="company" required error={state.errors?.company}>
            <input id="company" name="company" value={values.company} onChange={set("company")} className={fieldClass} placeholder="Where you work" />
          </Field>
          <Field
            label="Work Email"
            htmlFor="work_email"
            required
            error={state.errors?.work_email}
            hint="Prefer your company email. If you don't have one, a personal email is fine."
          >
            <input id="work_email" name="work_email" type="email" value={values.work_email} onChange={set("work_email")} className={fieldClass} placeholder="you@company.com (or personal)" />
          </Field>
          <Field
            label="CricHeroes Profile Link"
            htmlFor="cricheroes_url"
            required
            error={state.errors?.cricheroes_url}
            hint="Reviewers open this to assess your profile."
          >
            <input id="cricheroes_url" name="cricheroes_url" value={values.cricheroes_url} onChange={set("cricheroes_url")} className={fieldClass} placeholder="cricheroes.com/player/…" />
          </Field>
          <Field label="LinkedIn Profile Link" htmlFor="linkedin_url" required error={state.errors?.linkedin_url}>
            <input id="linkedin_url" name="linkedin_url" value={values.linkedin_url} onChange={set("linkedin_url")} className={fieldClass} placeholder="linkedin.com/in/…" />
          </Field>
        </div>

        {/* Photo upload writes its public URL into a hidden field for submit. */}
        <input type="hidden" name="photo_url" value={values.photo_url} />
        <PhotoUpload
          value={values.photo_url}
          error={state.errors?.photo_url}
          onUploaded={(url) => {
            setValues((v) => ({ ...v, photo_url: url }));
            if (confirmDuplicate) setConfirmDuplicate(false);
          }}
        />

        {/* Aadhaar upload writes its (private) storage path into a hidden field. */}
        <input type="hidden" name="aadhaar_path" value={values.aadhaar_path} />
        <AadhaarUpload
          value={values.aadhaar_path}
          error={state.errors?.aadhaar_path}
          onUploaded={(path) => {
            setValues((v) => ({ ...v, aadhaar_path: path }));
            if (confirmDuplicate) setConfirmDuplicate(false);
          }}
        />
      </fieldset>

      <hr className="crease-rule w-full" />

      {/* ---- Playing profile: roles + stats ---- */}
      <fieldset className="flex flex-col gap-5">
        <Legend>Playing Profile</Legend>

        {/* Roles — multi-select (pick all that apply). */}
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
          <Err msg={state.errors?.roles} />
        </div>

        {/* Career stats — text so "NA" is accepted where a stat doesn't apply. */}
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
                error={state.errors?.[f.key]}
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
          <Field label="T-Shirt Size" htmlFor="tshirt_size" required error={state.errors?.tshirt_size}>
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
          <Field label="Lower Size" htmlFor="lower_size" required error={state.errors?.lower_size}>
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
          <Field label="Number on Jersey" htmlFor="jersey_number" required error={state.errors?.jersey_number}>
            <input id="jersey_number" name="jersey_number" inputMode="numeric" value={values.jersey_number} onChange={set("jersey_number")} className={fieldClass} placeholder="e.g. 7" />
          </Field>
          <Field label="Name on Jersey" htmlFor="jersey_name" required error={state.errors?.jersey_name}>
            <input id="jersey_name" name="jersey_name" maxLength={20} value={values.jersey_name} onChange={set("jersey_name")} className={fieldClass} placeholder="As printed on the back" />
          </Field>
        </div>
      </fieldset>

      <hr className="crease-rule w-full" />

      {/* ---- Fee agreement (mandatory) ---- */}
      <div className="flex flex-col gap-1.5">
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
          <label className="flex items-start gap-3 text-sm text-foreground/90">
            <input type="checkbox" name="consent" checked={values.consent} onChange={set("consent")} className="mt-0.5 size-4 shrink-0 accent-[var(--gold)]" />
            <span>
              I understand and agree that if I am selected during the auction, I
              must pay a <span className="font-bold text-primary">mandatory registration fee of ₹{feeText}</span>.
              I confirm the details above are accurate and agree to be contacted
              about my registration.
            </span>
          </label>
        </div>
        <Err msg={state.errors?.consent} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center gap-2 self-start rounded-sm bg-primary px-7 py-3 font-heading text-sm font-bold tracking-wide text-primary-foreground uppercase shadow-[0_0_20px_rgba(61,123,239,0.3)] transition-shadow hover:shadow-[0_0_30px_rgba(61,123,239,0.55)] disabled:opacity-70"
      >
        {pending && !confirmDuplicate && <Loader2 className="size-4 animate-spin" />}
        {pending ? "Submitting…" : "Submit Registration"}
      </button>
    </form>
  );
}
