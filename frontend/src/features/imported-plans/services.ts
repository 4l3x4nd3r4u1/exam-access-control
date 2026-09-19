import type { ImportedPlanDetail, ImportedPlansResponse } from './types';

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const readApiResponse = async <T>(response: Response): Promise<T> => {
  const json = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !json.success || !json.data) {
    throw new Error(json.message || 'No se pudo completar la solicitud.');
  }

  return json.data;
};

const authHeaders = (token: string) => ({
  Accept: 'application/json',
  Authorization: `Bearer ${token}`,
});

export const getImportedPlans = async (
  apiBaseUrl: string,
  token: string,
  signal?: AbortSignal,
): Promise<ImportedPlansResponse> => {
  const response = await fetch(`${apiBaseUrl}/imported-plans`, {
    headers: authHeaders(token),
    signal,
  });

  return readApiResponse<ImportedPlansResponse>(response);
};

export const getImportedPlanDetail = async (
  apiBaseUrl: string,
  token: string,
  courseGroupId: string,
  signal?: AbortSignal,
): Promise<ImportedPlanDetail> => {
  const response = await fetch(`${apiBaseUrl}/imported-plans/${encodeURIComponent(courseGroupId)}`, {
    headers: authHeaders(token),
    signal,
  });

  return readApiResponse<ImportedPlanDetail>(response);
};
