import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { clearAllSavedMovies } from "@/services/appwrite";
import React, { useState } from 'react';
import { Alert, Image, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';

interface ProfileSectionProps {
    title: string;
    children: React.ReactNode;
}

const ProfileSection = ({ title, children }: ProfileSectionProps) => (
    <View className='mb-6'>
        <Text className='text-white text-lg font-bold mb-3'>{title}</Text>
        <View className='bg-dark-200 rounded-xl overflow-hidden'>
            {children}
        </View>
    </View>
);

interface ProfileItemProps {
    icon: any;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    showArrow?: boolean;
    rightComponent?: React.ReactNode;
    isLast?: boolean;
}

const ProfileItem = ({ icon, title, subtitle, onPress, showArrow = true, rightComponent, isLast = false }: ProfileItemProps) => (
    <TouchableOpacity 
        onPress={onPress}
        className={`flex-row items-center px-4 py-4 ${!isLast ? 'border-b border-dark-100' : ''}`}
        disabled={!onPress}
    >
        <Image source={icon} className='size-6 mr-4' tintColor='#ab8bff'/>
        <View className='flex-1'>
            <Text className='text-white text-base font-medium'>{title}</Text>
            {subtitle && (
                <Text className='text-gray-400 text-sm mt-1'>{subtitle}</Text>
            )}
        </View>
        {rightComponent || (showArrow && onPress && (
            <Image source={icons.arrow} className='size-4' tintColor='#a8b5db'/>
        ))}
    </TouchableOpacity>
);

const Profile = () => {
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [darkModeEnabled, setDarkModeEnabled] = useState(true);

    const handleClearSavedMovies = () => {
        Alert.alert(
            "Clear Saved Movies",
            "Are you sure you want to remove all saved movies? This action cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Clear All", 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await clearAllSavedMovies();
                            Alert.alert("Success", "All saved movies have been cleared.");
                        } catch (error) {
                            Alert.alert("Error", "Failed to clear saved movies. Please try again.");
                        }
                    }
                }
            ]
        );
    };

    const handleShareApp = () => {
        Alert.alert("Share App", "Share functionality would be implemented here using react-native-share or similar library.");
    };

    const handleRateApp = () => {
        Alert.alert("Rate App", "This would open the app store rating page.");
    };

    const handleAbout = () => {
        Alert.alert(
            "About Movie Explorer",
            "Version 1.0.0\n\nDiscover and explore movies from The Movie Database (TMDB). Save your favorites and track trending movies.\n\nBuilt with React Native and Expo.",
            [{ text: "OK" }]
        );
    };

    const handlePrivacyPolicy = () => {
        Alert.alert("Privacy Policy", "Privacy policy would be displayed here or opened in browser.");
    };

    const handleTermsOfService = () => {
        Alert.alert("Terms of Service", "Terms of service would be displayed here or opened in browser.");
    };

    return (
        <View className='bg-primary flex-1'>
            <Image source={images.bg} className="absolute w-full h-full z-0" />
            
            <ScrollView 
                className='flex-1 px-5'
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Header */}
                <View className="w-full flex-row justify-center items-center mt-16 mb-8">
                    <Image source={icons.logo} className="w-12 h-10"/>
                </View>

                {/* User Profile Section */}
                <View className='items-center mb-8'>
                    <View className='bg-accent/20 border-2 border-accent rounded-full p-6 mb-4'>
                        <Image source={icons.person} className='size-12' tintColor='#ab8bff'/>
                    </View>
                    <Text className='text-white text-xl font-bold'>Movie Explorer</Text>
                    <Text className='text-gray-400 text-sm mt-1'>Discover Amazing Movies</Text>
                </View>

                {/* Preferences Section */}
                <ProfileSection title="Preferences">
                    <ProfileItem 
                        icon={icons.save}
                        title="Notifications"
                        subtitle="Get notified about new trending movies"
                        showArrow={false}
                        rightComponent={
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                trackColor={{ false: '#374151', true: '#ab8bff' }}
                                thumbColor={notificationsEnabled ? '#ffffff' : '#9ca3af'}
                            />
                        }
                    />
                    <ProfileItem 
                        icon={icons.person}
                        title="Dark Mode"
                        subtitle="Always enabled for better movie viewing"
                        showArrow={false}
                        rightComponent={
                            <Switch
                                value={darkModeEnabled}
                                onValueChange={setDarkModeEnabled}
                                trackColor={{ false: '#374151', true: '#ab8bff' }}
                                thumbColor={darkModeEnabled ? '#ffffff' : '#9ca3af'}
                                disabled={true}
                            />
                        }
                        isLast
                    />
                </ProfileSection>

                {/* Data Section */}
                <ProfileSection title="Data">
                    <ProfileItem 
                        icon={icons.save}
                        title="Clear Saved Movies"
                        subtitle="Remove all movies from your saved list"
                        onPress={handleClearSavedMovies}
                        isLast
                    />
                </ProfileSection>
            </ScrollView>
        </View>
    )
}

export default Profile