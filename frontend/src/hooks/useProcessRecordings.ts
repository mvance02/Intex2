import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api';
import type { ProcessRecording, PaginatedResponse } from '../types/models';

const PAGE_SIZE = 20;

export interface UseProcessRecordingsResult {
  recordings: ProcessRecording[];
  totalPages: number;
  page: number;
  setPage: (page: number) => void;
  loading: boolean;
  error: string | null;
  filterResidentId: string;
  setFilterResidentId: (value: string) => void;
  filterSocialWorker: string;
  setFilterSocialWorker: (value: string) => void;
  refresh: () => Promise<void>;
}

export function useProcessRecordings(): UseProcessRecordingsResult {
  const [recordings, setRecordings] = useState<ProcessRecording[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterResidentId, setFilterResidentId] = useState('');
  const [filterSocialWorker, setFilterSocialWorker] = useState('');

  const loadRecordings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        residentId: filterResidentId,
        socialWorker: filterSocialWorker,
      });
      const data = await apiFetch<PaginatedResponse<ProcessRecording>>(
        `/api/processrecordings?${params.toString()}`
      );
      setRecordings(data.items);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recordings');
    } finally {
      setLoading(false);
    }
  }, [page, filterResidentId, filterSocialWorker]);

  useEffect(() => {
    void loadRecordings();
  }, [loadRecordings]);

  return { recordings, totalPages, page, setPage, loading, error, filterResidentId, setFilterResidentId, filterSocialWorker, setFilterSocialWorker, refresh: loadRecordings };
}
