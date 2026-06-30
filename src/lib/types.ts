export type AuthRole = "staff" | "editor";

export interface ProviderWebsites {
  practice?: string;
  psychology_today?: string;
  alma?: string;
  headway?: string;
}

export interface Provider {
  id: number;
  name: string;
  type: string;
  insurance: string[];
  session_format: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  websites: ProviderWebsites;
  specialties: string[];
  modalities: string[];
  low_cost: boolean;
  licensed_states: string[];
  description: string;
  accepting_clients: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffComment {
  id: number;
  provider_id: number;
  author_name: string;
  body: string;
  created_at: string;
}

export interface ProviderWithComments extends Provider {
  comments: StaffComment[];
}

export const PROVIDER_TYPES = [
  "Psychiatrist / Medication",
  "Psychologist",
  "Therapist",
  "Social Work",
  "Group Practice",
] as const;

export const SESSION_FORMATS = ["In-Person", "Virtual", "Both", "Unknown"] as const;

export const INSURANCE_OPTIONS = [
  "1199",
  "Aetna",
  "Blue Cross Blue Shield",
  "Cigna",
  "Emblem",
  "GHI",
  "Healthfirst",
  "HIP",
  "Homestead",
  "Humana",
  "MagnaCare",
  "Medicaid",
  "Medicare",
  "Out of Network",
  "Oxford",
  "TriCare",
  "United HealthCare",
  "Sliding Scale",
] as const;

export const SPECIALTY_OPTIONS = [
  "ADHD",
  "Autism/Asperger's",
  "Bilingual",
  "CBT",
  "DBT",
  "Eating Disorders",
  "Grief/Bereavement",
  "LGBTQ+",
  "Substance Abuse",
  "Trauma",
  "Veterans",
] as const;
