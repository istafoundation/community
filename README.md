# ISTA Community Native App

A modern, feature-rich React Native news application built with Expo. Stay updated with the latest headlines, tailored Indian news, and specific topics of interest, all wrapped in a beautiful, responsive interface.

## 📱 Features

- **Curated News Feed**: Browse top headlines, Indian market news, and various specific topics.
- **topic-based Filtering**: Quickly switch between different news categories using interactive chips.
- **In-App Reading**: Seamlessly read full articles within the app using an optimized WebView experience.
- **Dark & Light Mode**: Fully supported theming that adapts to your system preferences or manual toggle.
- **Smooth Animations**: Enhanced user experience with fluid transitions and loading states.
- **Native Performance**: Built with React Native and Expo for a smooth, native feel on iOS and Android.

## 🛠️ Tech Stack

- **Framework**: [Expo](https://expo.dev/) (React Native)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **UI/Styling**: React Native StyleSheet, [Expo Vector Icons](https://icons.expo.fyi/)
- **Web View**: `react-native-webview`
- **Animations**: `react-native-reanimated`
- **State Management**: React Context & Hooks

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (LTS recommended)
- [Expo Go](https://expo.dev/go) app on your mobile device (or an Emulator/Simulator)

### Installation

1. **Clone the repository** (if applicable)

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Configure environment variables**

   Create a `.env` file in the `native` directory:

   ```env
   # News API Configuration
   EXPO_PUBLIC_API_URL=https://your-api-domain.vercel.app
   EXPO_PUBLIC_API_KEY=your-secret-api-key
   ```

   > ⚠️ The `EXPO_PUBLIC_API_KEY` must match the `API_SECRET_KEY` configured on the backend API.

4. **Start the development server**

   ```bash
   npx expo start
   ```

5. **Run the app**
   - **Mobile**: Scan the QR code shown in the terminal with the **Expo Go** app (Android) or Camera app (iOS).
   - **Emulator**: Press `a` for Android Emulator or `i` for iOS Simulator.
   - **Web**: Press `w` to run in the web browser.

## 🏗️ Building for Production

### Android Release APK

1. Navigate to the native folder:

   ```bash
   cd native
   ```

2. Build the release APK:

   ```bash
   cd android
   .\gradlew.bat assembleRelease   # Windows
   ./gradlew assembleRelease       # Linux/Mac
   ```

3. The APK will be generated at:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

> 💡 Environment variables with the `EXPO_PUBLIC_` prefix are embedded into the JavaScript bundle at build time, so they work correctly in release builds.

## 📂 Project Structure

```
├── app/                  # Expo Router pages and layouts
│   ├── (tabs)/           # Tab navigation screens
│   ├── article.tsx       # Article reading screen
│   └── _layout.tsx       # Root layout configuration
├── components/           # Reusable UI components
├── contexts/             # Global state providers (Theme, Categories)
├── hooks/                # Custom React hooks (useNews, useColorScheme)
├── assets/               # Images, fonts, and other static assets
└── constants/            # App constants and configuration
```

## 🔐 Environment Variables

| Variable              | Description                                                    |
| --------------------- | -------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | Base URL of the News API (e.g., `https://news-api.vercel.app`) |
| `EXPO_PUBLIC_API_KEY` | API key for authenticating with the backend                    |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the Apache 2.0 License.
