import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

export default function LoginScreen({ onLoginSuccess, onBypassLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    if (!email || !password) {
      Alert.alert('Sign In', 'Please enter both email and password.');
      return;
    }
    
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      Alert.alert('Sign In', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess(email);
    }, 1000);
  };

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#0f172a']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <View style={styles.logoOutline}>
                <LinearGradient
                  colors={['#3b82f6', '#1d4ed8']}
                  style={styles.logoGradient}
                >
                  <Feather name="activity" size={48} color="#ffffff" />
                </LinearGradient>
              </View>
            </View>
            <Text style={styles.appName}>GYM A.I.</Text>
            <Text style={styles.appSubtitle}>COMPUTER VISION FITNESS TRACKER</Text>
          </View>

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Email Input */}
            <View
              style={[
                styles.inputWrapper,
                isEmailFocused && styles.inputWrapperFocused
              ]}
            >
              <Feather 
                name="mail" 
                size={20} 
                color={isEmailFocused ? '#3b82f6' : '#64748b'} 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
              />
            </View>

            {/* Password Input */}
            <View
              style={[
                styles.inputWrapper,
                isPasswordFocused && styles.inputWrapperFocused
              ]}
            >
              <Feather 
                name="lock" 
                size={20} 
                color={isPasswordFocused ? '#3b82f6' : '#64748b'} 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#64748b"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
                activeOpacity={0.7}
              >
                <Feather 
                  name={showPassword ? "eye" : "eye-off"} 
                  size={20} 
                  color="#64748b" 
                />
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSignIn}
              disabled={loading}
              style={styles.signInButtonWrapper}
            >
              <LinearGradient
                colors={['#3b82f6', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signInButton}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.signInButtonText}>Sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onBypassLogin}
              style={styles.bypassButton}
            >
              <Text style={styles.bypassButtonText}>Explore as Guest (No Login)</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Ready to train smarter? </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={onBypassLogin}>
              <Text style={styles.footerLink}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: 'space-between',
    paddingVertical: 30,
  },
  header: {
    alignItems: 'center',
    marginTop: 50,
  },
  logoWrapper: {
    marginBottom: 20,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  logoOutline: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#1e293b',
    borderWidth: 2,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 3,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
    marginTop: 8,
    letterSpacing: 2,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    marginTop: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputWrapperFocused: {
    borderColor: '#3b82f6',
    borderWidth: 1.5,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#ffffff',
  },
  eyeIcon: {
    padding: 4,
  },
  signInButtonWrapper: {
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
    marginTop: 10,
  },
  signInButton: {
    borderRadius: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  bypassButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    height: 50,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#475569',
    backgroundColor: 'transparent',
  },
  bypassButtonText: {
    color: '#cbd5e1',
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
  footerLink: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
