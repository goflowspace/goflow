export interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  liveblocksAccessToken?: string;
}

export interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}
