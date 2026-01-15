import { icons } from '@/constants/icons';
import { images } from '@/constants/images';
import { useAuth } from '@/context/AuthContext';
import { OTP_UI_CONFIG } from '@/services/otp';
import { CommonValidationRules, validateField } from '@/utils/validation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

type AuthStep = 'email' | 'otp' | 'name'

const Login = () => {
  const { sendOTP, verifyOTPAndLogin } = useAuth()
  
  const [email, setEmail] = useState('')
  const [otp, setOTP] = useState('')
  const [userId, setUserId] = useState<string>('')
  const [emailError, setEmailError] = useState<string>()
  const [otpError, setOTPError] = useState<string>()
  
  const [currentStep, setCurrentStep] = useState<AuthStep>('email')
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  
  // OTP specific states
  const [resendCountdown, setResendCountdown] = useState(0)

  const emailRef = useRef<TextInput>(null)
  const otpRef = useRef<TextInput>(null)
  
  const countdownIntervalRef = useRef<NodeJS.Timeout>()

  const startCountdown = useCallback((seconds: number) => {
    setResendCountdown(seconds)
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
    
    countdownIntervalRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  const validateEmail = useCallback(() => {
    const result = validateField(email, CommonValidationRules.email)
    if (!result.isValid && result.error) {
      setEmailError(result.error)
      return false
    }
    setEmailError(undefined)
    return true
  }, [email])

  const validateOTPCode = useCallback(() => {
    if (!otp || otp.length !== OTP_UI_CONFIG.OTP_LENGTH) {
      setOTPError(`Please enter the ${OTP_UI_CONFIG.OTP_LENGTH}-digit code`)
      return false
    }
    setOTPError(undefined)
    return true
  }, [otp])

  const handleSendOTP = async () => {
    setTouched({ ...touched, email: true })
    
    if (!validateEmail()) {
      return
    }

    setLoading(true)
    try {
      const result = await sendOTP(email.trim())
      
      if (result.success) {
        // store userId for verification step
        setUserId(result.userId)

        setCurrentStep('otp')
        startCountdown(result.resendDelay)
        Alert.alert('Success', result.message)
        
        // focus OTP input after a short delay
        setTimeout(() => {
          otpRef.current?.focus()
        }, 500)
      }
    } catch (error: any) {
      handleAuthError(error)
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (resendCountdown > 0) return
    
    setLoading(true)
    try {
      const result = await sendOTP(email.trim())
      
      if (result.success) {
        setUserId(result.userId)
        setOTP('') // clear previous OTP
        setOTPError(undefined)
        startCountdown(result.resendDelay)
        Alert.alert('Success', result.message)
      }
    } catch (error: any) {
      handleAuthError(error)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    setTouched({ ...touched, otp: true })
    
    if (!validateOTPCode()) {
      return
    }

    if (!userId) {
      Alert.alert('Error', 'Session expired. Please request a new verification code.')
      handleBackToEmail()
        return
    }

    setLoading(true)
    try {
      // Pass name if user provided it, undefined otherwise
      await verifyOTPAndLogin(userId, otp)
      // Success - AuthContext will handle navigation
    } catch (error: any) {
      handleAuthError(error)
    } finally {
      setLoading(false)
    }
  }

  const handleAuthError = (error: any) => {
    let errorMessage = 'An error occurred. Please try again.'
    
    if (error.message) {
      if (error.message.includes('Invalid') || error.message.includes('invalid')) {
        errorMessage = error.message
        if (currentStep === 'otp') {
          setOTPError(errorMessage)
        }
      } else if (error.message.includes('expired') || error.message.includes('Expired')) {
        errorMessage = 'Verification code expired. Please request a new one.'
        setOTPError(errorMessage)
      } else if (error.message.includes('attempt') || error.message.includes('Maximum')) {
        errorMessage = error.message
        setOTPError(errorMessage)
      } else if (error.message.includes('wait') || error.message.includes('RATE_LIMITED')) {
        errorMessage = error.message
      } else if (error.message.includes('email')) {
        errorMessage = error.message
        setEmailError(errorMessage)
      } else {
        errorMessage = error.message
      }
    }
    
    Alert.alert('Error', errorMessage)
  }

  const handleBackToEmail = () => {
    setCurrentStep('email')
    setOTP('')
    setUserId('')
    setOTPError(undefined)
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
    setResendCountdown(0)
  }

  const renderEmailStep = () => (
    <>
      <Text className="text-white text-sm font-medium mb-2">Email</Text>
      <TextInput
        ref={emailRef}
        value={email}
        onChangeText={(text) => {
          setEmail(text)
          if (emailError) setEmailError(undefined)
        }}
        onBlur={() => {
          setTouched({ ...touched, email: true })
          validateEmail()
        }}
        placeholder="Enter your email"
        placeholderTextColor="#a8b5db"
        className={`bg-dark-200 text-white px-4 py-4 rounded-lg text-base mb-2 ${
          touched.email && emailError ? 'border border-red-500' : ''
        }`}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="done"
        onSubmitEditing={handleSendOTP}
      />
      {touched.email && emailError && (
        <Text className="text-red-400 text-xs mt-1 ml-1 mb-4">{emailError}</Text>
      )}

      <TouchableOpacity
        onPress={handleSendOTP}
        disabled={loading}
        className={`py-4 rounded-lg mt-6 ${loading ? 'bg-gray-600' : 'bg-accent'}`}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-white text-center text-base font-semibold">
            Send Verification Code
          </Text>
        )}
      </TouchableOpacity>
    </>
  )

  const renderOTPStep = () => (
    <>
      <TouchableOpacity
        onPress={handleBackToEmail}
        className="flex-row items-center mb-6"
      >
        <Text className="text-accent text-sm">← Change Email</Text>
      </TouchableOpacity>

      <View className="bg-dark-200 rounded-lg p-4 mb-6">
        <Text className="text-gray-400 text-sm text-center">
          We sent a {OTP_UI_CONFIG.OTP_LENGTH}-digit code to
        </Text>
        <Text className="text-white text-base text-center font-semibold mt-1">
          {email}
        </Text>
      </View>

      <Text className="text-white text-sm font-medium mb-2">Verification Code</Text>
      <TextInput
        ref={otpRef}
        value={otp}
        onChangeText={(text) => {
          // only allow numbers
          const cleaned = text.replace(/[^0-9]/g, '')
          setOTP(cleaned)
          if (otpError) setOTPError(undefined)
        }}
        onBlur={() => {
          setTouched({ ...touched, otp: true })
          validateOTPCode()
        }}
        placeholder={`Enter ${OTP_UI_CONFIG.OTP_LENGTH}-digit code`}
        placeholderTextColor="#a8b5db"
        className={`bg-dark-200 text-white px-4 py-4 rounded-lg text-base text-center text-2xl tracking-widest mb-2 ${
          touched.otp && otpError ? 'border border-red-500' : ''
        }`}
        keyboardType="number-pad"
        maxLength={OTP_UI_CONFIG.OTP_LENGTH}
        returnKeyType="done"
        onSubmitEditing={handleVerifyOTP}
      />
      {touched.otp && otpError && (
        <Text className="text-red-400 text-xs mt-1 ml-1 mb-4">{otpError}</Text>
      )}

      <Text className="text-gray-400 text-xs text-center mb-6">
        Code expires in {OTP_UI_CONFIG.EXPIRY_MINUTES} minutes
      </Text>

      <TouchableOpacity
        onPress={handleVerifyOTP}
        disabled={loading}
        className={`py-4 rounded-lg mb-4 ${loading ? 'bg-gray-600' : 'bg-accent'}`}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-white text-center text-base font-semibold">
            Verify & Sign In
          </Text>
        )}
      </TouchableOpacity>

      <View className="flex-row justify-center items-center">
        <Text className="text-gray-400 text-sm">Didn&apos;t receive the code? </Text>
        <TouchableOpacity
          onPress={handleResendOTP}
          disabled={loading || resendCountdown > 0}
        >
          <Text className={`text-sm font-medium ${
            resendCountdown > 0 ? 'text-gray-500' : 'text-accent'
          }`}>
            {resendCountdown > 0 ? `Resend (${resendCountdown}s)` : 'Resend'}
          </Text>
        </TouchableOpacity>
      </View>
    </>
  )

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-primary"
      behavior={Platform.OS === 'android' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className='flex-1'>
          <Image source={images.bg} className="absolute w-full h-full z-0" />
      
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View className="flex-1 justify-center px-6 py-12">
              {/* Logo */}
              <View className="items-center mb-12">
                <Image source={icons.logo} className="w-20 h-16 mb-4" />
                <Text className="text-white text-3xl font-bold text-center">
                  Movie Explorer
                </Text>
                <Text className="text-gray-400 text-base text-center mt-2">
                  {currentStep === 'email' && 'Sign in with your email'}
                  {currentStep === 'otp' && 'Enter verification code'}
                </Text>
              </View>

              {/* Form */}
              <View className="space-y-4">
                {currentStep === 'email' && renderEmailStep()}
                {currentStep === 'otp' && renderOTPStep()}
              </View>

              {/* Security Info */}
              {currentStep === 'email' && (
                <View className="mt-8 bg-dark-200/50 rounded-lg p-4">
                  <Text className="text-gray-400 text-xs text-center">
                    🔒 Secure passwordless authentication. We&apos;ll send you a verification code.
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}

export default Login