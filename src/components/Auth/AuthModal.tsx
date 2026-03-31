import React, { useState, useEffect } from 'react';
import { 
  Modal, View, Text, StyleSheet, TouchableOpacity, 
  KeyboardAvoidingView, Platform, Dimensions, TouchableWithoutFeedback, Image
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import PrimaryButton from './PrimaryButton';
import InputField from './InputField';
import OTPInputRow from './OTPInputRow';
import { supabase } from '../../lib/supabase';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const COLORS = {
  primary: '#1A237E',
  white: '#FFFFFF',
  appBg: '#F8F9FA',
  textDark: '#1A1C1C',
  textMuted: '#44474E',
  link: '#1A237E',
  successBg: '#E8F5E9',
  successText: '#2E7D32',
  overlay: 'rgba(0,0,0,0.6)', 
};

const { width, height } = Dimensions.get('window');
type ViewState = 'LOGIN' | 'OTP';

export default function AuthModal({ visible, onClose, onSuccess }: AuthModalProps) {
  const [view, setView] = useState<ViewState>('LOGIN');
  
  // Login State
  const [email, setEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  // OTP State
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Error State Handling
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Validate Email Live
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsEmailValid(emailRegex.test(email));
  }, [email]);

  useEffect(() => {
    // Reset view every time modal opens
    if (visible) {
       setView('LOGIN');
       setEmail('');
       setOtp(['', '', '', '', '', '']);
       setResendTimer(0);
       setErrorMsg(null);
    }
  }, [visible]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOTP = async () => {
    if (!isEmailValid) return;
    setIsSending(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;

      setView('OTP');
      setResendTimer(30);
      setOtp(['', '', '', '', '', '']); 
    } catch (err: any) { 
      setErrorMsg(err.message || 'Failed to send OTP.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    const code = otp.join('');
    if (code.length < 6) return;
    
    setIsVerifying(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
      if (error) throw error;
      
      onSuccess(); 
    } catch (err: any) { 
      setErrorMsg(err.message || 'Invalid or expired OTP.');
    } finally {
      setIsVerifying(false);
    }
  };

  const renderLoginView = () => (
    <>
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backBtn} onPress={onClose} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Login</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.headerSection}>
        <View style={styles.logoBox}>
           <MaterialCommunityIcons name="train" size={28} color={COLORS.white} />
        </View>
        <Text style={styles.brandTitle}>BHARATPATH</Text>
        <Text style={styles.brandTagline}>SMART TRAVEL FOR INDIAN RAILWAYS</Text>
      </View>

      <View style={styles.imageContainer}>
        {/* We use a secure local require for the provided asset if available, fallback to a live network train stub so it builds safely in any environment without natively crashing */}
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1541427468627-a89a96e5ca1d?auto=format&fit=crop&q=80&w=800' }} 
          style={styles.heroImage} 
        />
        <View style={styles.imageOverlay} />
      </View>

      <View style={styles.welcomeSection}>
        <View style={styles.welcomeBorder} />
        <View>
          <Text style={styles.welcomeTitle}>WELCOME</Text>
          <Text style={styles.welcomeSubtitle}>Login to continue your journey</Text>
        </View>
      </View>

      <View style={styles.inputSection}>
        {errorMsg && (
          <View style={styles.errorBannerGroup}>
            <Feather name="alert-circle" size={14} color="#DC2626" />
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        )}
        <Text style={styles.inputLabel}>ENTER YOUR EMAIL</Text>
        <InputField 
           iconName="mail"
           placeholder="user@railway.com"
           value={email}
           onChangeText={(t) => { setEmail(t); setErrorMsg(null); }}
           keyboardType="email-address"
        />
      </View>

      <PrimaryButton 
        title="SEND OTP" 
        onPress={handleSendOTP} 
        isLoading={isSending} 
        disabled={!isEmailValid || email.length === 0} 
      />

      <View style={styles.guestSection}>
        <Text style={styles.guestHint}>You can explore trains without login</Text>
        <TouchableOpacity onPress={onClose} style={styles.guestBtn}>
           <Text style={styles.guestBtnText}>CONTINUE AS GUEST</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const renderOtpView = () => (
    <>
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => setView('LOGIN')} style={styles.backBtn} activeOpacity={0.7}>
           <Feather name="arrow-left" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>VERIFY OTP</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.successBanner}>
         <Feather name="check-circle" size={16} color={COLORS.successText} />
         <Text style={styles.successBannerText}>OTP sent successfully</Text>
      </View>

      <View style={styles.otpIntro}>
         <Text style={styles.otpTitle}>Enter</Text>
         <Text style={styles.otpTitle}>Verification</Text>
         <Text style={styles.otpTitle}>Code</Text>
         <Text style={styles.otpSubtitle}>We sent a 6-digit code to your email</Text>
      </View>

      <View style={styles.otpBoxSection}>
        {errorMsg && (
          <View style={[styles.errorBannerGroup, { marginBottom: 16 }]}>
            <Feather name="alert-circle" size={14} color="#DC2626" />
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        )}
        <OTPInputRow 
           length={6} 
           value={otp.join('')} 
           onCodeChange={(code) => {
             setErrorMsg(null);
             const newOtp = code.split('').concat(Array(6 - code.length).fill(''));
             setOtp(newOtp);
           }} 
        />
      </View>

      <PrimaryButton 
        title="VERIFY OTP" 
        onPress={handleVerifyOTP} 
        isLoading={isVerifying} 
        disabled={otp.join('').length < 6} 
        style={{ marginTop: 24 }}
      />

      <View style={styles.resendSection}>
         <TouchableOpacity onPress={() => { if(resendTimer === 0) handleSendOTP() }} disabled={resendTimer > 0} style={{ alignItems: 'center' }}>
            <Text style={[styles.resendBtnText, resendTimer > 0 && { color: COLORS.textMuted }]}>
               RESEND OTP
            </Text>
            {resendTimer > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                 <Feather name="clock" size={12} color={COLORS.textMuted} />
                 <Text style={styles.resendTimerText}> RESEND IN 00:{resendTimer.toString().padStart(2, '0')}</Text>
              </View>
            ) : null}
         </TouchableOpacity>
      </View>
      
      <View style={styles.secureFooter}>
         <Text style={styles.secureFooterText}>YOUR DATA IS ENCRYPTED AND 100% SAFE.</Text>
      </View>
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView 
              style={styles.centeredView} 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View style={styles.card}>
                {view === 'LOGIN' ? renderLoginView() : renderOtpView()}
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredView: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    maxHeight: height * 0.85,
  },

  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtn: {
    padding: 4,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },

  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBox: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 2,
    marginTop: 4,
    textAlign: 'center',
  },

  // Image
  imageContainer: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
    backgroundColor: '#F1F5F9', // Fallback color
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255, 0.7)', // Washout fade effect perfectly so content isn't overpowered
  },

  // Main Content
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  welcomeBorder: {
    width: 4,
    height: 36,
    backgroundColor: COLORS.primary,
    marginRight: 12,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.textDark,
    letterSpacing: -0.5,
  },
  welcomeSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
    marginTop: 2,
  },

  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textDark,
    letterSpacing: 1,
    marginBottom: 8,
  },

  guestSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  guestHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  guestBtn: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
    paddingBottom: 2,
  },
  guestBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 1,
  },

  // OTP View specific
  successBanner: {
    backgroundColor: COLORS.successBg,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  successBannerText: {
    color: COLORS.successText,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },

  otpIntro: {
    marginBottom: 24,
  },
  otpTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: COLORS.textDark,
    lineHeight: 40,
    letterSpacing: -1,
  },
  otpSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 12,
    fontWeight: '400',
  },
  otpBoxSection: {
    marginBottom: 8,
  },

  resendSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.link,
    letterSpacing: 1,
  },
  resendTimerText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },

  secureFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 32,
    paddingTop: 16,
    alignItems: 'center',
  },
  secureFooterText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 1,
  },
  errorBannerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
  },
});
