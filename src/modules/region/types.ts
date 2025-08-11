export interface Taluka {
  id: number;
  number: number;
  abbreviation: string;
  talukaName: string;
}

export interface Region {
  id: number;
  number: number;
  abbreviation: string;
  regionName: string;
  talukaId: number;
  taluka: Taluka;
  createdAt: string;
  updatedAt: string;
}

export interface RegionFormData {
  number: number;
  abbreviation: string;
  regionName: string;
  talukaId: number;
}

export interface RegionsResponse {
  regions: Region[];
  totalRegions: number;
  totalPages: number;
  page: number;
  limit?: number;
}
