import { create } from 'zustand';
import Cookies from 'js-cookie';

interface User {
    id: number;
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
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || 'https://resume-ai-back.onrender.com/api';

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
                body: JSON.stringify({ email, password, rememberMe }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            const { token, user } = data;

            const cookieOptions = rememberMe ? { expires: 30 } : { expires: 1 }; // 30 days or 1 day
            Cookies.set('token', token, cookieOptions);

            set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    register: async (email, password, fullName) => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, fullName }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            const { token, user } = data;
            Cookies.set('token', token, { expires: 1 });

            set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
            set({ error: error.message, isLoading: false });
            throw error;
        }
    },

    logout: () => {
        Cookies.remove('token');
        set({ user: null, isAuthenticated: false, error: null });
    },

    checkAuth: async () => {
        set({ isLoading: true });
        const token = Cookies.get('token');

        if (!token) {
            set({ isLoading: false, isAuthenticated: false, user: null });
            return;
        }

        try {
            const response = await fetch(`${API_URL}/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Invalid token');
            }

            const user = await response.json();
            set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
            Cookies.remove('token');
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    }
}));
