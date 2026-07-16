// SignupPage.tsx (version mise à jour)

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Eye, EyeOff, KeyRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/auth/AuthLayout";
import { BrandPanel } from "../components/auth/BrandPanel";
import { Button } from "../components/ui/Button";
import { Checkbox } from "../components/ui/Checkbox";
import { Divider } from "../components/ui/Divider";
import { Input } from "../components/ui/Input";
import { ThemeToggle } from "../components/ui/ThemeToggle";
import { ToastInline } from "../components/ui/ToastInline";
import { cn } from "../lib/cn";
import { isValidEmail } from "../lib/validate";
import { getPasswordStrength } from "../lib/passwordStrength";
import { authApi } from "../services/authApi.ts";

interface SignupPageProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

type Status = { type: "success" | "error" | "info"; message: string } | null;
type SignupErrors = {
  firstName?: string;
  lastName?: string;
  workEmail?: string;
  password?: string;
  confirmPassword?: string;
  agreeTerms?: string;
};

function validateSignup(values: {
  firstName: string;
  lastName: string;
  workEmail: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}) {
  const errors: SignupErrors = {};

  if (!values.firstName.trim()) {
    errors.firstName = "First name is required.";
  }

  if (!values.lastName.trim()) {
    errors.lastName = "Last name is required.";
  }

  if (!values.workEmail.trim() || !isValidEmail(values.workEmail)) {
    errors.workEmail = "Please enter a valid work email.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!values.agreeTerms) {
    errors.agreeTerms = "You must agree to the terms and conditions.";
  }

  return errors;
}

export default function SignupPage({ theme, onToggleTheme }: SignupPageProps) {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [workEmail, setWorkEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [shakeKey, setShakeKey] = useState(0);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const hasErrors = useMemo(
    () =>
      Boolean(
        errors.firstName ||
          errors.lastName ||
          errors.workEmail ||
          errors.password ||
          errors.confirmPassword ||
          errors.agreeTerms
      ),
    [errors]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const validationErrors = validateSignup({
      firstName,
      lastName,
      workEmail,
      password,
      confirmPassword,
      agreeTerms,
    });

    setErrors(validationErrors);

    if (
      validationErrors.firstName ||
      validationErrors.lastName ||
      validationErrors.workEmail ||
      validationErrors.password ||
      validationErrors.confirmPassword ||
      validationErrors.agreeTerms
    ) {
      setShakeKey((prev) => prev + 1);
      setStatus({ type: "error", message: "Please fix the highlighted fields and try again." });
      return;
    }

    setSubmitting(true);

    try {
      const data = await authApi.register({
        firstName,
        lastName,
        workEmail,
        password,
        confirmPassword,
      });
      
      setStatus({ 
        type: "success", 
        message: "Your account has been created! An administrator will review your request and approve it soon." 
      });
      
      // Rediriger vers la page de login après 3 secondes
      setTimeout(() => {
        navigate("/login");
      }, 3000);
      
    } catch (error: any) {
      let errorMessage = "Registration failed. Please try again.";
      
      if (error.data?.email) {
        errorMessage = error.data.email[0] || "Email already exists.";
      } else if (error.data?.password) {
        errorMessage = error.data.password[0] || "Password is invalid.";
      } else if (error.data?.error) {
        errorMessage = error.data.error;
      }
      
      setStatus({ type: "error", message: errorMessage });
      setShakeKey((prev) => prev + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      left={
        <BrandPanel
          headline="Build Strategic Sourcing Intelligence"
          subtext="Request access to transform multisourcing into a data-driven competitive advantage."
        />
      }
      right={
        <section className="flex min-h-[52vh] items-center justify-center p-6 sm:p-8 lg:min-h-screen lg:p-10">
          <div className="absolute right-6 top-6 sm:right-8 sm:top-8">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            className="premium-card w-full max-w-[440px] rounded-2xl border border-border bg-surface p-5 shadow-premium sm:p-7"
          >
            <div className="mb-6 space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-text">Create your account</h2>
              <p className="text-sm text-muted">Request access to the platform</p>
            </div>

            <motion.form key={shakeKey} onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  id="first-name"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder="John"
                  label="First Name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  error={errors.firstName}
                />
                <Input
                  id="last-name"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Doe"
                  label="Last Name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  error={errors.lastName}
                />
              </div>

              <Input
                id="work-email"
                name="workEmail"
                type="email"
                autoComplete="email"
                placeholder="name@leoni.com"
                label="Work Email"
                value={workEmail}
                onChange={(event) => setWorkEmail(event.target.value)}
                error={errors.workEmail}
              />

              <div className="space-y-3">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Create a password"
                  label="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  error={errors.password}
                  rightAdornment={
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="rounded-md p-1 text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />

                <div className="space-y-2" aria-live="polite" aria-label="Password strength">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted">Password strength</span>
                    <span
                      className={cn(
                        "font-medium",
                        strength.label === "Strong" && "text-emerald-600 dark:text-emerald-400",
                        strength.label === "Medium" && "text-amber-600 dark:text-amber-400",
                        strength.label === "Weak" && "text-red-600 dark:text-red-400"
                      )}
                    >
                      {strength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
                    {[1, 2, 3].map((segment) => {
                      const active = strength.score >= segment;
                      return (
                        <motion.div
                          key={segment}
                          className={cn(
                            "h-1.5 rounded-full bg-border",
                            active && strength.label === "Strong" && "bg-emerald-500",
                            active && strength.label === "Medium" && "bg-amber-500",
                            active && strength.label === "Weak" && "bg-red-500"
                          )}
                          initial={false}
                          animate={{ opacity: active ? 1 : 0.45, scaleY: active ? 1 : 0.9 }}
                          transition={{ duration: 0.22 }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <Input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Confirm your password"
                label="Confirm Password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                error={errors.confirmPassword}
                rightAdornment={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="rounded-md p-1 text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <div className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <Checkbox
                    id="agree-terms"
                    label="I agree to the terms and conditions"
                    checked={agreeTerms}
                    onChange={setAgreeTerms}
                  />
                  <a
                    href="#"
                    className="animated-link text-xs text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  >
                    Terms
                  </a>
                </div>
                {errors.agreeTerms ? (
                  <p id="agree-terms-error" className="text-xs text-red-600 dark:text-red-400">
                    {errors.agreeTerms}
                  </p>
                ) : null}
              </div>

              <AnimatePresence>{status ? <ToastInline type={status.type} message={status.message} /> : null}</AnimatePresence>

              <div className="space-y-3 pt-1">
                <Button type="submit" loading={submitting} aria-disabled={submitting}>
                  Request Access
                </Button>

                <Divider label="OR" />

                <div className="group relative overflow-hidden rounded-xl">
                  <span
                    className="pointer-events-none absolute inset-0 -translate-x-[120%] bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-0 transition duration-500 group-hover:translate-x-[120%] group-hover:opacity-100 dark:via-white/20"
                    aria-hidden="true"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    leftIcon={<KeyRound className="h-4 w-4" aria-hidden="true" />}
                  >
                    Sign up with SSO
                  </Button>
                </div>
              </div>

              <p className="pt-1 text-center text-sm text-muted">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className={cn(
                    "animated-link font-medium text-primary",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  )}
                >
                  Sign In
                </Link>
              </p>

              <p className="sr-only" aria-live="polite">
                {hasErrors ? "Form has validation errors" : ""}
              </p>
            </motion.form>
          </motion.div>
        </section>
      }
    />
  );
}