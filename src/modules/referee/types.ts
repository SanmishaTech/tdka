export interface Referee {
  id: number;
  userId: number;
  firstName?: string | null;
  middleName?: string | null;
  lastName?: string | null;
  address?: string | null;
  pincode?: string | null;
  contactNumber?: string | null;
  emailId?: string | null;
  dateOfBirth?: string | null;
  bloodGroup?: string | null;
  districtParishadPassYear?: number | null;
  stateRefreeExamPassYear?: number | null;
  allIndiaRefreeExamPassYear?: number | null;
  officeAddress?: string | null;
  officePincode?: string | null;
  officeContactNumber?: string | null;
  aadharNumber?: string | null;
  aadharImage?: string | null;
  aadharVerified?: boolean;
  user?: {
    id: number;
    email: string;
    active: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RefereeFormData {
  firstName: string;
  middleName?: string;
  lastName: string;
  address?: string;
  pincode?: string;
  contactNumber: string;
  emailId: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  districtParishadPassYear?: string;
  stateRefreeExamPassYear?: string;
  allIndiaRefreeExamPassYear?: string;
  officeAddress?: string;
  officePincode?: string;
  officeContactNumber?: string;
  aadharNumber?: string;
  aadharImage?: File;
  password?: string;
}

export interface RefereesResponse {
  referees: Referee[];
  totalReferees: number;
  totalPages: number;
  page: number;
}
