# Clothiq - Driver App 🛵

Clothiq Driver is the dedicated delivery partner application within the Clothiq laundry and dry-cleaning ecosystem. Built with **React Native** and **Expo**, it allows drivers to manage, track, and fulfill laundry pickup and delivery orders in real-time.

---

## 🚀 Features

- **Real-Time Order Sync:** Instantly receive and accept pickup/delivery requests placed by users on the Clothiq Consumer App via Firebase.
- **Order Management:** View detailed order information including customer address, service type (Wash & Fold, Dry Cleaning), and item count.
- **Status Updates:** Update order status seamlessly (e.g., "Accepted", "Picked Up", "Delivered") which immediately reflects on the consumer's app.
- **Secure Authentication:** Driver login and secure session management using Firebase Authentication.
- **Cross-Platform:** Built natively for Android (with iOS support possible via Expo).

## 🛠 Tech Stack

- **Frontend:** React Native, Expo, TypeScript
- **Backend & Database:** Firebase (Firestore, Authentication)
- **Styling:** React Native styling / Tailwind CSS (if applicable)
- **Navigation:** React Navigation

## ⚙️ Local Development Setup

To run this project locally, you will need to have [Node.js](https://nodejs.org/) and [Expo CLI](https://expo.dev/) installed.

### 1. Clone the repository
```bash
git clone https://github.com/Sriram04r/Clothiq-Driver.git
cd Clothiq-Driver
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Firebase
- Create a Firebase project and add your Android/iOS configurations.
- Ensure your `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are placed in the root of the project.

### 4. Start the Development Server
```bash
npx expo start
```
Use the Expo Go app on your physical device, or press `a` to run it on an Android Emulator.

## 📦 Building the APK

To generate a standalone Android APK for physical device testing:
```bash
cd android
./gradlew assembleRelease
```
*Note: Make sure your Android SDK and Java environment variables are properly configured.*

## 🤝 The Ecosystem
This app is part of the Clothiq Ecosystem. 
- **[Clothiq Consumer App](https://github.com/Sriram04r/Clothiq):** The main app for customers to schedule laundry services.

## 📝 License
This project is open-source and available under the [MIT License](LICENSE).
