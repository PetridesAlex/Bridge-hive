import { create } from 'zustand';

import { mockAvailability, mockDocuments } from '@/data/mock';
import type { DayPart, MemberAvailability, ProfessionalDocument } from '@/types';

export const SUGGESTED_NURSE_SKILLS = [
  'IV therapy',
  'Medication administration',
  'Wound care',
  'Patient assessment',
  'ECG monitoring',
  'Ventilator care',
  'Triage',
  'Cannulation',
  'Catheter care',
  'Palliative care',
  'Paediatric nursing',
  'Surgical recovery',
] as const;

type ProfileState = {
  documents: ProfessionalDocument[];
  availability: MemberAvailability;
  skills: string[];
  setAvailableForShifts: (value: boolean) => void;
  toggleDayPart: (day: string, part: DayPart) => void;
  setMaxTravelDistance: (km: number) => void;
  togglePreferredLocation: (city: string) => void;
  togglePreferredDepartment: (dept: string) => void;
  togglePreferredShiftType: (type: 'day' | 'night') => void;
  addSkill: (skill: string) => void;
  removeSkill: (skill: string) => void;
};

export const useProfileStore = create<ProfileState>((set) => ({
  documents: mockDocuments,
  availability: mockAvailability,
  skills: ['IV therapy', 'Medication administration', 'Patient assessment', 'Triage'],

  setAvailableForShifts: (value) =>
    set((state) => ({
      availability: { ...state.availability, availableForShifts: value },
    })),

  toggleDayPart: (day, part) =>
    set((state) => ({
      availability: {
        ...state.availability,
        weekly: state.availability.weekly.map((d) =>
          d.day === day ? { ...d, [part]: !d[part] } : d,
        ),
      },
    })),

  setMaxTravelDistance: (km) =>
    set((state) => ({
      availability: { ...state.availability, maxTravelDistanceKm: km },
    })),

  togglePreferredLocation: (city) =>
    set((state) => {
      const list = state.availability.preferredLocations;
      const next = list.includes(city) ? list.filter((c) => c !== city) : [...list, city];
      return { availability: { ...state.availability, preferredLocations: next } };
    }),

  togglePreferredDepartment: (dept) =>
    set((state) => {
      const list = state.availability.preferredDepartments;
      const next = list.includes(dept) ? list.filter((d) => d !== dept) : [...list, dept];
      return { availability: { ...state.availability, preferredDepartments: next } };
    }),

  togglePreferredShiftType: (type) =>
    set((state) => {
      const list = state.availability.preferredShiftTypes;
      const next = list.includes(type) ? list.filter((t) => t !== type) : [...list, type];
      return { availability: { ...state.availability, preferredShiftTypes: next } };
    }),

  addSkill: (skill) =>
    set((state) => {
      const trimmed = skill.trim();
      if (!trimmed) return state;
      const exists = state.skills.some((s) => s.toLowerCase() === trimmed.toLowerCase());
      if (exists) return state;
      return { skills: [...state.skills, trimmed] };
    }),

  removeSkill: (skill) =>
    set((state) => ({
      skills: state.skills.filter((s) => s !== skill),
    })),
}));
