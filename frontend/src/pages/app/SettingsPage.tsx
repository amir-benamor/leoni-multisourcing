import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Lock, Palette, Shield, User, Sun, Moon, Monitor } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { ToastInline } from "../../components/ui/ToastInline";
import { THEME_STORAGE_KEY } from "../../lib/constants";
import { cn } from "../../lib/cn";
import { authApi } from "../../services/authApi";

type ThemeChoice = "light" | "dark" | "system";

type ProfileState = {
  fullName: string;
  department: string;
  site: string;
  email: string;
  role: string;
};

type PageSettings = {
  theme: ThemeChoice;
  rememberLastScope: boolean;
};

const DEFAULT_PROFILE: ProfileState = {
  fullName: "",
  department: "",
  site: "",
  email: "",
  role: "",
};

const DEFAULT_SETTINGS: PageSettings = {
  theme: "system",
  rememberLastScope: false,
};

function applyTheme(choice: ThemeChoice) {
  if (choice === "system") {
    localStorage.removeItem(THEME_STORAGE_KEY);
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", systemDark);
    return;
  }
  localStorage.setItem(THEME_STORAGE_KEY, choice);
  document.documentElement.classList.toggle("dark", choice === "dark");
}

function SegmentedTheme({ value, onChange }: { value: ThemeChoice; onChange: (value: ThemeChoice) => void }) {
  const options: Array<{ value: ThemeChoice; label: string; icon: JSX.Element }> = [
    { value: "light", label: "Light", icon: <Sun className="h-3.5 w-3.5" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-3.5 w-3.5" /> },
    { value: "system", label: "System", icon: <Monitor className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="inline-flex rounded-xl border border-border bg-bg/60 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition",
            value === option.value ? "bg-primary/12 text-primary" : "text-muted hover:text-text"
          )}
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function SectionCard({ icon, title, description, children }: { icon: JSX.Element; title: string; description: string; children: JSX.Element }) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-bg/70 text-muted">{icon}</span>
        <div><h2 className="text-sm font-semibold text-text">{title}</h2><p className="mt-0.5 text-xs text-muted">{description}</p></div>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function getInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "NA";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileState>(DEFAULT_PROFILE);
  const [settings, setSettings] = useState<PageSettings>(DEFAULT_SETTINGS);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const profileInitials = useMemo(() => getInitials(profile.fullName), [profile.fullName]);

  // Charger le profil depuis l'API
  useEffect(() => {
    (async () => {
      try {
        const result = await authApi.getProfile?.();
        if (result?.user) {
          setProfile({
            fullName: `${result.user.first_name || ""} ${result.user.last_name || ""}`.trim(),
            department: result.user.department || "",
            site: result.user.site || "",
            email: result.user.email || "",
            role: result.user.role || "",
          });
        }
        if (result?.preferences) {
          setSettings({
            theme: result.preferences.theme || "system",
            rememberLastScope: result.preferences.remember_last_scope || false,
          });
        }
      } catch {
        // Fallback localStorage
        const saved = localStorage.getItem("asap_profile_v1");
        if (saved) setProfile(JSON.parse(saved));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await authApi.updateProfile?.({
        fullName: profile.fullName,
        department: profile.department,
        site: profile.site,
      });
      setToast({ type: "success", message: "Profile saved" });
    } catch {
      setToast({ type: "error", message: "Failed to save profile" });
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async () => {
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setToast({ type: "error", message: "Fill all password fields." });
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setToast({ type: "error", message: "Confirm password does not match." });
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword?.({
        current_password: passwordForm.current,
        new_password: passwordForm.next,
        confirm_password: passwordForm.confirm,
      });
      setPasswordForm({ current: "", next: "", confirm: "" });
      setToast({ type: "success", message: "Password updated" });
    } catch {
      setToast({ type: "error", message: "Failed to update password" });
    } finally {
      setSaving(false);
    }
  };

  const onThemeChange = async (value: ThemeChoice) => {
    const next = { ...settings, theme: value };
    setSettings(next);
    applyTheme(value);
    try {
      await authApi.updatePreferences?.({ theme: value });
    } catch {}
    setToast({ type: "info", message: `Theme set to ${value}.` });
  };

  const onRememberScopeChange = async (checked: boolean) => {
    const next = { ...settings, rememberLastScope: checked };
    setSettings(next);
    try {
      await authApi.updatePreferences?.({ remember_last_scope: checked });
    } catch {}
    setToast({ type: "info", message: "Preference saved." });
  };

  const onReset = () => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    setProfile(DEFAULT_PROFILE);
    setSettings(DEFAULT_SETTINGS);
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", systemDark);
    setToast({ type: "success", message: "Settings reset." });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-premium">
        <h1 className="text-2xl font-semibold text-text">Settings</h1>
        <p className="mt-1 text-sm text-muted">Personal account settings and lightweight preferences.</p>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <SectionCard icon={<User className="h-4 w-4" />} title="Profile" description="Manage personal identity and account details.">
            <div>
              <div className="mb-4 flex items-center gap-3 rounded-xl border bg-bg/40 p-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border bg-primary/10 text-sm font-semibold text-primary">{profileInitials}</span>
                <div><p className="text-sm font-medium">{profile.fullName || "User"}</p><p className="text-xs text-muted">{profile.email}</p></div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1 text-sm"><span className="text-xs text-muted">Full name</span>
                  <input type="text" value={profile.fullName} onChange={e => setProfile(p => ({ ...p, fullName: e.target.value }))} className="h-10 w-full rounded-xl border bg-bg px-3 text-sm" />
                </label>
                <label className="space-y-1 text-sm"><span className="text-xs text-muted">Department</span>
                  <input type="text" value={profile.department} onChange={e => setProfile(p => ({ ...p, department: e.target.value }))} className="h-10 w-full rounded-xl border bg-bg px-3 text-sm" />
                </label>
                <label className="space-y-1 text-sm"><span className="text-xs text-muted">Site</span>
                  <input type="text" value={profile.site} onChange={e => setProfile(p => ({ ...p, site: e.target.value }))} className="h-10 w-full rounded-xl border bg-bg px-3 text-sm" />
                </label>
                <label className="space-y-1 text-sm"><span className="text-xs text-muted">Email</span>
                  <input type="email" readOnly value={profile.email} className="h-10 w-full rounded-xl border bg-bg/60 px-3 text-sm" />
                </label>
                <label className="space-y-1 text-sm md:col-span-2"><span className="text-xs text-muted">Role</span>
                  <input type="text" readOnly value={profile.role} className="h-10 w-full rounded-xl border bg-bg/60 px-3 text-sm" />
                </label>
              </div>
              <div className="mt-3 flex justify-end">
                <Button onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "Save profile"}</Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={<Shield className="h-4 w-4" />} title="Security" description="Update account password.">
            <div>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1 text-sm"><span className="text-xs text-muted">Current password</span>
                  <input type="password" value={passwordForm.current} onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))} className="h-10 w-full rounded-xl border bg-bg px-3 text-sm" />
                </label>
                <label className="space-y-1 text-sm"><span className="text-xs text-muted">New password</span>
                  <input type="password" value={passwordForm.next} onChange={e => setPasswordForm(p => ({ ...p, next: e.target.value }))} className="h-10 w-full rounded-xl border bg-bg px-3 text-sm" />
                </label>
                <label className="space-y-1 text-sm"><span className="text-xs text-muted">Confirm password</span>
                  <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))} className="h-10 w-full rounded-xl border bg-bg px-3 text-sm" />
                </label>
              </div>
              {capsLockOn && <div className="mt-2 inline-flex items-center gap-1 rounded-lg border border-amber-500/35 bg-amber-500/10 px-2 py-1 text-xs text-amber-700"><Lock className="h-3.5 w-3.5" />Caps Lock is ON</div>}
              <div className="mt-3 flex justify-end">
                <Button onClick={updatePassword} disabled={saving}>{saving ? "Updating..." : "Update password"}</Button>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard icon={<Palette className="h-4 w-4" />} title="Preferences" description="Personal display options.">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted mb-2">Theme</p>
                <SegmentedTheme value={settings.theme} onChange={onThemeChange} />
              </div>
              <label className="flex items-center justify-between gap-3 rounded-xl border bg-bg/40 px-3 py-2 text-sm">
                <div><span className="text-text">Remember last scope</span><p className="text-[11px] text-muted">Reopens the app with your last filters.</p></div>
                <button onClick={() => onRememberScopeChange(!settings.rememberLastScope)} className={cn("inline-flex h-6 w-11 items-center rounded-full border p-0.5 transition", settings.rememberLastScope ? "bg-primary/20" : "bg-bg")}>
                  <span className={cn("h-4 w-4 rounded-full transition", settings.rememberLastScope ? "translate-x-5 bg-primary" : "translate-x-0 bg-muted")} />
                </button>
              </label>
              <div className="flex justify-end"><Button variant="secondary" onClick={onReset}>Reset preferences</Button></div>
            </div>
          </SectionCard>

          <SectionCard icon={<Lock className="h-4 w-4" />} title="About" description="Application metadata.">
            <div>
              <dl className="divide-y divide-border rounded-xl border bg-bg/40">
                <div className="grid grid-cols-2 gap-2 px-3 py-2 text-sm"><dt className="text-muted">Version</dt><dd className="text-right">v0.1</dd></div>
                <div className="grid grid-cols-2 gap-2 px-3 py-2 text-sm"><dt className="text-muted">Environment</dt><dd className="text-right">Production</dd></div>
                <div className="grid grid-cols-2 gap-2 px-3 py-2 text-sm"><dt className="text-muted">Build info</dt><dd className="text-right">{new Date().toLocaleDateString("en-US")}</dd></div>
              </dl>
            </div>
          </SectionCard>
        </div>
      </div>

      {toast && <div className="fixed bottom-4 right-4 z-40 w-full max-w-sm"><ToastInline type={toast.type} message={toast.message} /></div>}
    </motion.div>
  );
}