import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { SignInWithApple, SignInWithAppleResponse, SignInWithAppleOptions } from '@capacitor-community/apple-sign-in';

export interface UserProfile {
    id: string;
    name: string; // May be null for Apple
    email: string;
    picture?: string;
    idToken?: string;
}

const isNative = Capacitor.isNativePlatform();

export const AuthService = {
    // Initialize Google Auth (needed for Web mainly)
    init: () => {
        if (!isNative) {
            GoogleAuth.initialize();
        }
    },

    signInWithGoogle: async (): Promise<UserProfile> => {
        try {
            console.log("Signing in with Google...");
            const user = await GoogleAuth.signIn();
            console.log("Google Sign In Success:", user);

            return {
                id: user.id || user.authentication.idToken, // Fallback logic
                name: user.name || user.givenName || 'Google User',
                email: user.email,
                picture: user.imageUrl,
                idToken: user.authentication.idToken
            };
        } catch (error) {
            console.error("Google Sign In Error:", error);
            throw error;
        }
    },

    signInWithApple: async (): Promise<UserProfile> => {
        try {
            const options: SignInWithAppleOptions = {
                clientId: 'com.example.app.service', // Web Only
                redirectURI: 'https://your-redirect-uri.com/callback', // Web Only
                scopes: 'name email',
                state: '12345',
                nonce: 'nonce',
            };

            const result: SignInWithAppleResponse = await SignInWithApple.authorize(options);

            // Note: Apple only returns name on first sign-in.
            // You should save this to your backend database associated with the 'sub' (user ID).
            const name = result.response.givenName ? `${result.response.givenName} ${result.response.familyName}` : 'Apple User';

            return {
                id: result.response.user, // The obscure Apple User ID
                name: name,
                email: result.response.email || 'private@apple.id',
                idToken: result.response.identityToken
            };
        } catch (error) {
            console.error("Apple Sign In Error:", error);
            throw error;
        }
    },

    signOut: async () => {
        try {
            await GoogleAuth.signOut();
            // Apple doesn't have a true 'sign out' API in the same way, usually just clearing local state is enough.
        } catch (e) { console.error(e); }
    }
};
