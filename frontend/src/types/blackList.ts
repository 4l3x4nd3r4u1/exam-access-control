
export interface BlackListStudent {
  user_id: number;
  nombre: string;
  codigo_sis: number;
  ci: string | null;
  total_inhabilitaciones: number;
}

export interface BlackListResponse {
  success: boolean;
  data: BlackListStudent[];
  message: string;
}

export interface BlackListAntecedent {
  materia: string | null;
  nombre_materia: string | null;
  grupo: string | null;
  gestion: string | null;
  docente: string | null;
  motivo: string | null;
  fecha: string;
}

export interface BlackListDetail {
  user_id: number;
  nombre: string;
  codigo_sis: number;
  ci: string | null;
  total_inhabilitaciones: number;
  antecedentes: BlackListAntecedent[];
}

export interface BlackListDetailResponse {
  success: boolean;
  data: BlackListDetail;
  message: string;
}
