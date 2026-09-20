import { useCallback, useEffect, useState } from 'react';
import { getTeacherSubject, getTeacherSubjects } from '../services/teacherSubjectsService';
import type { TeacherSubject, TeacherSubjectsOverview } from '../types/teacherSubject';

interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export const useTeacherSubjects = (apiBaseUrl: string, token: string, teacherId: number) => {
  const [state, setState] = useState<AsyncState<TeacherSubjectsOverview>>({
    data: null,
    error: null,
    loading: true,
  });

  const retry = useCallback(() => {
    const controller = new AbortController();

    setState((current) => ({ ...current, error: null, loading: true }));

    getTeacherSubjects(apiBaseUrl, token, teacherId, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return controller;
  }, [apiBaseUrl, token, teacherId]);

  useEffect(() => {
    const controller = new AbortController();

    getTeacherSubjects(apiBaseUrl, token, teacherId, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return () => controller.abort();
  }, [apiBaseUrl, token, teacherId]);

  return { ...state, retry };
};

export const useTeacherSubject = (
  apiBaseUrl: string,
  token: string,
  teacherId: number,
  courseGroupId: string,
) => {
  const [state, setState] = useState<AsyncState<TeacherSubject>>({
    data: null,
    error: null,
    loading: true,
  });

  const retry = useCallback(() => {
    const controller = new AbortController();

    setState((current) => ({ ...current, error: null, loading: true }));

    getTeacherSubject(apiBaseUrl, token, teacherId, courseGroupId, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return controller;
  }, [apiBaseUrl, token, teacherId, courseGroupId]);

  useEffect(() => {
    const controller = new AbortController();

    getTeacherSubject(apiBaseUrl, token, teacherId, courseGroupId, controller.signal)
      .then((data) => setState({ data, error: null, loading: false }))
      .catch((error: Error) => {
        if (controller.signal.aborted) return;
        setState({ data: null, error: error.message, loading: false });
      });

    return () => controller.abort();
  }, [apiBaseUrl, token, teacherId, courseGroupId]);

  return { ...state, retry };
};
