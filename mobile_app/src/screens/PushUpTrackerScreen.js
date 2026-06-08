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
  const [stage, setStage] = useState('up');
  const [feedback, setFeedback] = useState('READY');
  const [feedbackColor, setFeedbackColor] = useState('#FFFF00');

  // Workout Summary Modal State
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState({ reps: 0, time: 0 });

  const timerRef = useRef(null);
  const workoutDurationRef = useRef(0);

  // Sanitizes IP inputs by removing http://, https://, ports, and trailing slashes
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
      const id = setTimeout(() => controller.abort(), 3500); // 3.5 seconds timeout
      
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
          `Could not connect to http://${cleanIp}:5000.\n\nTroubleshooting:\n1. Verify "python server.py" is running on your PC.\n2. Ensure both your PC and phone are connected to the SAME Wi-Fi network.\n3. Check that your PC's firewall isn't blocking port 5000.\n4. Double check the IP address (your PC's IP is ${cleanIp}).`
        );
      }
      return false;
    }
  };

  // Check native OS-level camera permission
  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      if (status === 'granted') {
        return true;
      }
      
      const requestResult = await Camera.requestCameraPermissionsAsync();
      return requestResult.status === 'granted';
    } catch (error) {
      console.log("Error requesting camera permission:", error);
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        return status === 'granted';
      } catch (err) {
        return false;
      }
    }
  };

  // Perform initial ping when moving to Pushup Tracker screen
  useEffect(() => {
    checkServerHealth(serverIp, false);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Push-up server controls
  const startWorkout = async () => {
    const isConnected = await checkServerHealth(serverIp, true);
    if (!isConnected) {
      return;
    }

    const hasCamPerm = await requestCameraPermission();
    if (!hasCamPerm) {
      Alert.alert(
        'Camera Permission Required',
        'Gym AI needs camera access to track your exercises locally on your phone. Please grant permission in your system settings.'
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
        setStage('up');
        setFeedback('START PUSH-UPS');
        setFeedbackColor('#FFFF00');
        workoutDurationRef.current = 0;
        
        timerRef.current = setInterval(() => {
          workoutDurationRef.current += 1;
        }, 1000);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start mobile pose tracking. Please check server console.');
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
          reps: data.reps || reps,
          time: workoutDurationRef.current
        });
        setShowSummary(true);
      }
    } catch (error) {
      setWorkoutActive(false);
      setSummaryData({
        reps: reps,
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
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
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
            <Feather name="arrow-left" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.trackerTitle}>Push-Up AI Lab</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.trackerScroll}>
          {/* IP Address Server Configurations */}
          <View style={styles.serverConfigContainer}>
            <View style={styles.serverInputRow}>
              <Text style={styles.serverLabel}>Host IP:</Text>
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
                <Text style={styles.pingButtonText}>Test Connection</Text>
              </TouchableOpacity>
            </View>

            {/* Status Banner */}
            <View style={styles.connectionStatusRow}>
              <Text style={styles.statusLabel}>AI Server Status:</Text>
              <View style={styles.statusIndicatorWrapper}>
                <View 
                  style={[
                    styles.statusDot, 
                    { 
                      backgroundColor: 
                        connectionStatus === 'connected' ? '#10b981' : 
                        connectionStatus === 'connecting' ? '#f59e0b' : '#ef4444' 
                    }
                  ]} 
                />
                <Text style={[
                  styles.statusIndicatorText,
                  {
                    color: 
                      connectionStatus === 'connected' ? '#10b981' : 
                      connectionStatus === 'connecting' ? '#f59e0b' : '#ef4444'
                  }
                ]}>
                  {connectionStatus === 'connected' ? 'Connected' : 
                   connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
                </Text>
              </View>
            </View>
          </View>

          {/* Pose Video Feed / Placeholder Frame */}
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
                  // CRITICAL FOR ANDROID: Grants camera permission inside the WebView
                  request.grant(request.resources);
                }}
                onMessage={(event) => {
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.reps !== undefined) {
                      setReps(data.reps);
                      setStage(data.stage);
                      setFeedback(data.feedback);
                      setFeedbackColor(data.color);
                    }
                  } catch (e) {
                    console.log("Error processing webview message:", e);
                  }
                }}
              />
            ) : (
              <View style={styles.streamPlaceholder}>
                <LinearGradient
                  colors={['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.9)']}
                  style={styles.placeholderGradient}
                >
                  <View style={styles.radarRingOuter}>
                    <View style={styles.radarRingInner}>
                      <Feather 
                        name={connectionStatus === 'connected' ? "video" : "video-off"} 
                        size={40} 
                        color={connectionStatus === 'connected' ? '#3b82f6' : '#64748b'} 
                      />
                    </View>
                  </View>
                  <Text style={styles.placeholderHeading}>
                    {connectionStatus === 'connected' ? 'STREAM READY' : 'CONNECTION REQUIRED'}
                  </Text>
                  <Text style={styles.placeholderDesc}>
                    {connectionStatus === 'connected' 
                      ? 'Press START WORKOUT below to activate your mobile camera and start pose tracking.'
                      : 'Please run "python server.py" on your PC, configure the host IP above, and verify connection status.'}
                  </Text>
                </LinearGradient>
              </View>
            )}
          </View>

          {/* Realtime Stats HUD */}
          <View style={styles.hudPanel}>
            {/* Rep Count Card */}
            <View style={styles.hudStatCard}>
              <Text style={styles.hudLabel}>REPS</Text>
              <Text style={styles.hudValueReps}>{reps}</Text>
            </View>

            {/* Stage Card */}
            <View style={styles.hudStatCard}>
              <Text style={styles.hudLabel}>STAGE</Text>
              <View style={[
                styles.hudBadge,
                { backgroundColor: stage === 'down' ? '#3b82f6' : '#10b981' }
              ]}>
                <Text style={styles.hudBadgeText}>{stage.toUpperCase()}</Text>
              </View>
            </View>
          </View>

          {/* Form Feedback Banner */}
          {workoutActive && (
            <View 
              style={[
                styles.feedbackBanner, 
                { 
                  backgroundColor: feedbackColor ? feedbackColor + '15' : '#3b82f615',
                  borderColor: feedbackColor || '#3b82f6',
                }
              ]}
            >
              <Feather 
                name={feedback.includes('KEEP') || feedback.includes('ERROR') ? "alert-circle" : "check-circle"} 
                size={20} 
                color={feedbackColor || '#3b82f6'} 
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
                activeOpacity={0.8}
                onPress={startWorkout}
                style={styles.actionButtonStartWrapper}
              >
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButton}
                >
                  <Feather name="play" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.actionButtonText}>Start Session</Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={stopWorkout}
                style={styles.actionButtonStopWrapper}
              >
                <LinearGradient
                  colors={['#ef4444', '#dc2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButton}
                >
                  <Feather name="square" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.actionButtonText}>End Session</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* Session Summary Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showSummary}
          onRequestClose={() => setShowSummary(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <LinearGradient
                colors={['#1e293b', '#0f172a']}
                style={styles.modalGradient}
              >
                <View style={styles.modalAwardIconWrapper}>
                  <Feather name="award" size={48} color="#f59e0b" />
                </View>
                <Text style={styles.modalTitle}>Workout Completed!</Text>
                <Text style={styles.modalSubtitle}>Awesome performance. Here is your summary:</Text>

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

                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowSummary(false)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#3b82f6', '#1d4ed8']}
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
  trackerScroll: {
    padding: 20,
    paddingBottom: 50,
  },
  serverConfigContainer: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  serverInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  serverLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '600',
  },
  serverInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#475569',
    fontSize: 14,
  },
  pingButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pingButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  connectionStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  statusLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  statusIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
  },
  streamFrameWrapper: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#0f172a',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#334155',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
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
    padding: 30,
  },
  radarRingOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  radarRingInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderHeading: {
    fontSize: 16,
    fontWeight: '850',
    color: '#ffffff',
    letterSpacing: 1,
    marginBottom: 8,
  },
  placeholderDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  hudPanel: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 15,
  },
  hudStatCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  hudLabel: {
    fontSize: 12,
    fontWeight: '750',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 8,
  },
  hudValueReps: {
    fontSize: 48,
    fontWeight: '900',
    color: '#10b981',
  },
  hudBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  hudBadgeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  feedbackBannerText: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  actionButtonsContainer: {
    width: '100%',
  },
  actionButtonStartWrapper: {
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonStopWrapper: {
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },

  // SUMMARY MODAL STYLE SHEET
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalGradient: {
    padding: 30,
    alignItems: 'center',
  },
  modalAwardIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20,
  },
  summaryStatsGrid: {
    flexDirection: 'row',
    gap: 15,
    width: '100%',
    marginBottom: 30,
  },
  summaryStatBox: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 20,
    alignItems: 'center',
  },
  summaryStatLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    marginBottom: 6,
  },
  summaryStatValue: {
    fontSize: 32,
    fontWeight: '950',
    color: '#38bdf8',
  },
  modalCloseButton: {
    width: '100%',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  modalCloseButtonGradient: {
    height: 52,
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
