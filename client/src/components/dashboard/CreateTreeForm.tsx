/**
 * CreateTreeForm — Onboarding form to create a new revenue plan tree.
 *
 * 7 required fields + 3 optional fields. Validates on blur.
 * Shows loading state during AI generation ("Building your tree..." -> "Analyzing your metrics...").
 * Design spec Section 5, messaging doc Section 3
 */

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { api } from "../../lib/api.js";
import type { Tree, TreeInputs } from "../../../../shared/schemas/tree.js";

interface FormValues {
  currentARR: string;
  targetARR: string;
  timeHorizon: "quarterly" | "annual";
  customerCount: string;
  averageACV: string;
  currentNRR: string;
  logoChurnRate: string;
  pipelineValue: string;
  winRate: string;
  salesCycleLength: string;
}

interface FormErrors {
  [key: string]: string | undefined;
}

function parseCurrency(val: string): number {
  // Strip $ signs and M/K suffixes
  const cleaned = val.replace(/[$,\s]/g, "").toUpperCase();
  if (cleaned.endsWith("B")) return parseFloat(cleaned) * 1_000_000_000;
  if (cleaned.endsWith("M")) return parseFloat(cleaned) * 1_000_000;
  if (cleaned.endsWith("K")) return parseFloat(cleaned) * 1_000;
  return parseFloat(cleaned);
}

function parsePercent(val: string): number {
  const cleaned = val.replace(/%/g, "").trim();
  const num = parseFloat(cleaned);
  // Treat > 1 as a percentage (e.g. 115 = 1.15)
  return num > 1 ? num / 100 : num;
}

function validateField(name: string, value: string): string | undefined {
  const requiredFields = [
    "currentARR",
    "targetARR",
    "customerCount",
    "averageACV",
    "currentNRR",
    "logoChurnRate",
  ];

  if (requiredFields.includes(name)) {
    if (!value.trim()) {
      const labels: Record<string, string> = {
        currentARR: "Current ARR",
        targetARR: "Target ARR",
        customerCount: "Current customers",
        averageACV: "Average deal size",
        currentNRR: "Net revenue retention",
        logoChurnRate: "Logo churn rate",
      };
      return `${labels[name] || name} is required to build your tree.`;
    }
    const parsed =
      name === "currentNRR" || name === "logoChurnRate"
        ? parsePercent(value)
        : parseCurrency(value);
    if (isNaN(parsed) || parsed < 0) {
      return "Enter a positive number.";
    }
  }
  return undefined;
}

