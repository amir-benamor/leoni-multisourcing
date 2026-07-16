export type PasswordStrength = {
  score: 0 | 1 | 2 | 3;
  label: "Weak" | "Medium" | "Strong";
  percent: number;
};

export function getPasswordStrength(password: string): PasswordStrength {
  const value = password.trim();

  if (!value) {
    return { score: 0, label: "Weak", percent: 0 };
  }

  let points = 0;

  if (value.length >= 8) points += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) points += 1;
  if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) points += 1;

  const score = Math.min(3, points) as 0 | 1 | 2 | 3;

  if (score <= 1) {
    return { score, label: "Weak", percent: Math.max(20, score * 33) };
  }

  if (score === 2) {
    return { score, label: "Medium", percent: 66 };
  }

  return { score, label: "Strong", percent: 100 };
}
