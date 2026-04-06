import { useEffect, useRef, useState } from 'react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  searchPlaceholder?: string;
  onSearch: (value: string) => void;
  filters?: FilterGroup[];
  onFilterChange?: (key: string, value: string) => void;
  filterValues?: Record<string, string>;
}

export default function FilterBar({
  searchPlaceholder = 'Search…',
  onSearch,
  filters = [],
  onFilterChange,
  filterValues = {},
}: FilterBarProps) {
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(search), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, onSearch]);

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label={searchPlaceholder}
        />
      </div>

      {/* Dropdown filters */}
      {filters.map((filter) => (
        <div key={filter.key}>
          <label htmlFor={`filter-${filter.key}`} className="sr-only">
            {filter.label}
          </label>
          <select
            id={`filter-${filter.key}`}
            value={filterValues[filter.key] ?? ''}
            onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          >
            <option value="">{filter.label}: All</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
