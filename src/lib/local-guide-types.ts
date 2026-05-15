export type LocalGuideSection = "restaurants" | "stores" | "emergency";

export type LocalGuideRow = {
  section: LocalGuideSection;
  id: number;
  business: string;
  category: string;
  address: string;
  phone: string;
  status: string;
  notes: string;
  key: string;
  distanceMi: number;
};
