import { useCallback, useEffect, useState } from 'react';
import { getProcessedRosterDetail, getProcessedRosters } from '../services/processedRostersService';
import type { ProcessedRosterDetail, ProcessedRostersResponse } from '../types/processedRoster';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export const useProcessedRosters = (apiBaseUrl: string, token: string) => {
  const [state, setState] = useState<AsyncState<ProcessedRostersResponse>>({
    data: null,
    error: null,
    loading: true,
  });

  const retry = useCallback(() => {
    const controller = new AbortController();

    setState((current) => ({ ...current, error: null, loading: true }));

    getProcessedRosters(apiBaseUrl, token, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return controller;
  }, [apiBaseUrl, token]);

  useEffect(() => {
    const controller = new AbortController();

    getProcessedRosters(apiBaseUrl, token, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return () => controller.abort();
  }, [apiBaseUrl, token]);

  return { ...state, retry };
};

export const useProcessedRosterDetail = (
  apiBaseUrl: string,
  token: string,
  courseGroupId: string,
) => {
  const [state, setState] = useState<AsyncState<ProcessedRosterDetail>>({
    data: null,
    error: null,
    loading: true,
  });

  const retry = useCallback(() => {
    const controller = new AbortController();

    setState((current) => ({ ...current, error: null, loading: true }));

    getProcessedRosterDetail(apiBaseUrl, token, courseGroupId, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return controller;
  }, [apiBaseUrl, token, courseGroupId]);

  useEffect(() => {
    const controller = new AbortController();

    getProcessedRosterDetail(apiBaseUrl, token, courseGroupId, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return () => controller.abort();
  }, [apiBaseUrl, token, courseGroupId]);

  return { ...state, retry };
};
