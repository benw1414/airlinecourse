export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4"
      >
        <path d="M2 16l20-8-8 20-2.5-7.5L2 16z" />
      </svg>
    </span>
  );
}
