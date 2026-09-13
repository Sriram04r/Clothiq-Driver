import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Dimensions, Animated, PanResponder, ActivityIndicator, Platform, Modal, TextInput } from 'react-native';
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
  const [showTagModal, setShowTagModal] = useState(false);
  const [bagTag, setBagTag] = useState('');
  const [swipeKey, setSwipeKey] = useState(0);

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null;

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          // Get initial position
          let location = await Location.getCurrentPositionAsync({});
          setDriverCoords({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          // Start watching position
          locationSubscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 10000, // Update every 10 seconds
              distanceInterval: 10, // Or every 10 meters
            },
            async (newLocation) => {
              const coords = {
                latitude: newLocation.coords.latitude,
                longitude: newLocation.coords.longitude,
              };
              setDriverCoords(coords);

              // Update Firestore in real-time
              if (task && task.refPath) {
                try {
                  const db = getFirestore();
                  const orderRef = doc(db, task.refPath);
                  await updateDoc(orderRef, {
                    driverLocation: coords
                  });
                } catch (e) {
                  console.error("Error updating location to Firestore", e);
                }
              }
            }
          );
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
        console.error("Geocoding or tracking error", error);
      } finally {
        setMapLoading(false);
      }
    })();

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
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

  const handleUpdateStatus = async (tagNumber: string = '') => {
    if (!nextAction) return;

    setUpdating(true);
    try {
      const db = getFirestore();
      const orderRef = doc(db, task.refPath);
      
      const updateData: any = { status: nextAction.next };
      if (tagNumber) updateData.bagTag = tagNumber;

      await updateDoc(orderRef, updateData);
      
      setTimeout(() => {
        navigation.goBack();
      }, 500); // small delay to see the swipe complete
    } catch (error) {
      console.error("Error updating status:", error);
      Alert.alert("Error", "Could not update task status.");
      setUpdating(false);
      setSwipeKey(prev => prev + 1); // Reset swipe button on error
    }
  };

  const onSwipeComplete = () => {
    if (nextAction?.next === 'in_progress') {
      setShowTagModal(true);
    } else {
      handleUpdateStatus();
    }
  };

  const submitBagTag = () => {
    if (!bagTag.trim()) {
      Alert.alert('Error', 'Please enter a valid bag tag number.');
      return;
    }
    setShowTagModal(false);
    handleUpdateStatus(bagTag.trim());
  };

  const cancelBagTag = () => {
    setShowTagModal(false);
    setBagTag('');
    setSwipeKey(prev => prev + 1); // Reset swipe button
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
            <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }]}>
              <MapPin size={32} color="#9CA3AF" />
              <Text style={{ marginTop: 8, color: '#6B7280', fontSize: 14, fontWeight: '500' }}>Live map is temporarily disabled</Text>
            </View>
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
            <Text style={styles.infoText}>Order #FW{task.id.substring(0, 6).toUpperCase()}</Text>
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

        {/* MODAL FOR ENTERING BAG TAG */}
        <Modal visible={showTagModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Enter Bag Tag</Text>
              <Text style={styles.modalSub}>Please enter the physical tag number you attached to this bag.</Text>
              
              <TextInput 
                style={styles.tagInput}
                placeholder="e.g. TAG-123"
                value={bagTag}
                onChangeText={setBagTag}
                autoCapitalize="characters"
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={cancelBagTag}>
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnSubmit} onPress={submitBagTag}>
                  <Text style={styles.modalBtnSubmitText}>Submit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>


      {/* SWIPE FOOTER */}
      {nextAction && (
        <View style={styles.footer}>
          <SwipeButton 
            key={swipeKey}
            text={nextAction.label} 
            color={nextAction.color} 
            onComplete={onSwipeComplete}
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
  },
  navigateButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 16, paddingVertical: 14, backgroundColor: '#2945FF', borderRadius: 12,
  },
  navigateText: {
    color: '#FFFFFF', fontWeight: '700', fontSize: 16,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#FFF', width: '85%', borderRadius: 16, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5
  },
  modalTitle: {
    fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8, textAlign: 'center'
  },
  modalSub: {
    fontSize: 14, color: '#6B7280', marginBottom: 20, textAlign: 'center', lineHeight: 20
  },
  tagInput: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16,
    fontSize: 18, fontWeight: '600', color: '#111827', textAlign: 'center', backgroundColor: '#F9FAFB',
    marginBottom: 24
  },
  modalActions: {
    flexDirection: 'row', gap: 12
  },
  modalBtnCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center'
  },
  modalBtnCancelText: {
    color: '#4B5563', fontWeight: '600', fontSize: 16
  },
  modalBtnSubmit: {
    flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#2945FF', alignItems: 'center'
  },
  modalBtnSubmitText: {
    color: '#FFFFFF', fontWeight: '600', fontSize: 16
  }
});
