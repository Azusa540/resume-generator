export interface GeneratedEducation {
  education_id: string;
  degree: string;
  university: string;
  period: string;
}

export interface GeneratedExperienceBullet {
  experience_id: string;
  company: string;
  job_title: string;
  period: string;
  bullets: string[];
}

export type SkillCategories = Record<string, string[]>;

export interface GeneratedResume {
  resume_file_name: string;
  target_job_title: string;
  professional_summary: string;
  skills: SkillCategories;
  education: GeneratedEducation[];
  experience_bullets: GeneratedExperienceBullet[];
}

// What we store in localStorage for the review page
export interface ResumeReviewData {
  generated: GeneratedResume;
  profileId: string;
  company: string;
  profile: {
    fullName: string;
    email: string;
    phone?: string;
    address?: string;
    linkedin?: string;
  };
  jobLink?: string;
  pdfTemplate?: 'template1' | 'template2' | 'template3';
}
