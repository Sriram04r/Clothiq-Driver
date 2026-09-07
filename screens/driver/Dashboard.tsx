import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Switch, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IndianRupee, MapPin, Navigation, Truck, Package, PackageCheck } from 'lucide-react-native';
import { getFirestore, collectionGroup, query, where, onSnapshot } from '@react-native-firebase/firestore';
import { AuthContext } from '../../context/AuthContext';

export default function DashboardScreen({ navigation }: any) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  
  const [stats, setStats] = useState({
    todayEarnings: 0,
    completed: 0,
    pending: 0
  });
  const [nextTask, setNextTask] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const db = getFirestore();
    // Query all orders assigned to this driver
    const q = query(
      collectionGroup(db, 'orders'),
      where('driverId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let pendingCount = 0;
      let completedCount = 0;
      let earnings = 0;
      let activeOrders: any[] = [];

      snapshot.forEach(doc => {
        const order = { id: doc.id, ...doc.data() } as any;
        
        if (order.status === 'delivered') {
          completedCount++;
          // Simulated earnings: 40 rs per delivery
          earnings += 40;
        } else if (order.status !== 'cancelled') {
          pendingCount++;
          activeOrders.push({
            ...order,
            // Assuming customer userId is stored in doc reference parent
            userId: doc.ref.parent.parent?.id 
          });
        }
      });

      setStats({
        todayEarnings: earnings,
        completed: completedCount,
        pending: pendingCount
      });

      // Sort active orders by creation date (oldest first) to find the next task
      activeOrders.sort((a, b) => {
        const dateA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const dateB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return dateA - dateB;
      });

      if (activeOrders.length > 0) {
        setNextTask(activeOrders[0]);
      } else {
        setNextTask(null);
      }

      setLoading(false);
    }, (err) => {
      console.error("Dashboard Snapshot error", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const getTaskStatusLabel = (status: string) => {
    switch (status) {
      case 'placed_cod':
      case 'paid':
      case 'pickup_ready': return 'Pick Up';
      case 'out_for_pickup': return 'Out for Pickup';
      case 'washing': return 'In Wash (Wait)';
      case 'delivery_ready': return 'Deliver';
      case 'out_for_delivery': return 'Out for Delivery';
      default: return 'Task';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good Morning,</Text>
          <Text style={styles.driverName}>Driver</Text>
        </View>
        <View style={styles.onlineToggle}>
          <Text style={[styles.onlineText, !isOnline && { color: '#666' }]}>{isOnline ? 'Online' : 'Offline'}</Text>
          <Switch 
            value={isOnline} 
            onValueChange={setIsOnline} 
            trackColor={{ false: '#D1D5DB', true: '#10B981' }}
            thumbColor={'#FFF'}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#ECFDF5' }]}>
              <IndianRupee size={20} color="#10B981" />
            </View>
            <Text style={styles.statValue}>₹ {stats.todayEarnings}</Text>
            <Text style={styles.statLabel}>Today's Earnings</Text>
          </View>
          
          <View style={styles.statsColumn}>
            <View style={[styles.smallStatCard, { marginBottom: 12 }]}>
              <View style={styles.smallStatHeader}>
                <PackageCheck size={16} color="#6366F1" />
                <Text style={styles.smallStatValue}>{stats.completed}</Text>
              </View>
              <Text style={styles.smallStatLabel}>Completed</Text>
            </View>
            
            <View style={styles.smallStatCard}>
              <View style={styles.smallStatHeader}>
                <Truck size={16} color="#F59E0B" />
                <Text style={styles.smallStatValue}>{stats.pending}</Text>
              </View>
              <Text style={styles.smallStatLabel}>Pending</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Up Next</Text>

        {/* Current Task */}
        {loading ? (
          <ActivityIndicator size="large" color="#1C158A" style={{ marginTop: 40 }} />
        ) : !isOnline ? (
          <View style={styles.offlineBox}>
            <Text style={styles.offlineTitle}>You are offline</Text>
            <Text style={styles.offlineSub}>Go online to receive new tasks</Text>
          </View>
        ) : nextTask ? (
          <View style={styles.taskCard}>
            <View style={styles.taskHeader}>
              <View style={[styles.statusBadge, 
                { backgroundColor: nextTask.status.includes('pickup') ? '#EEF2FF' : '#FFFBEB' }
              ]}>
                <Text style={[styles.statusText, 
                  { color: nextTask.status.includes('pickup') ? '#4F46E5' : '#D97706' }
                ]}>
                  {getTaskStatusLabel(nextTask.status)}
                </Text>
              </View>
              <Text style={styles.taskTime}>Order #{nextTask.id.substring(0,6).toUpperCase()}</Text>
            </View>

            <View style={styles.addressContainer}>
              <View style={styles.locationRow}>
                <View style={styles.dotLineContainer}>
                  <View style={styles.dot} />
                  <View style={styles.line} />
                  <MapPin size={16} color="#1C158A" />
                </View>
                <View style={styles.locationDetails}>
                  <View style={styles.locationBlock}>
                    <Text style={styles.locationLabel}>From</Text>
                    <Text style={styles.locationValue}>
                      {nextTask.shippingAddress?.area || 'Customer Address'}
                    </Text>
                  </View>
                  <View style={styles.locationBlock}>
                    <Text style={styles.locationLabel}>To</Text>
                    <Text style={styles.locationValue}>Clothiq Warehouse</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.taskActions}>
              <TouchableOpacity 
                style={styles.detailsBtn}
                onPress={() => navigation.navigate('TaskDetails', { orderId: nextTask.id, userId: nextTask.userId })}
              >
                <Text style={styles.detailsBtnText}>View Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navigateBtn}>
                <Navigation size={18} color="#FFF" />
                <Text style={styles.navigateBtnText}>Navigate</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyTaskBox}>
            <Package size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No pending tasks</Text>
            <Text style={styles.emptySub}>We will notify you when an order is assigned.</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  onlineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginRight: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1C158A', // Deep Blue for earnings
    borderRadius: 16,
    padding: 20,
    justifyContent: 'center',
  },
  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  statsColumn: {
    flex: 1,
  },
  smallStatCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    flex: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  smallStatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  smallStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  smallStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
  },
  taskCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  taskTime: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  addressContainer: {
    marginBottom: 24,
  },
  locationRow: {
    flexDirection: 'row',
  },
  dotLineContainer: {
    alignItems: 'center',
    marginRight: 16,
    marginTop: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    marginBottom: 4,
  },
  line: {
    width: 2,
    height: 36,
    backgroundColor: '#E5E7EB',
    marginBottom: 4,
  },
  locationDetails: {
    flex: 1,
  },
  locationBlock: {
    marginBottom: 20,
  },
  locationLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 12,
  },
  detailsBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailsBtnText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '600',
  },
  navigateBtn: {
    flex: 1,
    backgroundColor: '#1C158A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  navigateBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyTaskBox: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginTop: 16,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  offlineBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  offlineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  offlineSub: {
    fontSize: 13,
    color: '#B91C1C',
  },
});
