# ISTA Community Native App

A holistic mobile application blending curated news, mental health resources, and an AI-powered community companion. Built with **React Native** and **Expo**, this app provides a seamless experience for staying informed and mindful.

## 📱 Key Features

### 📰 Smart News Feed

- **Curated Content**: Access top headlines and market news tailored to your interests.
- **Topic Filtering**: Dynamic chips to filter news by specific topics (e.g., Technology, Health, Business).
- **In-App Reading**: Read full articles without leaving the app, optimized for mobile viewing.

### 🧠 Mental Health & Mindfulness

- **Mindful Resources**: Dedicated section for mental health resources and mindfulness exercises. (Currently only through AI but plans for turning to an AI Agent in the future)
- **AI Companion**: Integrated AI Chat context to provide support and answer queries (powered by Open Router integration).
- **Persistent Chat**: Chat history synced to cloud - persists across logout/reinstall.
- **Rate Limiting**: 10 messages per day for free users (resets at midnight IST).
- **Mood Tracking**: (Planned) Simple tools to track daily mood and wellbeing.

### 🔐 Secure Authentication

- **Powered by Clerk**: Robust sign-up and sign-in flows using Clerk authentication.
- **Social Login**: Easy access via Google and other social providers.
- **Secure Profile**: User profile management with secure token handling.

### 🎨 Modern UI/UX

- **Adaptive Theming**: Beautiful dark and light modes that sync with system preferences.
- **Smooth Animations**: Powered by `react-native-reanimated` for fluid interactions.
- **Haptic Feedback**: Subtle tactile responses for a premium feel.

## 🛠️ Tech Stack

- **Framework**: [Expo](https://expo.dev/) (React Native SDK 52+)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Routing**: [Expo Router](https://docs.expo.dev/router/introduction/)
- **Authentication**: [Clerk](https://clerk.com/docs/quickstarts/expo)
- **Database**: [Convex](https://convex.dev/) - Real-time backend for chat persistence & user data
- **News API**: Custom Node.js API (powered by GNews)
- **Styling**: Native StyleSheet & Expo Vector Icons
- **State Management**: React Context & Hooks (Zustand for complex state)

## 🚀 Getting Started

### Prerequisites

- **Node.js** (LTS version recommended)
- **Expo Go** app on your mobile device (Android/iOS)
- **Git**

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/istafoundation/community.git
   cd community
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `native` root directory. You can copy `.env.example` as a template:

   ```bash
   cp .env.example .env
   ```

   **Required Variables:**

   ```env
   # API Configuration
   EXPO_PUBLIC_API_URL=https://your-api-domain.vercel.app
   EXPO_PUBLIC_API_KEY=your-secret-api-key

   # Clerk Authentication
   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

   # Convex Database
   EXPO_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
   ```

4. **Initialize Convex** (first time only):

   ```bash
   npx convex dev
   ```

   This will create a new Convex project and deploy the schema.

5. **Start the Development Server**:

   ```bash
   npx expo start
   ```

6. **Run the App**:
   - **Scan QR Code**: Use the **Expo Go** app (Android) or Camera (iOS).
   - **Emulators**: Press `a` for Android Emulator or `i` for iOS Simulator.

## 📂 Project Structure

```
community/
├── app/                  # Screens and Navigation (Expo Router)
│   ├── (auth)/           # Authentication screens (Sign In, Sign Up)
│   ├── (tabs)/           # Main Tab Navigation (Home, Explore, Mindful, Profile)
│   └── _layout.tsx       # Root Layout
├── components/           # Reusable UI Components
├── contexts/             # Global Contexts (Auth, Theme, News, Chat)
├── convex/               # Convex Backend Functions
│   ├── schema.ts         # Database Schema (users, chatMessages)
│   ├── users.ts          # User sync & rate limiting
│   ├── chat.ts           # Chat persistence
│   └── _generated/       # Auto-generated types
├── hooks/                # Custom Hooks (useNews, useThemeColor)
├── constants/            # Configuration & Static Data
└── assets/               # Images and Fonts
```

## 🏗️ Production Build

To build a standalone APK/IPA:

1. **Configure EAS** (Expo Application Services):

   ```bash
   eas build:configure
   ```

2. **Build for Android**:

   ```bash
   eas build --platform android --profile production
   ```

3. **Build for iOS**:
   ```bash
   eas build --platform ios --profile production
   ```

> **Note**: Ensure your `app.json` is correctly configured with your bundle identifier and signed credentials.

## 🤝 Contributing

We welcome contributions! Please fork the repository and submit a Pull Request. Ensure you follow the existing code style and linting rules.

## 📄 License

This project is licensed under the Apache 2.0 License.
