export type BlackListSort = 'recent' | 'count';

export interface BlackListStudent {
  user_id: number;
  nombre: string;
  codigo_sis: number;
  ci: string | null;
  total_inhabilitaciones: number;
  total_expulsiones?: number;
  ultima_fecha?: string | null;
  gestiones?: string[];
}

export interface BlackListResponse {
  success: boolean;
  data: BlackListStudent[];
  meta?: {
    available_gestiones?: string[];
  };
  message: string;
}

export interface BlackListAntecedent {
  materia: string | null;
  nombre_materia: string | null;
  tipo_examen?: string | null;
  grupo: string | null;
  gestion: string | null;
  docente: string | null;
  registrado_por?: string | null;
  aula?: string | null;
  motivo: string | null;
  fecha: string;
  origen?: 'GESTION_HABILITACIONES' | 'PUNTOS_CONTROL';
}

export interface BlackListDetail {
  user_id: number;
  nombre: string;
  codigo_sis: number;
  ci: string | null;
  total_inhabilitaciones: number;
  total_expulsiones?: number;
  antecedentes: BlackListAntecedent[];
}

export interface BlackListDetailResponse {
  success: boolean;
  data: BlackListDetail;
  message: string;
}
