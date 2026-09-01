import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

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
import DriverHomeScreen from './screens/driver/DriverHome';
import TaskDetailsScreen from './screens/driver/TaskDetails';
import EarningsScreen from './screens/driver/Earnings';
import ProfileScreen from './screens/driver/Profile';
import { Home, IndianRupee, User } from 'lucide-react-native';

import { AuthProvider, AuthContext } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { useContext } from 'react';

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
        name="Tasks" 
        component={DriverHomeScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={24} />
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
          {!hasOnboarded ? (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
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
