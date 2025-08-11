export interface Taluka {
  id: number;
  number: number;
  abbreviation: string;
  talukaName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TalukaFormData {
  number: number;
  abbreviation: string;
  talukaName: string;
}

export interface TalukasResponse {
  talukas: Taluka[];
  totalTalukas: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}
