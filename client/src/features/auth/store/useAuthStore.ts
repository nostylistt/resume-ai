import { create } from 'zustand';
import { API_URL } from '../../../shared/lib/api';

interface User {
    id: string;
    email: string;
    full_name: string;
    created_at: string;
}

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;

    login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
    register: (email: string, password: string, fullName: string) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const getErrorMessage = (error: unknown, fallback: string) => {
    return error instanceof Error ? error.message : fallback;
};

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,

    login: async (email, password, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password, rememberMe }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            const { user } = data;

            set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
            set({ error: getErrorMessage(error, 'Login failed'), isLoading: false });
            throw error;
        }
    },

    register: async (email, password, fullName) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password, fullName }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            const { user } = data;

            set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
            set({ error: getErrorMessage(error, 'Registration failed'), isLoading: false });
            throw error;
        }
    },

    logout: async () => {
        try {
            await fetch(`${API_URL}/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch {
            // Best effort: clear local auth state even if the network request fails.
        } finally {
            set({ user: null, isAuthenticated: false, error: null, isLoading: false });
        }
    },

    checkAuth: async () => {
        set({ isLoading: true });

        try {
            const response = await fetch(`${API_URL}/me`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Invalid token');
            }

            const user = await response.json();
            set({ user, isAuthenticated: true, isLoading: false });
        } catch {
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    }
}));
