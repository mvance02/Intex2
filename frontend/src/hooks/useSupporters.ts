import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import type { Supporter, PaginatedResponse } from '../types/models';

const PAGE_SIZE = 20;

export interface UseSupportersResult {
  supporters: Supporter[];
  totalPages: number;
  loading: boolean;
  error: string | null;
  page: number;
  setPage: (page: number) => void;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  filters: Record<string, string>;
  setFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  refresh: () => Promise<void>;
}

export function useSupporters(): UseSupportersResult {
  const [supporters, setSupporters] = useState<Supporter[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const fetchSupporters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        search,
        status: filters['status'] ?? '',
        supporterType: filters['supporterType'] ?? '',
      });
      const data = await apiFetch<PaginatedResponse<Supporter>>(`/api/supporters?${params}`);
      setSupporters(data.items);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load supporters.');
    } finally {
      setLoading(false);
    }
  }, [page, search, filters]);

  useEffect(() => {
    void fetchSupporters();
  }, [fetchSupporters]);

  return { supporters, totalPages, loading, error, page, setPage, search, setSearch, filters, setFilters, refresh: fetchSupporters };
}
