# Firebase + WebView iOS App 设置指南

## 📋 概述
项目已从 Capacitor 迁移到原生 iOS WebView + Firebase 认证方案。

## 🚀 Mac 上的设置步骤

### 1. 安装 Node.js 依赖
```bash
cd ~/Documents/JobPoilt
rm -rf node_modules package-lock.json
npm install
```

### 2. Firebase 配置

#### 2.1 创建 Firebase 项目
1. 访问 [Firebase Console](https://console.firebase.google.com/)
2. 创建新项目或选择现有项目
3. 添加 iOS 应用（Bundle ID: `com.internship.pursuit`）
4. 下载 `GoogleService-Info.plist`

#### 2.2 配置 Firebase Auth
在 [firebaseAuthService.ts](services/firebaseAuthService.ts) 中更新配置：

```typescript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

#### 2.3 启用认证方式
在 Firebase Console → Authentication → Sign-in method 中启用：
- Google
- Apple

### 3. iOS 项目设置

```bash
cd ios

# 安装 CocoaPods（如果未安装）
sudo gem install cocoapods

# 安装依赖
pod install

# ⚠️ 从现在开始，使用 .xcworkspace 文件，而不是 .xcodeproj
open App.xcworkspace
```

### 4. 在 Xcode 中配置

#### 4.1 添加 GoogleService-Info.plist
1. 将下载的 `GoogleService-Info.plist` 拖到 Xcode 项目中的 `App` 组
2. 确保选中 "Copy items if needed" 和 "Add to targets: App"

#### 4.2 配置 URL Schemes
1. 选择项目 → `App` target → Info 标签
2. 添加 URL Scheme：
   - 从 `GoogleService-Info.plist` 复制 `REVERSED_CLIENT_ID`
   - 添加为 URL Scheme（格式类似：`com.googleusercontent.apps.123456789`）

#### 4.3 配置 Sign in with Apple
1. 选择 `App` target → Signing & Capabilities
2. 点击 "+ Capability"
3. 添加 "Sign in with Apple"

#### 4.4 删除旧的 Capacitor 文件
在 Xcode 中删除：
- `CapApp-SPM` 文件夹
- 任何对 Capacitor 的引用

### 5. 构建和测试

#### 开发模式（连接到 Vite dev server）
```bash
# 终端 1：启动 web 开发服务器
npm run dev

# 终端 2 / Xcode：运行 iOS app（在模拟器或真机）
# App 会连接到 http://localhost:5173
```

#### 生产模式
```bash
# 1. 构建 web 资源
npm run build

# 2. 将 dist 文件夹复制到 iOS 项目
cp -r dist ios/App/dist

# 3. 在 Xcode 中添加 dist 文件夹
# - 拖动 dist 文件夹到 Xcode 项目
# - 选择 "Create folder references"
# - 添加到 App target

# 4. Archive 并上架
```

## 📱 工作原理

### Web → Native 通信
JavaScript 通过 WebKit Message Handler 调用原生代码：

```javascript
// 在 web 中调用
window.webkit.messageHandlers.auth.postMessage({
    action: 'signInWithGoogle'
});
```

### Native → Web 通信
原生代码通过 evaluateJavaScript 返回结果：

```swift
// iOS 中返回结果
webView.evaluateJavaScript("window.handleAuthResult({success: true, ...})")
```

### 认证流程
1. 用户在 Web UI 点击登录按钮
2. Web 调用 `AuthService.signInWithGoogle()`
3. 如果在 iOS WebView 中，通过 bridge 调用原生代码
4. iOS 原生代码使用 Firebase SDK 处理认证
5. 认证结果通过 JavaScript bridge 返回给 Web
6. Web 更新 UI 状态

## 🔧 文件变更总结

### 新增文件
- [services/firebaseAuthService.ts](services/firebaseAuthService.ts) - Firebase 认证服务
- [ios/App/App/ViewController.swift](ios/App/App/ViewController.swift) - WebView 控制器
- [ios/Podfile](ios/Podfile) - CocoaPods 依赖

### 修改文件
- [package.json](package.json) - 移除 Capacitor，添加 Firebase
- [App.tsx](App.tsx) - 使用新的 firebaseAuthService
- [ios/App/App/AppDelegate.swift](ios/App/App/AppDelegate.swift) - Firebase 初始化

### 删除文件（待删除）
- `capacitor.config.ts` - 不再需要
- `services/authService.ts` - 已被 firebaseAuthService.ts 替代
- `ios/App/CapApp-SPM/*` - Capacitor SPM 包

## ⚠️ 注意事项

1. **开发环境**: `ViewController.swift` 中的 DEBUG 模式会连接到 `http://localhost:5173`，确保 Vite 服务器在运行

2. **生产构建**: 需要将 `dist` 文件夹打包到 iOS app 中

3. **URL Scheme**: Google 登录需要正确配置 URL Scheme 才能工作

4. **Apple 登录**: 需要在 Apple Developer 账号中启用 "Sign in with Apple" 功能

5. **Firebase 配额**: 免费计划有认证请求限制

## 🐛 故障排查

### "Module 'Firebase' not found"
```bash
cd ios
pod install
# 确保打开 App.xcworkspace 而不是 App.xcodeproj
```

### Google 登录后无法返回 app
检查 URL Scheme 配置是否正确

### WebView 无法加载内容
开发模式：确保 Vite 服务器在运行（`npm run dev`）
生产模式：确保 `dist` 文件夹已添加到 Xcode 项目

### 认证不工作
1. 检查 `GoogleService-Info.plist` 是否正确添加
2. 检查 Firebase Console 中是否启用了认证方式
3. 检查 [firebaseAuthService.ts](services/firebaseAuthService.ts) 配置是否正确

## 📚 下一步

1. 完成 Firebase 配置
2. 测试 Google 和 Apple 登录
3. 构建生产版本
4. 上架 App Store
