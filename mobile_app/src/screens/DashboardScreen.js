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
    subtitle: 'AI Biomechanics Active',
    desc: 'Perform push-ups while our AI scans posture, depth, and tempo in real time.',
    difficulty: 'Medium',
    target: 'Chest, Arms & Core',
    icon: 'activity',
    status: 'AI ACTIVE',
    statusColor: '#00F5A0', // emerald green
  },
  {
    id: 'squats',
    title: 'Squats',
    subtitle: 'AI Pose Alignment',
    desc: 'Measure hip depth and knee tracking relative to ankle joints.',
    difficulty: 'Easy',
    target: 'Quads & Glutes',
    icon: 'user',
    status: 'COMING SOON',
    statusColor: '#FF9F43', // warning coral
  },
  {
    id: 'planks',
    title: 'Plank',
    subtitle: 'Core Stability Metric',
    desc: 'Verify core sagittal alignment and absolute flat plane posture hold.',
    difficulty: 'Medium',
    target: 'Abdominals & Core',
    icon: 'shield',
    status: 'COMING SOON',
    statusColor: '#FF9F43',
  },
  {
    id: 'situps',
    title: 'Sit-Ups',
    subtitle: 'Hip Flexion Analysis',
    desc: 'Track back spine angle bending rate and repetitions velocity.',
    difficulty: 'Easy',
    target: 'Core & Abs',
    icon: 'refresh-cw',
    status: 'COMING SOON',
    statusColor: '#FF9F43',
  }
];

export default function DashboardScreen({ onSelectExercise, onSignOut }) {
  return (
    <LinearGradient colors={['#050811', '#0f172a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        
        {/* Header */}
        <View style={styles.dashboardHeader}>
          <View>
            <Text style={styles.dashboardGreeting}>Hello, Athlete!</Text>
            <Text style={styles.dashboardSubtitle}>Select a laboratory node to begin analysis</Text>
          </View>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={onSignOut}
            activeOpacity={0.7}
          >
            <Feather name="log-out" size={18} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* User Quick Stats Banner (Glassmorphic) */}
        <View style={styles.quickStatsWrapper}>
          <View style={styles.quickStatsContainer}>
            <View style={styles.quickStatItem}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(0, 242, 254, 0.08)' }]}>
                <Feather name="award" size={20} color="#00f2fe" />
              </View>
              <View style={styles.statTextWrapper}>
                <Text style={styles.quickStatVal}>Vision Module</Text>
                <Text style={styles.quickStatLabel}>Active Processing</Text>
              </View>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <View style={[styles.statIconWrapper, { backgroundColor: 'rgba(0, 245, 160, 0.08)' }]}>
                <Feather name="activity" size={20} color="#00F5A0" />
              </View>
              <View style={styles.statTextWrapper}>
                <Text style={styles.quickStatVal}>System Ready</Text>
                <Text style={styles.quickStatLabel}>Local Host Active</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Exercise Library */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Biomechanical Modules</Text>
          
          <View style={styles.exerciseGrid}>
            {EXERCISES.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                style={styles.exerciseCard}
                onPress={() => onSelectExercise(item)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconOutline}>
                    <Feather name={item.icon} size={20} color="#00f2fe" />
                  </View>
                  <View style={[styles.badge, { backgroundColor: item.statusColor + '12' }]}>
                    <Text style={[styles.badgeText, { color: item.statusColor }]}>{item.status}</Text>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                  <Text style={styles.cardDesc} numberOfLines={3}>{item.desc}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.cardDetails}>
                    <Feather name="target" size={11} color="#94a3b8" />
                    <Text style={styles.cardDetailText}>{item.target}</Text>
                  </View>
                  <View style={styles.arrowIconWrapper}>
                    <Feather name="chevron-right" size={16} color="#00f2fe" />
                  </View>
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
    paddingTop: 24,
    paddingBottom: 15,
  },
  dashboardGreeting: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  dashboardSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStatsWrapper: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quickStatsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  quickStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statTextWrapper: {
    flex: 1,
  },
  quickStatVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  quickStatLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 16,
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
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 5,
    justifyContent: 'space-between',
    minHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardIconOutline: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.15)',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardBody: {
    flex: 1,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  cardSubtitle: {
    fontSize: 10,
    color: '#38bdf8',
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  cardDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 10,
    marginTop: 'auto',
  },
  cardDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  cardDetailText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  arrowIconWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
