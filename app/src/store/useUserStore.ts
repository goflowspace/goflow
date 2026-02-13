import {User, UserState} from '@types-folder/user';
import {create} from 'zustand';

const useUserStore = create<UserState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({user, isAuthenticated: !!user}),
  logout: () => set({user: null, isAuthenticated: false})
}));

export default useUserStore;
