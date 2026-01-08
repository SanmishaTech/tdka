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
  zillaParishadPassYear?: number | null;
  statePanchayatPassYear?: number | null;
  allIndiaPanchayatPassYear?: number | null;
  officeAddress?: string | null;
  officePincode?: string | null;
  officeContactNumber?: string | null;
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
  zillaParishadPassYear?: string;
  statePanchayatPassYear?: string;
  allIndiaPanchayatPassYear?: string;
  officeAddress?: string;
  officePincode?: string;
  officeContactNumber?: string;
  password?: string;
}

export interface RefereesResponse {
  referees: Referee[];
  totalReferees: number;
  totalPages: number;
  page: number;
}
