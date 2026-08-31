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
  skills: SkillCategories | string[];
  education: GeneratedEducation[];
  experience_bullets: GeneratedExperienceBullet[];
  /** Admin prompt only: the 5-6 JD must-have technologies it identified, for coverage verification. */
  primary_stack?: string[];
  /** Admin prompt only: how closely the candidate's real background overlaps the JD's domain. */
  domain_overlap?: 'same' | 'adjacent' | 'distant';
}

export type PdfTemplateId =
  | 'template1'
  | 'template2'
  | 'template3'
  | 'template4'
  | 'template5'
  | 'template6'
  | 'template7'
  | 'template8'
  | 'template9'
  | 'template10';

// What we store in localStorage for the review page
export interface ResumeReviewData {
  generated: GeneratedResume;
  profileId: string;
  title: string;
  company: string;
  profile: {
    fullName: string;
    email: string;
    phone?: string;
    address?: string;
    linkedin?: string;
  };
  jobLink?: string;
  pdfTemplate?: PdfTemplateId;
}
