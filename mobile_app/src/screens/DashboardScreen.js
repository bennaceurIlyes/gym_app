import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const EXERCISES = [
  {
    id: 'pushup',
    title: 'Push-Ups',
    subtitle: 'AI Pose Analysis',
    desc: 'Standard chest push-up. The AI scans your body alignment and detects elbows angle.',
    difficulty: 'Medium',
    target: 'Chest, Arms & Core',
    icon: 'activity',
    status: 'AI Enabled',
    statusColor: '#10b981', // green
  },
  {
    id: 'squats',
    title: 'Squats',
    subtitle: 'Practice Mode',
    desc: 'Lower body exercise focusing on thighs and glutes. Depth and alignment tracking.',
    difficulty: 'Easy',
    target: 'Quads & Glutes',
    icon: 'user',
    status: 'Coming Soon',
    statusColor: '#f59e0b', // orange
  },
  {
    id: 'planks',
    title: 'Plank',
    subtitle: 'Core Stability',
    desc: 'Isometric core strength exercise. Maintains a straight spine alignment.',
    difficulty: 'Medium',
    target: 'Abdominals & Core',
    icon: 'shield',
    status: 'Coming Soon',
    statusColor: '#f59e0b',
  },
  {
    id: 'situps',
    title: 'Sit-Ups',
    subtitle: 'Abdominal Strength',
    desc: 'Standard abdominal crunch workout. Measures speed and body flexion.',
    difficulty: 'Easy',
    target: 'Core & Abs',
    icon: 'refresh-cw',
    status: 'Coming Soon',
    statusColor: '#f59e0b',
  }
];

export default function DashboardScreen({ onSelectExercise, onSignOut }) {
  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        
        {/* Header */}
        <View style={styles.dashboardHeader}>
          <View>
            <Text style={styles.dashboardGreeting}>Hello, Athlete!</Text>
            <Text style={styles.dashboardSubtitle}>Choose your exercise to begin analysis</Text>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={onSignOut}
            activeOpacity={0.7}
          >
            <Feather name="log-out" size={20} color="#f43f5e" />
          </TouchableOpacity>
        </View>

        {/* User Quick Stats Banner */}
        <View style={styles.quickStatsWrapper}>
          <LinearGradient
            colors={['#1e293b', '#334155']}
            style={styles.quickStatsContainer}
          >
            <View style={styles.quickStatItem}>
              <Feather name="award" size={24} color="#f59e0b" style={styles.quickStatIcon} />
              <View>
                <Text style={styles.quickStatVal}>Computer Vision</Text>
                <Text style={styles.quickStatLabel}>Active Modules</Text>
              </View>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Feather name="activity" size={24} color="#10b981" style={styles.quickStatIcon} />
              <View>
                <Text style={styles.quickStatVal}>Ready</Text>
                <Text style={styles.quickStatLabel}>System Status</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Exercise Library */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Exercise Laboratory</Text>
          
          <View style={styles.exerciseGrid}>
            {EXERCISES.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                style={styles.exerciseCard}
                onPress={() => onSelectExercise(item)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconOutline}>
                    <Feather name={item.icon} size={22} color="#3b82f6" />
                  </View>
                  <View style={[styles.badge, { backgroundColor: item.statusColor + '20' }]}>
                    <Text style={[styles.badgeText, { color: item.statusColor }]}>{item.status}</Text>
                  </View>
                </View>

                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                <Text style={styles.cardDesc} numberOfLines={3}>{item.desc}</Text>

                <View style={styles.cardFooter}>
                  <View style={styles.cardDetails}>
                    <Feather name="target" size={12} color="#94a3b8" />
                    <Text style={styles.cardDetailText}>{item.target}</Text>
                  </View>
                  <Feather name="arrow-right" size={16} color="#3b82f6" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 15,
  },
  dashboardGreeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  dashboardSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatsWrapper: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quickStatIcon: {
    marginRight: 12,
  },
  quickStatVal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  quickStatLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#475569',
    marginHorizontal: 15,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  exerciseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  exerciseCard: {
    width: (width - 55) / 2,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 5,
    justifyContent: 'space-between',
    minHeight: 200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconOutline: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
    marginBottom: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#334155',
    paddingTop: 10,
    marginTop: 'auto',
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardDetailText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
  },
});
