import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Dimensions, Animated, PanResponder, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore, doc, updateDoc } from '@react-native-firebase/firestore';
import { Phone, Package, Navigation, ChevronLeft, ChevronRight, MapPin } from 'lucide-react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_TRACK_WIDTH = SCREEN_WIDTH - 40; // 20 padding on each side
const SWIPE_THUMB_SIZE = 56;

const SwipeButton = ({ onComplete, text, color, disabled }: any) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [completed, setCompleted] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && !completed,
      onPanResponderMove: (e, gesture) => {
        if (disabled || completed) return;
        if (gesture.dx > 0 && gesture.dx < SWIPE_TRACK_WIDTH - SWIPE_THUMB_SIZE) {
          pan.setValue({ x: gesture.dx, y: 0 });
        }
      },
      onPanResponderRelease: (e, gesture) => {
        if (disabled || completed) return;
        if (gesture.dx > SWIPE_TRACK_WIDTH * 0.6) {
          Animated.spring(pan, {
            toValue: { x: SWIPE_TRACK_WIDTH - SWIPE_THUMB_SIZE, y: 0 },
            useNativeDriver: false,
            bounciness: 0
          }).start(() => {
            setCompleted(true);
            onComplete();
          });
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
            bounciness: 10
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={styles.swipeTrackContainer}>
      <View style={[styles.swipeTrack, { backgroundColor: disabled ? '#E5E7EB' : color + '20' }]}>
        <Text style={[styles.swipeText, { color: disabled ? '#9CA3AF' : color }]}>
          {disabled ? 'Updating...' : text}
        </Text>
        <Animated.View
          style={[
            styles.swipeThumb, 
            { backgroundColor: disabled ? '#9CA3AF' : color, transform: [{ translateX: pan.x }] }
          ]}
          {...panResponder.panHandlers}
        >
          <ChevronRight color="white" size={24} />
        </Animated.View>
      </View>
    </View>
  );
};

