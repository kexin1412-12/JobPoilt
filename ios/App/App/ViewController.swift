import UIKit
import WebKit
import FirebaseAuth
import GoogleSignIn
import AuthenticationServices

class ViewController: UIViewController, WKScriptMessageHandler {
    
    private var webView: WKWebView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupWebView()
        loadWebContent()
    }
    
    private func setupWebView() {
        let configuration = WKWebViewConfiguration()
        
        // 添加 JavaScript 消息处理器
        let contentController = WKUserContentController()
        contentController.add(self, name: "auth")
        configuration.userContentController = contentController
        
        // 允许内联媒体播放
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        
        webView = WKWebView(frame: view.bounds, configuration: configuration)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        
        view.addSubview(webView)
    }
    
    private func loadWebContent() {
        // 开发环境：加载本地服务器
        // 生产环境：加载打包的 dist 文件
        
        #if DEBUG
        // 开发模式：连接到 Vite 开发服务器
        if let url = URL(string: "http://localhost:5173") {
            let request = URLRequest(url: url)
            webView.load(request)
        }
        #else
        // 生产模式：加载本地打包的文件
        if let indexPath = Bundle.main.path(forResource: "index", ofType: "html", inDirectory: "dist"),
           let indexUrl = URL(fileURLWithPath: indexPath).deletingLastPathComponent() as URL? {
            let request = URLRequest(url: URL(fileURLWithPath: indexPath))
            webView.loadFileURL(URL(fileURLWithPath: indexPath), allowingReadAccessTo: indexUrl)
        }
        #endif
    }
    
    // MARK: - WKScriptMessageHandler
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "auth",
              let body = message.body as? [String: Any],
              let action = body["action"] as? String else {
            return
        }
        
        switch action {
        case "signInWithGoogle":
            signInWithGoogle()
        case "signInWithApple":
            signInWithApple()
        case "signOut":
            signOut()
        default:
            break
        }
    }
    
    // MARK: - Google Sign In
    
    private func signInWithGoogle() {
        guard let clientID = FirebaseApp.app()?.options.clientID else { return }
        
        let config = GIDConfiguration(clientID: clientID)
        GIDSignIn.sharedInstance.configuration = config
        
        GIDSignIn.sharedInstance.signIn(withPresenting: self) { [weak self] result, error in
            guard let self = self else { return }
            
            if let error = error {
                self.sendAuthResult(success: false, error: error.localizedDescription)
                return
            }
            
            guard let user = result?.user,
                  let idToken = user.idToken?.tokenString else {
                self.sendAuthResult(success: false, error: "Failed to get ID token")
                return
            }
            
            let credential = GoogleAuthProvider.credential(withIDToken: idToken,
                                                          accessToken: user.accessToken.tokenString)
            
            Auth.auth().signIn(with: credential) { authResult, error in
                if let error = error {
                    self.sendAuthResult(success: false, error: error.localizedDescription)
                    return
                }
                
                guard let firebaseUser = authResult?.user else {
                    self.sendAuthResult(success: false, error: "Failed to get user")
                    return
                }
                
                firebaseUser.getIDToken { idToken, error in
                    if let error = error {
                        self.sendAuthResult(success: false, error: error.localizedDescription)
                        return
                    }
                    
                    let userData: [String: Any] = [
                        "uid": firebaseUser.uid,
                        "displayName": firebaseUser.displayName ?? "",
                        "email": firebaseUser.email ?? "",
                        "photoURL": firebaseUser.photoURL?.absoluteString ?? ""
                    ]
                    
                    self.sendAuthResult(success: true, user: userData, idToken: idToken)
                }
            }
        }
    }
    
    // MARK: - Apple Sign In
    
    private func signInWithApple() {
        let nonce = randomNonceString()
        let appleIDProvider = ASAuthorizationAppleIDProvider()
        let request = appleIDProvider.createRequest()
        request.requestedScopes = [.fullName, .email]
        request.nonce = sha256(nonce)
        
        let authorizationController = ASAuthorizationController(authorizationRequests: [request])
        authorizationController.delegate = self
        authorizationController.presentationContextProvider = self
        authorizationController.performRequests()
        
        // 保存 nonce 用于验证
        currentNonce = nonce
    }
    
    private var currentNonce: String?
    
    // MARK: - Sign Out
    
    private func signOut() {
        do {
            try Auth.auth().signOut()
            GIDSignIn.sharedInstance.signOut()
            sendAuthResult(success: true, message: "Signed out successfully")
        } catch {
            sendAuthResult(success: false, error: error.localizedDescription)
        }
    }
    
    // MARK: - Helper Methods
    
    private func sendAuthResult(success: Bool, user: [String: Any]? = nil, idToken: String? = nil, error: String? = nil, message: String? = nil) {
        var result: [String: Any] = ["success": success]
        
        if let user = user {
            result["user"] = user
        }
        if let idToken = idToken {
            result["idToken"] = idToken
        }
        if let error = error {
            result["error"] = error
        }
        if let message = message {
            result["message"] = message
        }
        
        if let jsonData = try? JSONSerialization.data(withJSONObject: result),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            let script = "window.handleAuthResult(\(jsonString));"
            webView.evaluateJavaScript(script)
        }
    }
    
    private func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remainingLength = length
        
        while remainingLength > 0 {
            let randoms: [UInt8] = (0..<16).map { _ in
                var random: UInt8 = 0
                let errorCode = SecRandomCopyBytes(kSecRandomDefault, 1, &random)
                if errorCode != errSecSuccess {
                    fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)")
                }
                return random
            }
            
            randoms.forEach { random in
                if remainingLength == 0 {
                    return
                }
                
                if random < charset.count {
                    result.append(charset[Int(random)])
                    remainingLength -= 1
                }
            }
        }
        
        return result
    }
    
    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        let hashString = hashedData.compactMap {
            String(format: "%02x", $0)
        }.joined()
        
        return hashString
    }
}

