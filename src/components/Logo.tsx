import { useId } from "react";

export default function Logo({ size = 26 }: { size?: number }) {
  const gradientId = useId();
  return (
    <span className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2E8F82" />
            <stop offset="100%" stopColor="#60DBCC" />
          </linearGradient>
        </defs>
        <path
          fill={`url(#${gradientId})`}
          d="M9.663 12.988L12.675 16l-6.338 6.337 3.326 3.326L16 19.325l3.012 3.012-6.337 6.338L16 32l6.337-6.337 3.326-3.326L32 16l-3.325-3.325-6.338 6.337L19.325 16l6.338-6.337-3.326-3.326L16 12.675l-3.012-3.012 6.337-6.338L16 0 9.663 6.337 6.337 9.663 0 16l3.325 3.325z"
        />
      </svg>
      <b className="display text-lg tracking-wide">Festivaldiscounter</b>
    </span>
  );
}
