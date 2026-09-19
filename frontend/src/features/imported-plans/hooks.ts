import { useCallback, useEffect, useState } from 'react';
import { getImportedPlanDetail, getImportedPlans } from './services';
import type { ImportedPlanDetail, ImportedPlansResponse } from './types';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export const useImportedPlans = (apiBaseUrl: string, token: string) => {
  const [state, setState] = useState<AsyncState<ImportedPlansResponse>>({
    data: null,
    error: null,
    loading: true,
  });

  const retry = useCallback(() => {
    const controller = new AbortController();

    setState((current) => ({ ...current, error: null, loading: true }));

    getImportedPlans(apiBaseUrl, token, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return controller;
  }, [apiBaseUrl, token]);

  useEffect(() => {
    const controller = new AbortController();

    getImportedPlans(apiBaseUrl, token, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return () => controller.abort();
  }, [apiBaseUrl, token]);

  return { ...state, retry };
};

export const useImportedPlanDetail = (
  apiBaseUrl: string,
  token: string,
  courseGroupId: string,
) => {
  const [state, setState] = useState<AsyncState<ImportedPlanDetail>>({
    data: null,
    error: null,
    loading: true,
  });

  const retry = useCallback(() => {
    const controller = new AbortController();

    setState((current) => ({ ...current, error: null, loading: true }));

    getImportedPlanDetail(apiBaseUrl, token, courseGroupId, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return controller;
  }, [apiBaseUrl, token, courseGroupId]);

  useEffect(() => {
    const controller = new AbortController();

    getImportedPlanDetail(apiBaseUrl, token, courseGroupId, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return () => controller.abort();
  }, [apiBaseUrl, token, courseGroupId]);

  return { ...state, retry };
};