// MARK: - ASAuthorizationControllerDelegate

extension ViewController: ASAuthorizationControllerDelegate {
    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        if let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential {
            guard let nonce = currentNonce else {
                sendAuthResult(success: false, error: "Invalid state: A login callback was received, but no login request was sent.")
                return
            }
            guard let appleIDToken = appleIDCredential.identityToken else {
                sendAuthResult(success: false, error: "Unable to fetch identity token")
                return
            }
            guard let idTokenString = String(data: appleIDToken, encoding: .utf8) else {
                sendAuthResult(success: false, error: "Unable to serialize token string from data")
                return
            }
            
            let credential = OAuthProvider.credential(withProviderID: "apple.com",
                                                     idToken: idTokenString,
                                                     rawNonce: nonce)
            
            Auth.auth().signIn(with: credential) { authResult, error in
                if let error = error {
                    self.sendAuthResult(success: false, error: error.localizedDescription)
                    return
                }
                
                guard let firebaseUser = authResult?.user else {
                    self.sendAuthResult(success: false, error: "Failed to get user")
                    return
                }
                
                firebaseUser.getIDToken { idToken, error in
                    if let error = error {
                        self.sendAuthResult(success: false, error: error.localizedDescription)
                        return
                    }
                    
                    let userData: [String: Any] = [
                        "uid": firebaseUser.uid,
                        "displayName": firebaseUser.displayName ?? "",
                        "email": firebaseUser.email ?? "",
                        "photoURL": firebaseUser.photoURL?.absoluteString ?? ""
                    ]
                    
                    self.sendAuthResult(success: true, user: userData, idToken: idToken)
                }
            }
        }
    }
    
    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        sendAuthResult(success: false, error: error.localizedDescription)
    }
}

// MARK: - ASAuthorizationControllerPresentationContextProviding

extension ViewController: ASAuthorizationControllerPresentationContextProviding {
    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.view.window!
    }
}

import CryptoKit

extension SHA256 {
    static func hash(data: Data) -> SHA256Digest {
        return SHA256.hash(data: data)
    }
}
