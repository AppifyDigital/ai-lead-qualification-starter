"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormData = {
  name: string;
  phone: string;
  email: string;
  amount: string;
  zip: string;
};

export default function LandingPage() {
  const [formData, setFormData] = useState<FormData>({
    name: "Marco Alvarez",
    phone: "+1 (415) 555-0102",
    email: "marco.a@example.com",
    amount: "45,000",
    zip: "94103",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update =
    (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormData((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 900);
  };

  return (
    <main className="min-h-screen grid grid-cols-[1.1fr_1fr] bg-bg text-ink">
      {/* LEFT — marketing */}
      <section className="flex flex-col justify-between border-r border-line px-[72px] py-16">
        <div className="flex items-center gap-[10px]">
          <div className="grid size-[22px] place-items-center rounded-md bg-ink text-[12px] font-bold text-bg">
            N
          </div>
          <div className="text-[15px] font-semibold tracking-[-0.2px]">
            Northline
          </div>
          <div className="ml-1 text-[13px] text-ink-muted">
            Personal lending
          </div>
        </div>

        <div className="max-w-[520px]">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full bg-brand-tint py-[5px] pr-[10px] pl-2 text-[12px] font-medium text-brand-ink">
            <span
              className="size-[6px] rounded-full bg-brand"
              style={{
                boxShadow:
                  "0 0 0 4px color-mix(in oklch, var(--brand) 20%, transparent)",
              }}
            />
            Instant callback — typically under 30 seconds
          </div>
          <h1 className="text-[56px] font-semibold leading-[1.02] tracking-[-1.8px] text-balance">
            A real conversation. In the time it takes to close the tab.
          </h1>
          <p className="mt-[22px] max-w-[460px] text-[17px] leading-[1.5] text-ink-muted text-pretty">
            Tell us what you need. The moment you hit submit, our team calls
            you back to understand your situation and route you to the right
            specialist — in English or Spanish.
          </p>
        </div>

        <div className="flex gap-10 border-t border-line pt-6 text-[13px] text-ink-muted">
          <Stat n="$2.4B" label="Funded since 2019" />
          <Stat n="4.9 / 5" label="Customer rating" />
          <Stat n="< 30s" label="Average callback" />
        </div>
      </section>

      {/* RIGHT — form */}
      <section className="flex flex-col justify-center bg-panel px-[72px] py-16">
        <div className="w-full max-w-[440px]">
          <div className="mb-2 font-mono text-[13px] text-ink-muted">
            Step 1 of 1
          </div>
          <h2 className="mb-[6px] text-[28px] font-semibold tracking-[-0.6px]">
            Get a callback
          </h2>
          <p className="mb-7 text-[14px] text-ink-muted">
            No credit check. No commitment. 60 seconds.
          </p>

          {submitted ? (
            <SubmittedState name={formData.name} />
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-[14px]">
              <Field label="Full name">
                <FormInput
                  value={formData.name}
                  onChange={update("name")}
                  required
                />
              </Field>
              <Field label="Phone">
                <FormInput
                  value={formData.phone}
                  onChange={update("phone")}
                  type="tel"
                  required
                />
              </Field>
              <Field label="Email">
                <FormInput
                  value={formData.email}
                  onChange={update("email")}
                  type="email"
                  required
                />
              </Field>
              <div className="grid grid-cols-2 gap-[14px]">
                <Field label="Amount">
                  <div className="relative">
                    <span className="pointer-events-none absolute top-[11px] left-[14px] text-ink-muted">
                      $
                    </span>
                    <FormInput
                      value={formData.amount}
                      onChange={update("amount")}
                      className="pl-6"
                      required
                    />
                  </div>
                </Field>
                <Field label="ZIP code">
                  <FormInput
                    value={formData.zip}
                    onChange={update("zip")}
                    required
                  />
                </Field>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "mt-[10px] flex h-12 items-center justify-center gap-[10px] rounded-[10px] bg-ink text-[15px] font-medium text-bg transition-opacity",
                  submitting && "cursor-progress opacity-70"
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  <>
                    Request callback <ArrowRight className="size-[14px]" />
                  </>
                )}
              </button>

              <p className="mt-[6px] text-[12px] leading-[1.5] text-ink-muted">
                By submitting, you agree to receive a one-time call from our
                AI qualification assistant and our team. Message &amp; data
                rates may apply.
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="text-[22px] font-medium tracking-[-0.4px] text-ink">
        {n}
      </div>
      <div className="mt-[2px]">{label}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Label className="grid gap-[6px]">
      <span className="text-[12px] font-medium tracking-[0.1px] text-ink-muted">
        {label}
      </span>
      {children}
    </Label>
  );
}

function FormInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        "h-auto rounded-[8px] border-line bg-bg px-[14px] py-[11px] text-[14px] text-ink focus-visible:border-ink focus-visible:ring-0 focus-visible:shadow-[0_0_0_3px_color-mix(in_oklch,var(--ink)_8%,transparent)]",
        className
      )}
      {...props}
    />
  );
}

function SubmittedState({ name }: { name: string }) {
  return (
    <div className="rounded-[10px] border border-line bg-bg p-6">
      <div className="mb-2 font-mono text-[11px] tracking-widest text-brand-ink uppercase">
        Callback queued
      </div>
      <p className="text-[15px] leading-[1.5] text-ink">
        Thanks, {name.split(" ")[0]}. We&rsquo;ll call you at the number you
        provided — typically within 30 seconds.
      </p>
    </div>
  );
}
