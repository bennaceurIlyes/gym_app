import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function App() {
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
    
    // Simple email validation
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      Alert.alert('Sign In', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);
    // Simulate API request delay
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', `Signed in successfully as:\n${email}`);
    }, 1500);
  };

  return (
    <LinearGradient
      colors={['#dbe7f4', '#f0f4f8', '#ffffff']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoWrapper}>
              <View style={styles.logoOutline}>
                <Image
                  source={require('./assets/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.appName}>N A M E  A P P</Text>
            <Text style={styles.appSubtitle}>YOUR ULTIMATE WORKOUT TRACKER</Text>
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
                color={isEmailFocused ? '#2563eb' : '#9ca3af'} 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#9ca3af"
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
                color={isPasswordFocused ? '#2563eb' : '#9ca3af'} 
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
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
                  color="#9ca3af" 
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity 
              activeOpacity={0.7}
              style={styles.forgotButton}
              onPress={() => Alert.alert('Reset Password', 'A password reset link has been sent to your email.')}
            >
              <Text style={styles.forgotText}>Forget Password?</Text>
            </TouchableOpacity>

            {/* Action Sign In Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSignIn}
              disabled={loading}
              style={styles.signInButtonWrapper}
            >
              <LinearGradient
                colors={['#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signInButton}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.signInButtonText}>sign In</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Social Authentication */}
          <View style={styles.socialContainer}>
            <View style={styles.dividerWrapper}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialButtons}>
              <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                <Feather name="chrome" size={22} color="#ea4335" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                <Feather name="apple" size={22} color="#000000" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                <Feather name="facebook" size={22} color="#1877f2" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Redirect */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.footerLink}>Sign Up</Text>
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
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  logoWrapper: {
    marginBottom: 20,
    shadowColor: '#3b71ca',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  logoOutline: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 90,
    height: 90,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1e3a8a',
    letterSpacing: 2,
    textAlign: 'center',
  },
  appSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 6,
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    marginTop: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    height: 56,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  inputWrapperFocused: {
    borderColor: '#2563eb',
    borderWidth: 1.5,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#1f2937',
  },
  eyeIcon: {
    padding: 4,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 25,
    marginTop: -8,
  },
  forgotText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  signInButtonWrapper: {
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  signInButton: {
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  socialContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  dividerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#d1d5db',
  },
  dividerText: {
    fontSize: 13,
    color: '#9ca3af',
    paddingHorizontal: 12,
    fontWeight: '500',
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  socialButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 14,
  },
  footerLink: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

