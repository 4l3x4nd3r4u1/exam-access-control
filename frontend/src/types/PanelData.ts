export interface PanelData {
  user: {
    fullName: string;
    role: string;
  };

  summary: {
    gestion: string;
    estudiantes: number;
    planillasProcesadas: number;
    usuarios: number;
  };
}