import { useCallback, useEffect, useState } from 'react';
import { getTeacherSubjectDetail, getTeacherSubjects } from './services';
import type { TeacherSubjectDetail, TeacherSubjectsOverview } from './types';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export const useTeacherSubjects = (apiBaseUrl: string, token: string) => {
  const [state, setState] = useState<AsyncState<TeacherSubjectsOverview>>({
    data: null,
    error: null,
    loading: true,
  });

  const retry = useCallback(() => {
    const controller = new AbortController();

    setState((current) => ({ ...current, error: null, loading: true }));

    getTeacherSubjects(apiBaseUrl, token, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return controller;
  }, [apiBaseUrl, token]);

  useEffect(() => {
    const controller = new AbortController();

    getTeacherSubjects(apiBaseUrl, token, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return () => controller.abort();
  }, [apiBaseUrl, token]);

  return { ...state, retry };
};

export const useTeacherSubjectDetail = (
  apiBaseUrl: string,
  token: string,
  courseGroupId: string,
) => {
  const [state, setState] = useState<AsyncState<TeacherSubjectDetail>>({
    data: null,
    error: null,
    loading: true,
  });

  const retry = useCallback(() => {
    const controller = new AbortController();

    setState((current) => ({ ...current, error: null, loading: true }));

    getTeacherSubjectDetail(apiBaseUrl, token, courseGroupId, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return controller;
  }, [apiBaseUrl, token, courseGroupId]);

  useEffect(() => {
    const controller = new AbortController();

    getTeacherSubjectDetail(apiBaseUrl, token, courseGroupId, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return () => controller.abort();
  }, [apiBaseUrl, token, courseGroupId]);

  return { ...state, retry };
};
