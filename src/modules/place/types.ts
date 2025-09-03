export interface Region {
  id: number;
  number: number;
  abbreviation: string;
  regionName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Place {
  id: number;
  number: number;
  abbreviation: string;
  placeName: string;
  regionId: number;
  region: Region;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceFormData {
  number: number;
  abbreviation: string;
  placeName: string;
  regionId: number;
}

export interface PlacesResponse {
  places: Place[];
  totalPlaces: number;
  totalPages: number;
  page: number;
  limit?: number;
}

// Keep this for backward compatibility with taluka references
export type Taluka = Place;
export type TalukaFormData = PlaceFormData;
export type TalukasResponse = PlacesResponse;
