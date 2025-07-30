import { icons } from "@/constants/icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";


const ProfileItem: React.FC<ProfileItemProps> = ({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    rightComponent,
    isLast = false,
    isDangerous = false
}) => (
    <TouchableOpacity
        onPress={onPress}
        className={`flex-row items-center px-4 py-4 ${!isLast ? 'border-b border-dark-100' : ''}`}
        disabled={!onPress}
    >
        <Image
            source={icon}
            className="size-6 mr-4"
            tintColor={isDangerous ? '#ef4444' : 'accent'}
        />
        <View className="flex-1">
            <Text className={`text-base font-medium ${isDangerous ? 'text-red-400' : 'text-white'}`}>
                {title}
            </Text>
            {subtitle && (
                <Text className="text-gray-400 text-sm mt-1">
                    {subtitle}
                </Text>
            )}
        </View>
        {rightComponent || (showArrow && onPress && (
            <Image source={icons.arrow} className="size-4" tintColor='accent'/>
        ))}
    </TouchableOpacity>
)

export default ProfileItem