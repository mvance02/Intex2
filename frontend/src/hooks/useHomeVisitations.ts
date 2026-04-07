import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import type { HomeVisitation, PaginatedResponse } from '../types/models';

const PAGE_SIZE = 20;

export interface UseHomeVisitationsResult {
  visitations: HomeVisitation[];
  totalPages: number;
  page: number;
  setPage: (page: number) => void;
  loading: boolean;
  error: string | null;
  filterResidentId: string;
  setFilterResidentId: (value: string) => void;
  filterVisitType: string;
  setFilterVisitType: (value: string) => void;
  refresh: () => Promise<void>;
}

export function useHomeVisitations(): UseHomeVisitationsResult {
  const [visitations, setVisitations] = useState<HomeVisitation[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterResidentId, setFilterResidentId] = useState('');
  const [filterVisitType, setFilterVisitType] = useState('');

  const loadVisitations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        residentId: filterResidentId,
        visitType: filterVisitType,
      });
      const data = await apiFetch<PaginatedResponse<HomeVisitation>>(
        `/api/homevisitations?${params.toString()}`
      );
      setVisitations(data.items);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load visitations');
    } finally {
      setLoading(false);
    }
  }, [page, filterResidentId, filterVisitType]);

  useEffect(() => {
    void loadVisitations();
  }, [loadVisitations]);

  return { visitations, totalPages, page, setPage, loading, error, filterResidentId, setFilterResidentId, filterVisitType, setFilterVisitType, refresh: loadVisitations };
}