export function CreateTreeForm() {
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>({
    currentARR: "",
    targetARR: "",
    timeHorizon: "annual",
    customerCount: "",
    averageACV: "",
    currentNRR: "",
    logoChurnRate: "",
    pipelineValue: "",
    winRate: "",
    salesCycleLength: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState("Building your tree...");
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  }

  function isFormValid(): boolean {
    const requiredFields: (keyof FormValues)[] = [
      "currentARR",
      "targetARR",
      "customerCount",
      "averageACV",
      "currentNRR",
      "logoChurnRate",
    ];
    for (const field of requiredFields) {
      if (!values[field].trim()) return false;
      const error = validateField(field, values[field]);
      if (error) return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate all required fields
    const requiredFields: (keyof FormValues)[] = [
      "currentARR",
      "targetARR",
      "customerCount",
      "averageACV",
      "currentNRR",
      "logoChurnRate",
    ];
    const newErrors: FormErrors = {};
    for (const field of requiredFields) {
      const error = validateField(field, values[field]);
      if (error) newErrors[field] = error;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setLoadingText("Building your tree...");

    // Update loading text after 5s
    loadingTimerRef.current = setTimeout(() => {
      setLoadingText("Analyzing your metrics...");
    }, 5000);

    try {
      const inputs: TreeInputs = {
        currentARR: parseCurrency(values.currentARR),
        targetARR: parseCurrency(values.targetARR),
        timeHorizon: values.timeHorizon,
        customerCount: Math.round(parseCurrency(values.customerCount)),
        averageACV: parseCurrency(values.averageACV),
        currentNRR: parsePercent(values.currentNRR),
        logoChurnRate: parsePercent(values.logoChurnRate),
        ...(values.pipelineValue.trim()
          ? { pipelineValue: parseCurrency(values.pipelineValue) }
          : {}),
        ...(values.winRate.trim()
          ? { winRate: parsePercent(values.winRate) }
          : {}),
        ...(values.salesCycleLength.trim()
          ? { salesCycleLength: parseInt(values.salesCycleLength, 10) }
          : {}),
      };

      const result = await api<{ tree: Tree }>("/api/trees", {
        method: "POST",
        body: { inputs },
      });

      navigate(`/tree/${result.tree.id}`);
    } catch {
      setSubmitError("We couldn't generate your tree. Please try again.");
    } finally {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="create-tree">
      <div className="create-tree__header">
        <h1 className="create-tree__title">New revenue plan</h1>
        <p className="create-tree__subtitle">
          Enter your metrics. We'll build the tree.
        </p>
      </div>

      <form className="create-tree__form" onSubmit={handleSubmit} noValidate>
        {/* REQUIRED section */}
        <div className="create-tree__section">
          <p className="create-tree__section-label">Required</p>

          {/* Current ARR + Target ARR row */}
          <div className="create-tree__row">
            <FormField
              name="currentARR"
              label="Current ARR"
              placeholder="$12M"
              helper="Your annualized recurring revenue today."
              prefix="$"
              error={errors.currentARR}
              value={values.currentARR}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
            />
            <FormField
              name="targetARR"
              label="Target ARR"
              placeholder="$18M"
              helper="Where you want to be at the end of this period."
              prefix="$"
              error={errors.targetARR}
              value={values.targetARR}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
            />
          </div>

          {/* Time horizon full width */}
          <SelectField
            name="timeHorizon"
            label="Planning period"
            helper="How far out are you planning?"
            value={values.timeHorizon}
            onChange={handleChange}
            disabled={isSubmitting}
            options={[
              { value: "annual", label: "This year" },
              { value: "quarterly", label: "This quarter" },
            ]}
          />

          {/* Customer count + Average ACV row */}
          <div className="create-tree__row">
            <FormField
              name="customerCount"
              label="Current customers"
              placeholder="340"
              helper="Active paying accounts."
              error={errors.customerCount}
              value={values.customerCount}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              inputMode="numeric"
            />
            <FormField
              name="averageACV"
              label="Average deal size"
              placeholder="$35K"
              helper="Annual contract value per customer."
              prefix="$"
              error={errors.averageACV}
              value={values.averageACV}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
            />
          </div>

          {/* NRR + Logo churn row */}
          <div className="create-tree__row">
            <FormField
              name="currentNRR"
              label="Net revenue retention"
              placeholder="115%"
              helper="Revenue retained + expanded from existing customers."
              suffix="%"
              error={errors.currentNRR}
              value={values.currentNRR}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
            />
            <FormField
              name="logoChurnRate"
              label="Logo churn rate"
              placeholder="5%"
              helper="Percentage of customers lost per year."
              suffix="%"
              error={errors.logoChurnRate}
              value={values.logoChurnRate}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* OPTIONAL section */}
        <div className="create-tree__section">
          <p className="create-tree__section-label">Optional</p>

          {/* Pipeline + Win rate row */}
          <div className="create-tree__row">
            <FormField
              name="pipelineValue"
              label="Current pipeline"
              placeholder="$4.2M"
              helper="Total value of open sales opportunities."
              prefix="$"
              optional
              value={values.pipelineValue}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
            />
            <FormField
              name="winRate"
              label="Average win rate"
              placeholder="28%"
              helper="Percentage of qualified pipeline that closes."
              suffix="%"
              optional
              value={values.winRate}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
            />
          </div>

          {/* Sales cycle full width */}
          <FormField
            name="salesCycleLength"
            label="Average sales cycle"
            placeholder="45"
            helper="Days from qualified lead to closed deal."
            suffix="days"
            optional
            value={values.salesCycleLength}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            inputMode="numeric"
          />
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="create-tree__error">
            <AlertCircle size={20} style={{ color: "var(--color-error)", flexShrink: 0 }} />
            <span className="create-tree__error-text">{submitError}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className={`btn btn-primary btn-large create-tree__submit${isSubmitting ? " create-tree__submit--loading" : ""}`}
          disabled={isSubmitting || !isFormValid()}
          style={{ width: "100%" }}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="create-tree__spinner" />
              {loadingText}
            </>
          ) : (
            "Build my tree"
          )}
        </button>
      </form>

      <style>{`
        .create-tree {
          max-width: 560px;
          margin: 0 auto;
          padding: var(--space-12) var(--space-6) var(--space-20);
        }

        .create-tree__header {
          margin-bottom: var(--space-8);
        }

        .create-tree__title {
          font-size: var(--text-2xl);
          font-weight: var(--weight-bold);
          color: var(--color-text-primary);
          line-height: var(--leading-tight);
          margin-bottom: var(--space-2);
        }

        .create-tree__subtitle {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          line-height: var(--leading-normal);
        }

        .create-tree__form {
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }

        .create-tree__section {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .create-tree__section-label {
          font-size: var(--text-xs);
          font-weight: var(--weight-medium);
          color: var(--color-text-tertiary);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wide);
          line-height: 1;
        }

        .create-tree__row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }

        .create-tree__submit {
          margin-top: var(--space-4);
        }

        .create-tree__submit--loading {
          opacity: 0.8;
        }

        .create-tree__spinner {
          animation: spin 0.6s linear infinite;
        }

        .create-tree__error {
          background: #fef2f2;
          border: 1px solid rgba(220, 38, 38, 0.2);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .create-tree__error-text {
          font-size: var(--text-sm);
          color: var(--color-text-primary);
          line-height: var(--leading-normal);
        }

        /* Form field styles */
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .form-field__label {
          display: block;
          font-size: var(--text-sm);
          font-weight: var(--weight-medium);
          color: var(--color-text-primary);
          margin-bottom: var(--space-1-5);
          line-height: 1;
        }

        .form-field__optional-tag {
          font-size: var(--text-xs);
          color: var(--color-text-tertiary);
          margin-left: var(--space-1);
          font-weight: var(--weight-normal);
        }

        .form-field__input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-field__prefix {
          position: absolute;
          left: var(--space-3);
          font-size: var(--text-sm);
          color: var(--color-text-tertiary);
          pointer-events: none;
          z-index: 1;
        }

        .form-field__suffix {
          position: absolute;
          right: var(--space-3);
          font-size: var(--text-sm);
          color: var(--color-text-tertiary);
          pointer-events: none;
        }

        .form-field__input {
          width: 100%;
          height: 40px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 0 var(--space-3);
          font-size: var(--text-sm);
          color: var(--color-text-primary);
          background: var(--color-bg-input);
          transition: border-color var(--duration-fast) var(--ease-default);
          outline: none;
        }

        .form-field__input--has-prefix {
          padding-left: var(--space-6);
        }

        .form-field__input--has-suffix {
          padding-right: var(--space-8);
        }

        .form-field__input::placeholder {
          color: var(--color-text-tertiary);
        }

        .form-field__input:hover:not(:disabled) {
          border-color: var(--color-border-strong);
        }

        .form-field__input:focus {
          border-color: var(--color-brand);
          box-shadow: 0 0 0 3px rgba(23, 23, 23, 0.08);
        }

        .form-field__input--error {
          border-color: var(--color-error);
        }

        .form-field__input--error:focus {
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.08);
        }

        .form-field__input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          background: var(--color-bg-hover);
        }

        .form-field__helper {
          font-size: var(--text-xs);
          color: var(--color-text-tertiary);
          margin-top: var(--space-1);
          line-height: var(--leading-normal);
        }

        .form-field__error {
          font-size: var(--text-xs);
          color: var(--color-error);
          margin-top: var(--space-1);
          line-height: var(--leading-normal);
        }

        .form-field__select {
          width: 100%;
          height: 40px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 0 var(--space-8) 0 var(--space-3);
          font-size: var(--text-sm);
          color: var(--color-text-primary);
          background-color: var(--color-bg-input);
          background-image: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 4L6 8L10 4' stroke='%23737373' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-position: right var(--space-3) center;
          background-repeat: no-repeat;
          appearance: none;
          -webkit-appearance: none;
          cursor: pointer;
          transition: border-color var(--duration-fast) var(--ease-default);
          outline: none;
        }

        .form-field__select:hover:not(:disabled) {
          border-color: var(--color-border-strong);
        }

        .form-field__select:focus {
          border-color: var(--color-brand);
          box-shadow: 0 0 0 3px rgba(23, 23, 23, 0.08);
        }

        /* Collapse 2-column rows to 1 on narrow screens */
        @media (max-width: 540px) {
          .create-tree__row {
            grid-template-columns: 1fr;
          }

          .create-tree {
            padding: var(--space-8) var(--space-4) var(--space-12);
          }

          .create-tree__title {
            font-size: var(--text-xl);
          }
        }

        /* Ensure form inputs meet 44px minimum touch target height on mobile */
        @media (max-width: 767px) {
          .form-field__input,
          .form-field__select {
            height: 44px;
          }
        }
      `}</style>
    </div>
  );
}

// ─── FormField component ───────────────────────────────────────────────────

interface FormFieldProps {
  name: string;
  label: string;
  placeholder: string;
  helper: string;
  prefix?: string;
  suffix?: string;
  error?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  optional?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}

function FormField({
  name,
  label,
  placeholder,
  helper,
  prefix,
  suffix,
  error,
  value,
  onChange,
  onBlur,
  disabled,
  optional,
  inputMode,
}: FormFieldProps) {
  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={name}>
        {label}
        {optional && <span className="form-field__optional-tag">(optional)</span>}
      </label>
      <div className="form-field__input-wrapper">
        {prefix && <span className="form-field__prefix">{prefix}</span>}
        <input
          id={name}
          name={name}
          type="text"
          className={`form-field__input${prefix ? " form-field__input--has-prefix" : ""}${suffix ? " form-field__input--has-suffix" : ""}${error ? " form-field__input--error" : ""}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          inputMode={inputMode}
          aria-describedby={`${name}-helper`}
          aria-invalid={!!error}
        />
        {suffix && <span className="form-field__suffix">{suffix}</span>}
      </div>
      {error ? (
        <span className="form-field__error" role="alert" id={`${name}-helper`}>
          {error}
        </span>
      ) : (
        <span className="form-field__helper" id={`${name}-helper`}>
          {helper}
        </span>
      )}
    </div>
  );
}

// ─── SelectField component ─────────────────────────────────────────────────

interface SelectFieldProps {
  name: string;
  label: string;
  helper: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  options: { value: string; label: string }[];
}

function SelectField({
  name,
  label,
  helper,
  value,
  onChange,
  disabled,
  options,
}: SelectFieldProps) {
  return (
    <div className="form-field">
      <label className="form-field__label" htmlFor={name}>
        {label}
      </label>
      <select
        id={name}
        name={name}
        className="form-field__select"
        value={value}
        onChange={onChange}
        disabled={disabled}
        aria-describedby={`${name}-helper`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="form-field__helper" id={`${name}-helper`}>
        {helper}
      </span>
    </div>
  );
}
