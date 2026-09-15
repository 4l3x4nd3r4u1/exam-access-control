import type { PanelData } from '../types/PanelData';

const API_URL = 'http://localhost:8000/api';

export async function getPanelData(): Promise<PanelData> {
  const response = await fetch(`${API_URL}/panel`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || 'No se pudieron obtener los datos del panel'
    );
  }

  return data;
}