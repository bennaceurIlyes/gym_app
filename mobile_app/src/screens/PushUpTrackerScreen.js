import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  Alert,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { Camera } from 'expo-camera';
import { getWebViewHtml } from '../utils/getWebViewHtml';

const { width } = Dimensions.get('window');

export default function PushUpTrackerScreen({ onBack }) {
  const [serverIp, setServerIp] = useState('192.168.1.10'); // Default PC local IP
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'disconnected' | 'connecting' | 'connected'
  const [workoutActive, setWorkoutActive] = useState(false);
  const [reps, setReps] = useState(0);
  const [goodReps, setGoodReps] = useState(0);
  const [badReps, setBadReps] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [elbowAngle, setElbowAngle] = useState(null);
  const [backAngle, setBackAngle] = useState(null);
  const [stage, setStage] = useState('up');
  const [feedback, setFeedback] = useState('READY');
  const [feedbackColor, setFeedbackColor] = useState('#FFFF00');

  // Workout Summary Modal State
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState({ reps: 0, goodReps: 0, badReps: 0, time: 0 });

  const timerRef = useRef(null);
  const workoutDurationRef = useRef(0);

  // Sanitizes IP inputs
  const sanitizeIp = (text) => {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^https?:\/\//i, '');
    cleaned = cleaned.split(':')[0];
    cleaned = cleaned.split('/')[0];
    return cleaned;
  };

  // Check server health
  const checkServerHealth = async (ip = serverIp, showAlert = false) => {
    const cleanIp = sanitizeIp(ip);
    setConnectionStatus('connecting');
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3500);
      
      const response = await fetch(`http://${cleanIp}:5000/health`, { 
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(id);
      
      const data = await response.json();
      if (data.status === 'ok' && data.app === 'gym-ai-pose-server') {
        setConnectionStatus('connected');
        if (showAlert) {
          Alert.alert('Connection Successful', `Successfully connected to Gym AI Server at ${cleanIp}:5000!`);
        }
        return true;
      }
      setConnectionStatus('disconnected');
      if (showAlert) {
        Alert.alert('Connection Failed', `Server at http://${cleanIp}:5000 did not respond with expected status.`);
      }
      return false;
    } catch (error) {
      setConnectionStatus('disconnected');
      if (showAlert) {
        Alert.alert(
          'Connection Error',
          `Could not connect to http://${cleanIp}:5000.\n\nTroubleshooting:\n1. Verify "python server.py" is running on your PC.\n2. Ensure both your PC and phone are connected to the SAME Wi-Fi network.\n3. Check that your PC's firewall isn't blocking port 5000.`
        );
      }
      return false;
    }
  };

  // Check camera permission
  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      if (status === 'granted') return true;
      const requestResult = await Camera.requestCameraPermissionsAsync();
      return requestResult.status === 'granted';
    } catch (error) {
      console.log("Error requesting camera permission:", error);
      return false;
    }
  };

  useEffect(() => {
    checkServerHealth(serverIp, false);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Controls
  const startWorkout = async () => {
    const isConnected = await checkServerHealth(serverIp, true);
    if (!isConnected) return;

    const hasCamPerm = await requestCameraPermission();
    if (!hasCamPerm) {
      Alert.alert(
        'Camera Permission Required',
        'Gym AI needs camera access to track your exercises locally on your phone.'
      );
      return;
    }

    try {
      const response = await fetch(`http://${serverIp}:5000/start`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'mobile' })
      });
      const data = await response.json();
      if (data.status === 'started' || data.status === 'already_running') {
        setWorkoutActive(true);
        setReps(0);
        setGoodReps(0);
        setBadReps(0);
        setAccuracy(100);
        setElbowAngle(null);
        setBackAngle(null);
        setStage('up');
        setFeedback('START PUSH-UPS');
        setFeedbackColor('#FFFF00');
        workoutDurationRef.current = 0;
        
        timerRef.current = setInterval(() => {
          workoutDurationRef.current += 1;
        }, 1000);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start mobile pose tracking.');
    }
  };

  const stopWorkout = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    try {
      const response = await fetch(`http://${serverIp}:5000/stop`, { method: 'POST' });
      const data = await response.json();
      if (data.status === 'stopped' || data.status === 'not_running') {
        setWorkoutActive(false);
        setSummaryData({
          reps: data.reps !== undefined ? data.reps : reps,
          goodReps: data.good_reps !== undefined ? data.good_reps : goodReps,
          badReps: data.bad_reps !== undefined ? data.bad_reps : badReps,
          time: workoutDurationRef.current
        });
        setShowSummary(true);
      }
    } catch (error) {
      setWorkoutActive(false);
      setSummaryData({
        reps: reps,
        goodReps: goodReps,
        badReps: badReps,
        time: workoutDurationRef.current
      });
      setShowSummary(true);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <LinearGradient colors={['#050811', '#0f172a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        
        {/* Header */}
        <View style={styles.trackerHeader}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              stopWorkout();
              onBack();
            }}
            activeOpacity={0.7}
          >
            <Feather name="chevron-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.trackerTitle}>Push-Up AI Lab</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.trackerScroll}>
          {/* IP Configurations (Glassmorphic) */}
          <View style={styles.serverConfigContainer}>
            <View style={styles.serverInputRow}>
              <Text style={styles.serverLabel}>Node IP:</Text>
              <TextInput
                style={styles.serverInput}
                placeholder="192.168.1.10"
                placeholderTextColor="#64748b"
                value={serverIp}
                onChangeText={(text) => {
                  setServerIp(text);
                  setConnectionStatus('disconnected');
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.pingButton}
                onPress={() => checkServerHealth(serverIp, true)}
                activeOpacity={0.7}
              >
                <Text style={styles.pingButtonText}>Connect</Text>
              </TouchableOpacity>
            </View>

            {/* Status Banner */}
            <View style={styles.connectionStatusRow}>
              <Text style={styles.statusLabel}>Telemetry Link:</Text>
              <View style={styles.statusIndicatorWrapper}>
                <View 
                  style={[
                    styles.statusDot, 
                    { 
                      backgroundColor: 
                        connectionStatus === 'connected' ? '#00F5A0' : 
                        connectionStatus === 'connecting' ? '#FF9F43' : '#FF3B30' 
                    }
                  ]} 
                />
                <Text style={[
                  styles.statusIndicatorText,
                  {
                    color: 
                      connectionStatus === 'connected' ? '#00F5A0' : 
                      connectionStatus === 'connecting' ? '#FF9F43' : '#FF3B30'
                  }
                ]}>
                  {connectionStatus === 'connected' ? 'CONNECTED' : 
                   connectionStatus === 'connecting' ? 'CONNECTING...' : 'DISCONNECTED'}
                </Text>
              </View>
            </View>
          </View>

          {/* Pose WebRTC Stream Frame */}
          <View style={styles.streamFrameWrapper}>
            {workoutActive && connectionStatus === 'connected' ? (
              <WebView
                source={{ html: getWebViewHtml(serverIp), baseUrl: 'http://localhost' }}
                style={styles.streamFrame}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                originWhitelist={['*']}
                onPermissionRequest={(request) => {
                  request.grant(request.resources);
                }}
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.reps !== undefined) {
                      setReps(data.reps);
                      setGoodReps(data.good_reps || 0);
                      setBadReps(data.bad_reps || 0);
                      
                      const total = (data.good_reps || 0) + (data.bad_reps || 0);
                      const acc = total === 0 ? 100 : Math.round(((data.good_reps || 0) / total) * 100);
                      setAccuracy(acc);
                      
                      setStage(data.stage);
                      setFeedback(data.feedback);
                      setFeedbackColor(data.color);
                      
                      if (data.elbow_angle !== undefined) {
                        setElbowAngle(data.elbow_angle !== null ? Math.round(data.elbow_angle) : null);
                      }
                      if (data.back_angle !== undefined) {
                        setBackAngle(data.back_angle !== null ? Math.round(data.back_angle) : null);
                      }
                    }
                  } catch (e) {
                    console.log("Error processing webview message:", e);
                  }
                }}
              />
            ) : (
              <View style={styles.streamPlaceholder}>
                <LinearGradient
                  colors={['rgba(21, 32, 54, 0.65)', 'rgba(8, 14, 30, 0.85)']}
                  style={styles.placeholderGradient}
                >
                  <View style={styles.radarRingOuter}>
                    <View style={styles.radarRingInner}>
                      <Feather 
                        name={connectionStatus === 'connected' ? "video" : "video-off"} 
                        size={32} 
                        color={connectionStatus === 'connected' ? '#00f2fe' : '#475569'} 
                      />
                    </View>
                  </View>
                  <Text style={styles.placeholderHeading}>
                    {connectionStatus === 'connected' ? 'CAMERA STREAM READY' : 'TELEMETRY OFFLINE'}
                  </Text>
                  <Text style={styles.placeholderDesc}>
                    {connectionStatus === 'connected' 
                      ? 'Press START SESSION below to initialize body keypoint scanners.'
                      : 'Launch local host server and connect your Wi-Fi node to stream telemetry.'}
                  </Text>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* Diagnostics Metrics Row */}
          {workoutActive && (
            <View style={styles.metricsRow}>
              <View style={styles.metricCell}>
                <Feather name="activity" size={14} color="#00f2fe" style={{ marginRight: 6 }} />
                <Text style={styles.metricLabel}>ELBOW FLEX: </Text>
                <Text style={styles.metricValue}>{elbowAngle !== null ? `${elbowAngle}°` : '---'}</Text>
              </View>
              <View style={styles.metricCell}>
                <Feather name="sliders" size={14} color="#00F5A0" style={{ marginRight: 6 }} />
                <Text style={styles.metricLabel}>SPINE LINE: </Text>
                <Text style={styles.metricValue}>{backAngle !== null ? `${backAngle}°` : '---'}</Text>
              </View>
            </View>
          )}

          {/* Realtime Stats HUD Dashboard */}
          <View style={styles.hudPanel}>
            {/* Good Reps Card */}
            <View style={styles.hudStatCard}>
              <Text style={[styles.hudLabel, { color: '#00F5A0' }]}>GOOD</Text>
              <Text style={[styles.hudValueReps, { color: '#00F5A0' }]}>{goodReps}</Text>
            </View>

            {/* Total Reps Card */}
            <View style={[styles.hudStatCard, { borderColor: 'rgba(255,255,255,0.12)' }]}>
              <Text style={[styles.hudLabel, { color: '#cbd5e1' }]}>TOTAL</Text>
              <Text style={[styles.hudValueReps, { color: '#ffffff' }]}>{reps}</Text>
            </View>

            {/* Bad Reps Card */}
            <View style={styles.hudStatCard}>
              <Text style={[styles.hudLabel, { color: '#FF3B30' }]}>BAD</Text>
              <Text style={[styles.hudValueReps, { color: '#FF3B30' }]}>{badReps}</Text>
            </View>
          </View>

          {/* Secondary Stats Row */}
          <View style={styles.hudPanel}>
            {/* Accuracy Card */}
            <View style={styles.hudStatCardSecondary}>
              <Text style={styles.hudLabelSecondary}>ACCURACY</Text>
              <Text style={[styles.hudValueSecondary, { color: '#00f2fe' }]}>{accuracy}%</Text>
            </View>

            {/* Stage Card */}
            <View style={styles.hudStatCardSecondary}>
              <Text style={styles.hudLabelSecondary}>STAGE</Text>
              <View style={[
                styles.hudBadge,
                { backgroundColor: stage === 'down' ? 'rgba(0, 242, 254, 0.12)' : 'rgba(0, 245, 160, 0.12)' }
              ]}>
                <Text style={[
                  styles.hudBadgeText,
                  { color: stage === 'down' ? '#00f2fe' : '#00F5A0' }
                ]}>{stage.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Form Feedback Translucent Banner */}
          {workoutActive && (
            <View 
              style={[
                styles.feedbackBanner, 
                { 
                  backgroundColor: feedbackColor ? feedbackColor + '12' : 'rgba(0, 242, 254, 0.08)',
                  borderColor: feedbackColor || '#00f2fe',
                }
              ]}
            >
              <Feather 
                name={feedback.includes('KEEP') || feedback.includes('ERROR') || feedback.includes('PLEASE') ? "alert-circle" : "check-circle"} 
                size={18} 
                color={feedbackColor || '#00f2fe'} 
                style={{ marginRight: 8 }}
              />
              <Text 
                style={[
                  styles.feedbackBannerText, 
                  { color: feedbackColor || '#ffffff' }
                ]}
              >
                {feedback || "DETECTING FORM..."}
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionButtonsContainer}>
            {!workoutActive ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={startWorkout}
                style={styles.actionButtonStartWrapper}
              >
                <LinearGradient
                  colors={['#00F5A0', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButton}
                >
                  <Feather name="play" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.actionButtonText}>Start Session</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={stopWorkout}
                style={styles.actionButtonStopWrapper}
              >
                <LinearGradient
                  colors={['#FF3B30', '#c21807']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButton}
                >
                  <Feather name="square" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.actionButtonText}>End Session</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Workout Complete Award Summary Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showSummary}
          onRequestClose={() => setShowSummary(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <LinearGradient
                colors={['#0f172a', '#050811']}
                style={styles.modalGradient}
              >
                <View style={styles.modalAwardIconWrapper}>
                  <Feather name="award" size={44} color="#FF9F43" />
                </View>
                <Text style={styles.modalTitle}>Workout Completed!</Text>
                <Text style={styles.modalSubtitle}>Pose tracker finalized. Summary stats generated:</Text>

                <View style={styles.summaryStatsGrid}>
                  <View style={styles.summaryStatBox}>
                    <Text style={styles.summaryStatLabel}>Good Reps</Text>
                    <Text style={[styles.summaryStatValue, { color: '#00F5A0' }]}>{summaryData.goodReps || 0}</Text>
                  </View>
                  <View style={styles.summaryStatBox}>
                    <Text style={styles.summaryStatLabel}>Bad Reps</Text>
                    <Text style={[styles.summaryStatValue, { color: '#FF3B30' }]}>{summaryData.badReps || 0}</Text>
                  </View>
                </View>

                <View style={styles.summaryStatsGrid}>
                  <View style={styles.summaryStatBox}>
                    <Text style={styles.summaryStatLabel}>Total Reps</Text>
                    <Text style={styles.summaryStatValue}>{summaryData.reps}</Text>
                  </View>
                  <View style={styles.summaryStatBox}>
                    <Text style={styles.summaryStatLabel}>Duration</Text>
                    <Text style={styles.summaryStatValue}>{formatTime(summaryData.time)}</Text>
                  </View>
                </View>

                <View style={[styles.summaryStatBox, { width: '100%', marginBottom: 25 }]}>
                  <Text style={styles.summaryStatLabel}>Form Accuracy Score</Text>
                  <Text style={[styles.summaryStatValue, { color: '#00f2fe', fontSize: 36 }]}>
                    {summaryData.reps === 0 ? 100 : Math.round(((summaryData.goodReps || 0) / summaryData.reps) * 100)}%
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowSummary(false)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#00f2fe', '#007BFF']}
                    style={styles.modalCloseButtonGradient}
                  >
                    <Text style={styles.modalCloseButtonText}>Done</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </View>
        </Modal>

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
  trackerScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  serverConfigContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 18,
    padding: 15,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  serverInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  serverLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
  },
  serverInput: {
    flex: 1,
    height: 38,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    fontSize: 14,
  },
  pingButton: {
    backgroundColor: '#007BFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pingButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  connectionStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 10,
  },
  statusLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  statusIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  streamFrameWrapper: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#050811',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  streamFrame: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  streamPlaceholder: {
    width: '100%',
    height: '100%',
  },
  placeholderGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  radarRingOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(0, 242, 254, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(0, 242, 254, 0.15)',
  },
  radarRingInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0, 242, 254, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 6,
  },
  placeholderDesc: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    width: '100%',
    gap: 10,
  },
  metricCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  metricLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  hudPanel: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  hudStatCard: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 88,
  },
  hudStatCardSecondary: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 68,
  },
  hudLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  hudLabelSecondary: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  hudValueReps: {
    fontSize: 34,
    fontWeight: '900',
  },
  hudValueSecondary: {
    fontSize: 20,
    fontWeight: '900',
  },
  hudBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  hudBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.2,
    padding: 14,
    marginBottom: 18,
  },
  feedbackBannerText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  actionButtonsContainer: {
    width: '100%',
  },
  actionButtonStartWrapper: {
    shadowColor: '#00F5A0',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonStopWrapper: {
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },

  // SUMMARY MODAL STYLE SHEET
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 17, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 48,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  modalGradient: {
    padding: 24,
    alignItems: 'center',
  },
  modalAwardIconWrapper: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 159, 67, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 159, 67, 0.25)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  summaryStatsGrid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 12,
  },
  summaryStatBox: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.45)',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
    alignItems: 'center',
  },
  summaryStatLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryStatValue: {
    fontSize: 26,
    fontWeight: '950',
    color: '#ffffff',
  },
  modalCloseButton: {
    width: '100%',
    shadowColor: '#00f2fe',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  modalCloseButtonGradient: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
