export type AuthUser = {
  id: number;
  username: string;
  fullName: string;
  role: string;
  personnelId: number | null;
};

export type LoginResponseData = {
  token: string;
  user: AuthUser;
};
