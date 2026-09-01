import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { getFirestore, collectionGroup, query, where, orderBy, limit, getDocs } from '@react-native-firebase/firestore';
import { Package, CheckCircle, TrendingUp } from 'lucide-react-native';

export default function EarningsScreen() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    completedDeliveries: 0,
    totalEarnings: 0,
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchEarnings = async () => {
      try {
        const db = getFirestore();
        const q = query(
          collectionGroup(db, 'orders'),
          where('driverId', '==', user.uid),
          where('status', '==', 'delivered'),
          limit(50) // Increased limit since we fetch all and sort locally
        );
        
        const snapshot = await getDocs(q);

        let totalEarnings = 0;
        const tasks = snapshot.docs.map(doc => {
          const data = doc.data();
          // Assuming the driver gets a fixed cut or there's a delivery fee. 
          // For now, let's assume a flat rate of ₹40 per delivery for MVP purposes.
          const driverCut = data.driverFee || 40; 
          totalEarnings += driverCut;
          
          return {
            id: doc.id,
            ...data,
            driverCut
          };
        });

        // Sort locally by createdAt desc to avoid requiring a Firebase composite index
        tasks.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });

        setStats({
          completedDeliveries: snapshot.size,
          totalEarnings: totalEarnings,
        });
        setRecentTasks(tasks);
      } catch (error) {
        console.error("Error fetching earnings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2945FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Earnings</Text>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Package size={24} color="#2945FF" />
          <Text style={styles.summaryValue}>{stats.completedDeliveries}</Text>
          <Text style={styles.summaryLabel}>Total Deliveries</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.summaryItem}>
          <TrendingUp size={24} color="#10b981" />
          <Text style={[styles.summaryValue, { color: '#10b981' }]}>₹{stats.totalEarnings}</Text>
          <Text style={styles.summaryLabel}>Total Earned</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Deliveries</Text>

      {recentTasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You haven't completed any deliveries yet.</Text>
        </View>
      ) : (
        <FlatList
          data={recentTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.taskCard}>
              <View style={styles.taskInfo}>
                <CheckCircle size={20} color="#10b981" style={{ marginRight: 12 }} />
                <View>
                  <Text style={styles.taskId}>Order #{item.id.slice(0, 8)}</Text>
                  <Text style={styles.taskDate}>
                    {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Unknown date'}
                  </Text>
                </View>
              </View>
              <Text style={styles.taskAmount}>+₹{item.driverCut}</Text>
            </View>
          )}
          contentContainerStyle={{ padding: 20 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 15,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 20,
    marginBottom: 10,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  taskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  taskDate: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  taskAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10b981',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
  }
});
