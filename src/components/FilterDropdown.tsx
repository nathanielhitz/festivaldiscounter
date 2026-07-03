import Link from "next/link";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  groupName: string;
  label: string;
  options: FilterOption[];
  selectedValue: string | undefined;
  selectedLabel: string;
  buildHref: (value: string | undefined) => string;
}

export default function FilterDropdown({
  groupName,
  label,
  options,
  selectedValue,
  selectedLabel,
  buildHref,
}: FilterDropdownProps) {
  const allOptions: FilterOption[] = [{ value: "", label: "Alle" }, ...options];

  return (
    <details
      name={groupName}
      className="group rounded-xl border border-line bg-panel"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="text-xs font-bold uppercase tracking-wider text-mut">{label}</span>
        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
          {selectedLabel}
          <svg
            aria-hidden
            viewBox="0 0 12 8"
            className="h-2.5 w-3 fill-none stroke-current stroke-2 transition-transform group-open:rotate-180"
          >
            <path d="M1 1.5L6 6.5L11 1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <ul className="border-t border-line">
        {allOptions.map((opt) => {
          const value = opt.value || undefined;
          const isSelected = value === selectedValue;
          return (
            <li key={opt.value === "" ? "__alle__" : opt.value}>
              <Link
                href={buildHref(value)}
                aria-current={isSelected ? "true" : undefined}
                className="flex items-center justify-between px-4 py-3 text-sm text-ink hover:bg-ground/40"
              >
                {opt.label}
                {isSelected && <span aria-hidden>✓</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
