import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import React from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";


const ErrorScreen: React.FC<ErrorScreenProps> = ({
    error,
    onRetry,
    title = 'Something went wrong',
    icon,
    showLogo = true,
    className = ''
}) => {
    const errorMessage = error?.message || 'An unexpected error occurred'

    return (
        <View className={`flex-1 bg-primary ${className}`}>
            <Image source={images.bg} className="absolute w-full h-full z-0"/>
            <ScrollView
                className="flex-1 px-5"
                contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}
            >
                <View className="items-center py-10">
                    {showLogo && (
                        <Image source={icons.logo} className="w-16 h-12 mb-6 opacity-50"/>
                    )}
                    {icon && (
                        <Image source={icon} className="w-12 h-12 mb-4 opacity-50"/>
                    )}
                    <Text className="text-red-400 text-lg font-semibold mb-2 text-center">
                        {title}
                    </Text>
                    <Text className="text-gray-400 text-center mb-6 px-4">
                        {errorMessage}
                    </Text>
                    {onRetry && (
                        <TouchableOpacity
                            onPress={onRetry}
                            className="bg-accent px-6 py-3 rounded-lg"
                        >
                            <Text className="text-white font-semibold">Try Again</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </ScrollView>
        </View>
    )
}

export default ErrorScreen