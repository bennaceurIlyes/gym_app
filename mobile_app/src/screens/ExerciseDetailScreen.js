import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

export default function ExerciseDetailScreen({ exercise, onBack }) {
  return (
    <LinearGradient colors={['#050811', '#0f172a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        
        {/* Header */}
        <View style={styles.trackerHeader}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.trackerTitle}>{exercise?.title || 'Details'}</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView contentContainerStyle={styles.detailScroll}>
          {/* Visual Header / Banner (Glassmorphic) */}
          <View style={styles.detailCard}>
            <View style={styles.detailHeaderIcon}>
              <Feather name={exercise?.icon || 'activity'} size={32} color="#00f2fe" />
            </View>
            <Text style={styles.detailTitle}>{exercise?.title}</Text>
            <Text style={styles.detailSubtitle}>{exercise?.subtitle}</Text>
            
            <View style={styles.detailBadgesRow}>
              <View style={styles.detailBadge}>
                <Text style={styles.detailBadgeLabel}>Difficulty:</Text>
                <Text style={styles.detailBadgeVal}>{exercise?.difficulty}</Text>
              </View>
              <View style={styles.detailBadge}>
                <Text style={styles.detailBadgeLabel}>Target:</Text>
                <Text style={styles.detailBadgeVal}>{exercise?.target}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.detailSectionTitle}>Overview</Text>
          <View style={styles.textContainer}>
            <Text style={styles.detailText}>{exercise?.desc}</Text>
          </View>

          {/* Instructions */}
          <Text style={styles.detailSectionTitle}>How to Perform</Text>
          <View style={styles.instructionsContainer}>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNum}>1</Text>
              <Text style={styles.stepText}>Setup your mobile camera or stand in front of your desktop webcam.</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNum}>2</Text>
              <Text style={styles.stepText}>Ensure your entire body profile (head to feet) is visible in the frame.</Text>
            </View>
            <View style={styles.instructionStep}>
              <Text style={styles.stepNum}>3</Text>
              <Text style={styles.stepText}>Maintain appropriate form. The computer vision network validates joint angles in real time.</Text>
            </View>
          </View>

          {/* Notice / Warning Box */}
          <View style={styles.noticeBox}>
            <Feather name="info" size={18} color="#FF9F43" style={{ marginRight: 10 }} />
            <Text style={styles.noticeText}>
              The AI Pose Tracking module for this exercise is currently being adapted. Try out the Push-ups tracker to experience live vision analysis.
            </Text>
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
  trackerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  trackerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  detailScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  detailCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  detailHeaderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 242, 254, 0.25)',
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  detailSubtitle: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 16,
  },
  detailBadgesRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  detailBadge: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  detailBadgeLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
  },
  detailBadgeVal: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '800',
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 12,
    marginTop: 10,
    letterSpacing: 0.3,
  },
  textContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
  },
  detailText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
  },
  instructionsContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 20,
    gap: 14,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00f2fe',
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '850',
    textAlign: 'center',
    lineHeight: 22,
  },
  stepText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 159, 67, 0.08)',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 159, 67, 0.25)',
    padding: 15,
    alignItems: 'center',
  },
  noticeText: {
    flex: 1,
    color: '#FF9F43',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  }
});
