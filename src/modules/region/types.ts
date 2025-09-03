export interface Region {
  id: number;
  number: number;
  abbreviation: string;
  regionName: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegionFormData {
  number: number;
  abbreviation: string;
  regionName: string;
}

export interface RegionsResponse {
  regions: Region[];
  totalRegions: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}
