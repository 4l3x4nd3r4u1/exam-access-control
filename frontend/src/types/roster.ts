export interface ImportSummaryData {
  totalProcessed: number;
  successful: number;
  skipped: number;
  observations: string[];
  isSuccessful: boolean;
}

export interface ImportRosterResponse {
  success: boolean;
  message: string;
  data: ImportSummaryData;
}
