interface DividerProps {
  label: string;
}

export function Divider({ label }: DividerProps) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-surface px-2 text-xs tracking-[0.2em] text-muted">{label}</span>
      </div>
    </div>
  );
}
