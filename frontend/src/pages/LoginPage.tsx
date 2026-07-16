// LoginPage.tsx

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, KeyRound } from "lucide-react";
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
import { validateLogin } from "../lib/validate";
import { authApi } from "../services/authApi";
import { setSession, AuthRole } from "../lib/authSession";  // ← Importer AuthRole

interface LoginPageProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

type Status = { type: "success" | "error" | "info"; message: string } | null;

export default function LoginPage({ theme, onToggleTheme }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const hasErrors = useMemo(() => Boolean(errors.email || errors.password), [errors]);

  // Charger l'email sauvegardé
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('remembered_email');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRemember(true);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const validationErrors = validateLogin({ email, password });
    setErrors(validationErrors);

    if (validationErrors.email || validationErrors.password) {
      setShakeKey((prev) => prev + 1);
      setStatus({ type: "error", message: "Please fix the highlighted fields and try again." });
      return;
    }

    setSubmitting(true);

    try {
      const result = await authApi.login({ email, password });
      
      console.log('Login result:', result);
      
      if (!result.success) {
        throw result.error;
      }
      
      const data = result.data;
      
      if (data && data.user) {
        // Convertir le rôle de Django vers le format attendu par authSession
        let sessionRole: AuthRole;  // ← Utiliser le type AuthRole
        if (data.user.role === 'ADMIN') {
          sessionRole = 'admin';
        } else if (data.user.role === 'ROLE_1') {
          sessionRole = 'role1';
        } else if (data.user.role === 'ROLE_2') {
          sessionRole = 'role2';
        } else {
          sessionRole = 'role3';
        }
        
        // Créer la session React
        setSession({
          role: sessionRole,
          email: data.user.email,
        });
        
        setStatus({ type: "success", message: "Sign in successful. Redirecting..." });
        
        // Sauvegarder l'email si "Remember me" est coché
        if (remember) {
          localStorage.setItem('remembered_email', email);
        } else {
          localStorage.removeItem('remembered_email');
        }
        
        // Redirection en fonction du rôle
        setTimeout(() => {
          if (data.user.role === 'ADMIN') {
            navigate("/admin/dashboard");
          } else {
            const role = data.user.role;
            if (role === 'ROLE_1') {
              navigate("/app/m1");
            } else if (role === 'ROLE_2') {
              navigate("/app/m2");
            } else {
              navigate("/app/m3/dashboard");
            }
          }
        }, 1500);
      } else {
        throw new Error("Invalid response from server");
      }
      
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = "Invalid email or password.";
      
      if (error?.error) {
        errorMessage = error.error;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setStatus({ type: "error", message: errorMessage });
      setShakeKey((prev) => prev + 1);
    } finally {
      setSubmitting(false);
    }
  }

  const handleRememberChange = (checked: boolean) => {
    setRemember(checked);
  };

  return (
    <AuthLayout
      left={<BrandPanel />}
      right={
        <section className="flex min-h-[52vh] items-center justify-center p-6 sm:p-8 lg:min-h-screen lg:p-10">
          <div className="absolute right-6 top-6 sm:right-8 sm:top-8">
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
            className="premium-card w-full max-w-[420px] rounded-2xl border border-border bg-surface p-5 shadow-premium sm:p-7"
          >
            <div className="mb-6 space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight text-text">Welcome back</h2>
              <p className="text-sm text-muted">Sign in to your account</p>
            </div>

            <motion.form key={shakeKey} onSubmit={handleSubmit} className="space-y-4">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@leoni.com"
                label="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={errors.email}
              />

              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
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

              <div className="flex items-center justify-between gap-2">
                <Checkbox 
                  id="remember-me" 
                  label="Remember me" 
                  checked={remember} 
                  onChange={handleRememberChange} 
                />
                <a
                  href="#"
                  className="animated-link text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  Forgot password?
                </a>
              </div>

              <AnimatePresence>{status ? <ToastInline type={status.type} message={status.message} /> : null}</AnimatePresence>

              <div className="space-y-3 pt-1">
                <Button type="submit" loading={submitting} aria-disabled={submitting}>
                  Sign In
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
                    Sign in with SSO
                  </Button>
                </div>
              </div>

              <p className="pt-1 text-center text-sm text-muted">
                Don&apos;t have an account?{" "}
                <Link
                  to="/signup"
                  className={cn(
                    "animated-link font-medium text-primary",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                  )}
                >
                  Create account
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