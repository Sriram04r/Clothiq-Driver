import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { getFirestore, doc, updateDoc } from '@react-native-firebase/firestore';

GoogleSignin.configure({
  webClientId: '930212381030-t1tg6a36ciu6n5220polmkaug00n3tug.apps.googleusercontent.com',
});

// Import Screens
import OnboardingScreen from './screens/Onboarding';
import SplashScreen from './screens/Splash';
import LoginScreen from './screens/Login';
import SignupScreen from './screens/Signup';
import OTPVerificationScreen from './screens/OTPVerification';
import ForgotPasswordScreen from './screens/ForgotPassword';
import ResetPasswordScreen from './screens/ResetPassword';
// User screens removed
// Driver Screens
import DashboardScreen from './screens/driver/Dashboard';
import DriverHomeScreen from './screens/driver/DriverHome';
import TaskDetailsScreen from './screens/driver/TaskDetails';
import EarningsScreen from './screens/driver/Earnings';
import ProfileScreen from './screens/driver/Profile';
import { Home, IndianRupee, User, ClipboardList } from 'lucide-react-native';

import { AuthProvider, AuthContext } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { useContext, useEffect } from 'react';

// Configure Notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2945FF',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#f3f4f6',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        }
      }}
    >
      <Tab.Screen 
        name="Home" 
        component={DashboardScreen} 
        options={{
          tabBarIcon: ({ color }) => <Home color={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="Tasks" 
        component={DriverHomeScreen} 
        options={{
          tabBarIcon: ({ color }) => <ClipboardList color={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="Earnings" 
        component={EarningsScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <IndianRupee color={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <User color={color} size={24} />
        }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, initializing, wasLoggedIn, hasOnboarded, userRole } = useContext(AuthContext);

  useEffect(() => {
    if (user && userRole === 'driver') {
      const registerForPushNotificationsAsync = async () => {
        let token;
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        if (Device.isDevice) {
          const { status: existingStatus } = await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;
          if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }
          if (finalStatus !== 'granted') {
            Alert.alert('Failed to get push token for push notification!');
            return;
          }
          try {
            const projectId = '7113382e-7de8-4757-8fbc-a1587dd09d54'; // EAS Project ID
            token = (await Notifications.getExpoPushTokenAsync({
              projectId: projectId,
            })).data;
            
            // Save token to firestore
            const db = getFirestore();
            await updateDoc(doc(db, 'users', user.uid), {
              pushToken: token
            });
            console.log("Push token saved for driver:", token);
          } catch (e) {
            console.log("Push notification error:", e);
          }
        } else {
          console.log('Must use physical device for Push Notifications');
        }
      };

      registerForPushNotificationsAsync();
    }
  }, [user, userRole]);

  if (initializing) {
    return null; // Don't render until auth state is loaded
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="DriverTabs" component={DriverTabs} />
          <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} />
        </>
      ) : (
        <>
          {!wasLoggedIn && <Stack.Screen name="Splash" component={SplashScreen} />}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <NavigationContainer>
            <StatusBar style="dark" />
            <RootNavigator />
          </NavigationContainer>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
