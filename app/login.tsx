import { icons } from '@/constants/icons';
import { images } from '@/constants/images';
import { useAuth } from '@/context/AuthContext';
import { CommonValidationRules, validateField, ValidationResult } from '@/utils/validation';
import React, { useCallback, useRef, useState } from 'react';
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

interface FormData {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  name?: string;
  confirmPassword?: string;
}

const Login = () => {
  const { login, register } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const updateField = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const handleBlur = useCallback((field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field);
  }, []);

  const validateSingleField = useCallback((field: keyof FormData) => {
    const value = formData[field];
    let result: ValidationResult = { isValid: true };

    switch (field) {
      case 'email':
        result = validateField(value, CommonValidationRules.email)
        break;
      case 'password':
        result = validateField(value, CommonValidationRules.password)
        break;
      case 'name':
        if (!isLogin) {
          result = validateField(value, CommonValidationRules.name)
        }
        break;
      case 'confirmPassword':
        if (!isLogin) {
          result = validateField(formData.password, value)
        }
        break;
    }

    if (!result.isValid && result.error) {
      setErrors(prev => ({ ...prev, [field]: result.error }));
      return false
    } else {
      setErrors(prev => ({...prev, [field]: undefined}))
      return true
    }
  }, [formData, isLogin]);

  const validateAllFields = useCallback(() => {
    const fieldsToValidate: (keyof FormData)[] = isLogin 
      ? ['email', 'password'] 
      : ['email', 'password', 'name', 'confirmPassword'];

    let allValid = true;

    fieldsToValidate.forEach(field => {
      const isValid = validateSingleField(field);
      if (!isValid) {
        allValid = false;
      }
    });

    return allValid;
  }, [isLogin, validateSingleField]);

  const handleSubmit = async () => {
    const fieldsToTouch = isLogin 
      ? ['email', 'password'] 
      : ['email', 'password', 'name', 'confirmPassword'];
    
    setTouched(prev => ({
      ...prev,
      ...Object.fromEntries(fieldsToTouch.map(field => [field, true]))
    }));

    if (!validateAllFields()) {
      Alert.alert('Validation Error', 'Please fix the errors before continuing');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email.trim(), formData.password);
      } else {
        await register(formData.email.trim(), formData.password, formData.name.trim());
      }
    } catch (error: any) {
      handleAuthError(error);
    } finally {
      setLoading(false);
    }
  };

const handleAuthError = (error: any) => {
    let errorMessage = 'An error occurred. Please try again.';
    
    if (error.message) {
      if (error.message.includes('Invalid credentials') || error.message.includes('invalid email')) {
        errorMessage = 'Invalid email or password';
        setErrors(prev => ({ 
          ...prev, 
          email: 'Invalid credentials',
          password: 'Invalid credentials'
        }));
      } else if (error.message.includes('already exists') || error.message.includes('user with the same id')) {
        errorMessage = 'An account with this email already exists';
        setErrors(prev => ({ ...prev, email: 'Email already exists' }));
      } else if (error.message.includes('Password')) {
        errorMessage = 'Password must be at least 8 characters long';
        setErrors(prev => ({ ...prev, password: errorMessage }));
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
    }
    
    Alert.alert('Error', errorMessage);
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      email: '',
      password: '',
      name: '',
      confirmPassword: ''
    });
    setErrors({});
    setTouched({});
  };

  const focusNextField = (nextRef: React.RefObject<TextInput>) => {
    nextRef.current?.focus();
  };

  const renderInput = (
    field: keyof FormData,
    placeholder: string,
    options: {
      keyboardType?: 'default' | 'email-address';
      secureTextEntry?: boolean;
      autoCapitalize?: 'none' | 'words';
      returnKeyType?: 'next' | 'done';
      nextRef?: React.RefObject<TextInput | null>;
      onSubmitEditing?: () => void;
    } = {}
  ) => {
    const hasError = touched[field] && errors[field];
    
    return (
      <View className="mb-4">
        <Text className="text-white text-sm font-medium mb-2">
          {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
        </Text>
        <TextInput
          ref={field === 'email' ? emailRef : 
               field === 'password' ? passwordRef :
               field === 'name' ? nameRef :
               confirmPasswordRef}
          value={formData[field]}
          onChangeText={(text) => updateField(field, text)}
          onBlur={() => handleBlur(field)}
          placeholder={placeholder}
          placeholderTextColor="#a8b5db"
          className={`bg-dark-200 text-white px-4 py-4 rounded-lg text-base ${
            hasError ? 'border border-red-500' : ''
          }`}
          keyboardType={options.keyboardType || 'default'}
          secureTextEntry={options.secureTextEntry || false}
          autoCapitalize={options.autoCapitalize || 'none'}
          returnKeyType={options.returnKeyType || 'next'}
          blurOnSubmit={options.returnKeyType === 'done'}
          onSubmitEditing={options.onSubmitEditing || (() => {
            if (options.nextRef) {
              focusNextField(options.nextRef);
            }
          })}
        />
        {hasError && (
          <Text className="text-red-400 text-xs mt-1 ml-1">
            {errors[field]}
          </Text>
        )}
      </View>
    );
  };

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
                  {isLogin ? 'Welcome back!' : 'Create your account'}
                </Text>
              </View>

              {/* Form */}
              <View className="space-y-4">
                {!isLogin && renderInput('name', 'Enter your name', {
                  autoCapitalize: 'words',
                  returnKeyType: 'next',
                  nextRef: emailRef
                })}

                {renderInput('email', 'Enter your email', {
                  keyboardType: 'email-address',
                  returnKeyType: 'next',
                  nextRef: passwordRef
                })}

                {renderInput('password', 'Enter your password', {
                  secureTextEntry: true,
                  returnKeyType: isLogin ? 'done' : 'next',
                  nextRef: isLogin ? undefined : confirmPasswordRef,
                  onSubmitEditing: isLogin ? handleSubmit : undefined
                })}

                {!isLogin && renderInput('confirmPassword', 'Confirm your password', {
                  secureTextEntry: true,
                  returnKeyType: 'done',
                  onSubmitEditing: handleSubmit
                })}

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={loading}
                  className={`py-4 rounded-lg mt-6 ${loading ? 'bg-gray-600' : 'bg-accent'}`}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="text-white text-center text-base font-semibold">
                      {isLogin ? 'Sign In' : 'Create Account'}
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Toggle Mode */}
                <View className="flex-row justify-center mt-6">
                  <Text className="text-gray-400 text-sm">
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  </Text>
                  <TouchableOpacity onPress={toggleMode} disabled={loading}>
                    <Text className="text-accent text-sm font-medium">
                      {isLogin ? 'Sign Up' : 'Sign In'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default Login;