export type Lang = 'en' | 'am' | 'wal';

export interface ContentBlock {
  section: string;
  headline: string;
  body: string;
  visible: boolean;
}

export type Division = 'GARMENT' | 'SPICE';
export type TrainingDept = 'FASHION' | 'CULINARY' | 'BEAUTY';
export type GalleryCategory = 'GARMENTS' | 'SPICES' | 'TRAINING' | 'EVENTS';
export type OrderType = 'WHOLESALE' | 'EXPORT' | 'CUSTOM_DESIGN' | 'BESPOKE' | 'CULTURAL' | 'PRODUCTION' | 'MODEL_BOOKING' | 'MODEL_CASTING' | 'SHOW_SEAT';

export interface Product { id: string; name: string; division: Division; description: string; packSizes: string; markets: string; imageUrl?: string | null }
export interface Course { id: string; name: string; department: TrainingDept; duration: string; fee: string | number; description: string }
export interface NewsPost { id: string; title: string; kind: string; body: string; date: string; imageUrl?: string | null }
export interface GalleryItem { id: string; title: string; category: GalleryCategory; imageUrl?: string | null; tall: boolean }

export interface Contact {
  phone: string; trainingPhone?: string; email: string; telegram: string; address: string; hours: string;
  instagram?: string; tiktok?: string; facebook?: string; youtube?: string; mapUrl?: string;
}

export interface SiteData {
  content: Record<string, ContentBlock>;
  products: Product[];
  courses: Course[];
  news: NewsPost[];
  gallery: GalleryItem[];
  contact: Contact | null;
  openingDate: string | null;
  /** True when the API was unreachable and sample content is shown. */
  offline?: boolean;
}
