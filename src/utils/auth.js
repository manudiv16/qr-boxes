// auth.js - Authentication utilities for API calls

export async function getToken() {
    try {
        // Check if Clerk is available
        if (typeof window !== 'undefined' && window.Clerk) {
            const session = window.Clerk.session;
            if (session) {
                return await session.getToken();
            }
        }
        return null;
    } catch (error) {
        console.error('Error getting token:', error);
        return null;
    }
}

export async function getUser() {
    try {
        if (typeof window !== 'undefined' && window.Clerk) {
            return window.Clerk.user;
        }
        return null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

export function isSignedIn() {
    try {
        if (typeof window !== 'undefined' && window.Clerk) {
            return !!window.Clerk.user;
        }
        return false;
    } catch (error) {
        console.error('Error checking sign in status:', error);
        return false;
    }
}
