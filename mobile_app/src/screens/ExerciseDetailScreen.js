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
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        
        {/* Header */}
        <View style={styles.trackerHeader}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.trackerTitle}>{exercise?.title || 'Details'}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.detailScroll}>
          {/* Visual Header / Banner */}
          <View style={styles.detailCard}>
            <View style={styles.detailHeaderIcon}>
              <Feather name={exercise?.icon || 'activity'} size={40} color="#3b82f6" />
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

          {/* Notice / Warning */}
          <View style={styles.noticeBox}>
            <Feather name="info" size={20} color="#f59e0b" style={{ marginRight: 10 }} />
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
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: '#1e293b',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#1e293b',
  },
  trackerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  detailScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  detailCard: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  detailHeaderIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  detailSubtitle: {
    fontSize: 13,
    color: '#38bdf8',
    fontWeight: '600',
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
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 4,
  },
  detailBadgeLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  detailBadgeVal: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10,
    marginTop: 10,
  },
  textContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  detailText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
  },
  instructionsContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    gap: 15,
  },
  instructionStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 24,
  },
  stepText: {
    flex: 1,
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    padding: 16,
    alignItems: 'center',
  },
  noticeText: {
    flex: 1,
    color: '#f59e0b',
    fontSize: 12,
    lineHeight: 18,
  }
});
