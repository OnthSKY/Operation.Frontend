export type BranchTourismSeasonPeriod = {
  id: number;
  branchId: number;
  seasonYear: number;
  openedOn: string;
  closedOn: string | null;
  notes: string | null;
  createdAt: string;
};

export type SaveBranchTourismSeasonPeriodInput = {
  seasonYear: number;
  openedOn: string;
  closedOn?: string | null;
  notes?: string | null;
};

export type BranchTourismSeasonYearGatePersonnelItem = {
  personnelId: number;
  fullName: string;
};

export type BranchTourismSeasonYearGateResponse = {
  newSeasonYear: number;
  priorCalendarYear: number;
  blockers: BranchTourismSeasonYearGatePersonnelItem[];
};
