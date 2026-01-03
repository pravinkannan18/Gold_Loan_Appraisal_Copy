// Types for facial recognition system
export interface AppraiserProfile {
  id: string;
  appraiser_id?: string; // Add this for compatibility with backend
  name: string;
  licenseNumber: string;
  department: string;
  email: string;
  phone: string;
  profileImage: string;
  faceEncoding?: string;
  lastActive: string;
  appraisalsCompleted: number;
  certification: string;
}

export interface FacialRecognitionResult {
  success: boolean;
  confidence?: number;
  appraiser?: AppraiserProfile;
  message: string;
}

export interface AppraiserIdentificationData {
  id: string;
  name: string;
  licenseNumber: string;
  department: string;
  email: string;
  phone: string;
  identificationMethod: 'facial_recognition' | 'manual_entry';
  identificationTimestamp: string;
  profileImage: string;
  confidence?: number;
}