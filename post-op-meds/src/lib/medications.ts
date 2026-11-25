import type { MedId } from './types';

export interface MedicationDef {
  id: MedId;
  name: string;
  brand: string;
  ingredients: string;
  role: string;
  dosage: string;
  kind: 'scheduled' | 'prn';
  /** Tailwind accent for the card stripe. */
  accent: string;
  /** Strongly prompt "with food" confirmation at intake. */
  requiresFood: boolean;
  cautions: string[];
}

export const MEDICATIONS: Record<MedId, MedicationDef> = {
  arcoxia: {
    id: 'arcoxia',
    name: 'ארקוקסיה 90 מ״ג',
    brand: 'Etoricoxib / Arcoxia',
    ingredients: 'אטוריקוקסיב 90 מ״ג',
    role: 'נוגד דלקת חזק',
    dosage: 'טבליה אחת, פעם ביום (כל 24 שעות), רצוי בבוקר עם אוכל',
    kind: 'scheduled',
    accent: 'bg-blue-600',
    requiresFood: true,
    cautions: [
      'אסור לשלב עם נורופן / איבופרופן / נוגדי דלקת אחרים',
      'ליטול עם אוכל או מים להגנה על הקיבה',
    ],
  },
  rokacet: {
    id: 'rokacet',
    name: 'רוקסט פלוס',
    brand: 'Rokacet Plus',
    ingredients: 'פרצטמול 500 מ״ג · קודאין 15 מ״ג · קפאין 50 מ״ג',
    role: 'משכך כאבים – לפי הצורך בכאב חזק',
    dosage: 'עד טבליה אחת, עד 4 פעמים ביום, מרווח של 4–6 שעות לפחות',
    kind: 'prn',
    accent: 'bg-violet-600',
    requiresFood: false,
    cautions: [
      'עלול לטשטש – להימנע מנהיגה',
      'לא יותר מ-4 טבליות ב-24 שעות',
      'מכיל פרצטמול – לא לשלב עם אקמול/דקסמול או תכשירי פרצטמול נוספים',
    ],
  },
  moxypen: {
    id: 'moxypen',
    name: 'מוקסיפן',
    brand: 'Moxypen (Amoxicillin)',
    ingredients: 'אמוקסיצילין',
    role: 'אנטיביוטיקה – להשלים את כל הטיפול',
    dosage: '3 פעמים ביום, בהפרש של כ-6 שעות בשעות הערות',
    kind: 'scheduled',
    accent: 'bg-teal-600',
    requiresFood: false,
    cautions: [
      'לא להכפיל מנה שהוחמצה',
      'להשלים את כל הטיפול גם אם ההרגשה משתפרת',
    ],
  },
};

export const MED_ORDER: MedId[] = ['arcoxia', 'rokacet', 'moxypen'];

/** Clinical parameters used by the rules engine. */
export const RULES = {
  arcoxia: { intervalH: 24, maxPer24h: 1 },
  rokacet: { recommendedIntervalH: 6, maxPer24h: 4, minIntervalRange: [4, 6] as const },
  moxypen: { intervalH: 6, minIntervalH: 4, maxPerDay: 3, overdueGraceH: 2 },
} as const;

export const NSAID_BLOCK_MESSAGE = 'אסור לשלב נורופן עם ארקוקסיה – סכנה לפגיעה בקיבה ולצרבת קשה';

/** NSAIDs that duplicate Arcoxia and are blocked from entry. */
export const BLOCKED_NSAIDS = [
  'נורופן (Nurofen)',
  'איבופרופן (Ibuprofen)',
  'אדוויל (Advil)',
  'וולטרן / דיקלופנק (Voltaren)',
  'נפרוקסן / נקסין (Naproxen)',
  'אספירין במינון משכך כאבים',
];
