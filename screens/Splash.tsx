import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }: any) {
  // Animation Values
  const iconX = useRef(new Animated.Value(-width)).current; // Starts off-screen to the left
  const iconScale = useRef(new Animated.Value(0.7)).current; // Starts slightly smaller
  const contentOpacity = useRef(new Animated.Value(0)).current; // Text fade
  const buttonY = useRef(new Animated.Value(100)).current; // Button slide up
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Sequence the animations
    Animated.sequence([
      // 1. Scooter slides in from the left and scales up (like it's driving in)
      Animated.parallel([
        Animated.spring(iconX, {
          toValue: 0,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),
      // 2. Fade in the text and slide up the button
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(buttonOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(buttonY, {
          toValue: 0,
          friction: 6,
          tension: 50,
          useNativeDriver: true,
        }),
      ])
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topSection}>
        <Animated.View style={[styles.logoSection, { transform: [{ translateX: iconX }, { scale: iconScale }] }]}>
          <Image source={require('../assets/icon.jpg')} style={styles.mainImage} resizeMode="contain" />
        </Animated.View>
        
        <Animated.View style={[styles.textSection, { opacity: contentOpacity }]}>
          <Text style={styles.title}>Clothiq Driver</Text>
          <Text style={styles.subtitle}>Deliver Freshness Every Day</Text>
        </Animated.View>
      </View>

      <Animated.View style={[styles.bottomSection, { opacity: buttonOpacity, transform: [{ translateY: buttonY }] }]}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 24,
  },
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#17c46b', // Using a green tint for the driver app shadow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  mainImage: {
    width: 220,
    height: 220,
    borderRadius: 45, // Smooth corners for the 3D asset
  },
  textSection: {
    alignItems: 'center',
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#111111',
    marginBottom: 8,
    fontFamily: 'Chewy', // Assuming they have Chewy loaded like Customer app
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8e93',
    fontWeight: '500',
  },
  bottomSection: {
    width: '100%',
    paddingBottom: 24,
  },
  button: {
    backgroundColor: '#17c46b', // Green button for Driver App
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#17c46b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
