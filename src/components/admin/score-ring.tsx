export function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);

  return (
    <div className="relative size-[72px]">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle
          cx="36"
          cy="36"
          r={r}
          stroke="var(--line)"
          strokeWidth="4"
          fill="none"
        />
        <circle
          cx="36"
          cy="36"
          r={r}
          stroke="var(--brand)"
          strokeWidth="4"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-mono text-[16px] font-semibold">
        {score}
      </div>
    </div>
  );
}
