import { useAuthStore } from './auth.store';
import type { User } from '../models/user';

const user: User = { id: 1, email: 'a@b.c', name: 'Ana', avatarUrl: null, role: 'USER' };

describe('useAuthStore', () => {
  beforeEach(() => useAuthStore.getState().clear());

  it('arranca sin sesion', () => {
    const s = useAuthStore.getState();
    expect(s.accessToken).toBeNull();
    expect(s.user).toBeNull();
    expect(s.isLoggedIn()).toBe(false);
  });

  it('setSession guarda token y user; clear los borra', () => {
    useAuthStore.getState().setSession(user, 'tok');
    expect(useAuthStore.getState().isLoggedIn()).toBe(true);
    expect(useAuthStore.getState().user?.name).toBe('Ana');

    useAuthStore.getState().clear();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it('nunca toca localStorage', () => {
    useAuthStore.getState().setSession(user, 'tok');
    expect(localStorage.length).toBe(0);
  });
});