export default function TaskDetailsScreen({ route, navigation }: any) {
  const { task } = route.params;
  const [updating, setUpdating] = useState(false);
  const [customerCoords, setCustomerCoords] = useState<any>(null);
  const [driverCoords, setDriverCoords] = useState<any>(null);
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          setDriverCoords({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }

        const addressStr = `${task.shippingAddress?.houseNo}, ${task.shippingAddress?.area}, ${task.shippingAddress?.pincode}`;
        const geocode = await Location.geocodeAsync(addressStr);
        if (geocode.length > 0) {
          setCustomerCoords({
            latitude: geocode[0].latitude,
            longitude: geocode[0].longitude,
          });
        }
      } catch (error) {
        console.error("Geocoding error", error);
      } finally {
        setMapLoading(false);
      }
    })();
  }, []);

  const getNextStatusInfo = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pickup_ready':
        return { next: 'out_for_pickup', label: 'Swipe to Start Pickup', color: '#F59E0B' };
      case 'out_for_pickup':
        return { next: 'in_progress', label: 'Swipe to Mark Picked Up', color: '#10B981' };
      case 'delivery_ready':
        return { next: 'out_for_delivery', label: 'Swipe to Start Delivery', color: '#3B82F6' };
      case 'out_for_delivery':
        return { next: 'delivered', label: 'Swipe to Mark Delivered', color: '#10B981' };
      default:
        return null;
    }
  };

  const nextAction = getNextStatusInfo(task.status);

  const handleUpdateStatus = async () => {
    if (!nextAction) return;

    setUpdating(true);
    try {
      const db = getFirestore();
      const orderRef = doc(db, task.refPath);
      await updateDoc(orderRef, {
        status: nextAction.next
      });
      setTimeout(() => {
        navigation.goBack();
      }, 500); // small delay to see the swipe complete
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Could not update task status.");
      setUpdating(false);
    }
  };

  const handleNavigate = () => {
    const address = `${task.shippingAddress?.houseNo}, ${task.shippingAddress?.area}, ${task.shippingAddress?.pincode}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${encodeURIComponent(address)}`,
      android: `geo:0,0?q=${encodeURIComponent(address)}`
    });
    Linking.openURL(url!);
  };

  const openDialer = () => {
    if (task.shippingAddress?.phone) {
      Linking.openURL(`tel:${task.shippingAddress.phone}`);
    } else {
      Alert.alert("No Phone", "Customer didn't provide a phone number.");
    }
  };

  // Determine initial region for map
  const getMapRegion = () => {
    if (customerCoords) {
      return {
        latitude: customerCoords.latitude,
        longitude: customerCoords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    } else if (driverCoords) {
      return {
        latitude: driverCoords.latitude,
        longitude: driverCoords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    return {
      latitude: 20.5937,
      longitude: 78.9629,
      latitudeDelta: 10,
      longitudeDelta: 10,
    }; // Default to India roughly
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* MAP SECTION */}
        <View style={styles.mapContainer}>
          {mapLoading ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={{ marginTop: 8, color: '#6B7280' }}>Loading map...</Text>
            </View>
          ) : (
            <MapView
              style={styles.map}
              initialRegion={getMapRegion()}
              showsUserLocation={true}
            >
              {customerCoords && (
                <Marker 
                  coordinate={customerCoords} 
                  title="Customer Location" 
                  description="Pickup/Delivery point"
                  pinColor="red"
                />
              )}
              {driverCoords && customerCoords && (
                <Polyline
                  coordinates={[driverCoords, customerCoords]}
                  strokeColor="#3B82F6"
                  strokeWidth={4}
                  geodesic={true}
                  lineDashPattern={[0]}
                />
              )}
            </MapView>
          )}
        </View>

        {/* DETAILS SECTION */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.infoRow}>
            <MapPin size={20} color="#6B7280" />
            <Text style={styles.infoText}>
              {task.shippingAddress?.houseNo}, {task.shippingAddress?.area}{'\n'}
              Pincode: {task.shippingAddress?.pincode}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.callButton} onPress={openDialer}>
            <Phone size={20} color="#10B981" />
            <Text style={styles.callButtonText}>Call Customer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Information</Text>
          <View style={styles.infoRow}>
            <Package size={20} color="#6B7280" />
            <Text style={styles.infoText}>Order #{task.id.slice(-6).toUpperCase()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.statusText}>{task.status.replace(/_/g, ' ').toUpperCase()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Items:</Text>
            <Text style={styles.valueText}>{task.itemsCount || 0} items</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Total Collection:</Text>
            <Text style={styles.priceText}>₹{task.pricing?.total || 0}</Text>
          </View>

          <TouchableOpacity 
            style={styles.navigateButton}
            onPress={handleNavigate}
          >
            <Navigation size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.navigateText}>Navigate to Customer</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* SWIPE FOOTER */}
      {nextAction && (
        <View style={styles.footer}>
          <SwipeButton 
            text={nextAction.label}
            color={nextAction.color}
            onComplete={handleUpdateStatus}
            disabled={updating}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  content: { flex: 1, padding: 16 },
  
  // Map styles
  mapContainer: {
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#E5E7EB',
    position: 'relative'
  },
  map: { width: '100%', height: '100%' },
  mapLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  card: {
    backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 12 },
  infoText: { fontSize: 16, color: '#4B5563', flex: 1, lineHeight: 24 },
  label: { fontSize: 16, color: '#6B7280', width: 120 },
  valueText: { fontSize: 16, color: '#111827', fontWeight: '500' },
  statusText: { fontSize: 14, fontWeight: '700', color: '#8B5CF6' },
  priceText: { fontSize: 18, fontWeight: '700', color: '#10B981' },
  
  callButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 10, paddingVertical: 12, backgroundColor: '#10B98115', borderRadius: 12,
  },
  callButtonText: { color: '#10B981', fontWeight: '700', fontSize: 16 },

  // Footer and Swipe Button
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'white', padding: 20,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    paddingBottom: 30 // safe area for ios
  },
  swipeTrackContainer: { width: '100%', height: SWIPE_THUMB_SIZE },
  swipeTrack: {
    width: '100%', height: '100%', borderRadius: SWIPE_THUMB_SIZE / 2,
    justifyContent: 'center', alignItems: 'center', position: 'relative'
  },
  swipeText: { fontSize: 16, fontWeight: '700', zIndex: 1 },
  swipeThumb: {
    position: 'absolute', left: 0, top: 0,
    width: SWIPE_THUMB_SIZE, height: SWIPE_THUMB_SIZE, borderRadius: SWIPE_THUMB_SIZE / 2,
    justifyContent: 'center', alignItems: 'center', zIndex: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3
  }
});
