import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    OAuthProvider,
    signOut as firebaseSignOut,
    User 
} from 'firebase/auth';

// Firebase 配置 - 需要从 Firebase Console 获取
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export interface UserProfile {
    id: string;
    name: string;
    email: string;
    picture?: string;
    idToken?: string;
}

// 检查是否在 iOS WebView 中
const isIOSWebView = () => {
    return (window as any).webkit?.messageHandlers?.auth !== undefined;
};

export const AuthService = {
    init: () => {
        console.log('Firebase Auth initialized');
    },

    signInWithGoogle: async (): Promise<UserProfile> => {
        try {
            // 如果在 iOS WebView 中，通过原生调用
            if (isIOSWebView()) {
                return new Promise((resolve, reject) => {
                    // 发送消息到 iOS
                    (window as any).webkit.messageHandlers.auth.postMessage({
                        action: 'signInWithGoogle'
                    });

                    // 监听 iOS 返回的结果
                    (window as any).handleAuthResult = (result: any) => {
                        if (result.success) {
                            resolve({
                                id: result.user.uid,
                                name: result.user.displayName || 'Google User',
                                email: result.user.email,
                                picture: result.user.photoURL,
                                idToken: result.idToken
                            });
                        } else {
                            reject(new Error(result.error));
                        }
                    };
                });
            }

            // Web 环境使用 Firebase popup
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const idToken = await result.user.getIdToken();

            return {
                id: result.user.uid,
                name: result.user.displayName || 'Google User',
                email: result.user.email || '',
                picture: result.user.photoURL || undefined,
                idToken
            };
        } catch (error) {
            console.error("Google Sign In Error:", error);
            throw error;
        }
    },

    signInWithApple: async (): Promise<UserProfile> => {
        try {
            // 如果在 iOS WebView 中，通过原生调用
            if (isIOSWebView()) {
                return new Promise((resolve, reject) => {
                    (window as any).webkit.messageHandlers.auth.postMessage({
                        action: 'signInWithApple'
                    });

                    (window as any).handleAuthResult = (result: any) => {
                        if (result.success) {
                            resolve({
                                id: result.user.uid,
                                name: result.user.displayName || 'Apple User',
                                email: result.user.email,
                                idToken: result.idToken
                            });
                        } else {
                            reject(new Error(result.error));
                        }
                    };
                });
            }

            // Web 环境使用 Firebase popup
            const provider = new OAuthProvider('apple.com');
            provider.addScope('email');
            provider.addScope('name');
            
            const result = await signInWithPopup(auth, provider);
            const idToken = await result.user.getIdToken();

            return {
                id: result.user.uid,
                name: result.user.displayName || 'Apple User',
                email: result.user.email || 'private@apple.id',
                idToken
            };
        } catch (error) {
            console.error("Apple Sign In Error:", error);
            throw error;
        }
    },

    signOut: async () => {
        try {
            if (isIOSWebView()) {
                (window as any).webkit.messageHandlers.auth.postMessage({
                    action: 'signOut'
                });
            }
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Sign Out Error:", error);
        }
    },

    getCurrentUser: (): User | null => {
        return auth.currentUser;
    }
};
