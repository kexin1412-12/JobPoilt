
export enum ApplicationStatus {
  PLANNING = 'Planning',
  APPLIED = 'Applied',
  INTERVIEWING = 'Interviewing',
  OFFER = 'Offer',
  REJECTED = 'Rejected'
}

export type JobCategory = 'All' | 'Tech' | 'Product' | 'Design' | 'Ops' | 'Data' | 'Other';

export interface Interview {
  id: string;
  round: string; // e.g., "一面：技术面"
  date: string;
  time?: string; 
  interviewerInfo?: string; 
  meetingLink?: string; 
  notes: string; 
  reflections: string; 
  experienceRating: number; 
  isCompleted: boolean; 
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export interface JobApplication {
  id: string;
  companyName: string;
  positionTitle: string;
  category: JobCategory;
  location?: string; 
  channel?: string; 
  jdLink?: string;
  jdText?: string;
  status: ApplicationStatus;
  appliedDate: string;
  interviews: Interview[];
  currentStageIndex: number; 
  aiSuggestions?: {
    summary: string;
    responsibilities: string[];
    requirements: string[];
    suitabilityAssessment: string;
    interviewTips: string[];
    potentialQuestions: string[];
    sources?: { title: string; uri: string }[];
  };
  myReflections: string;
}

export interface AppState {
  applications: JobApplication[];
  activeAppId: string | null;
  user: User | null;
}
