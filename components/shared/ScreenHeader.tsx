import { icons } from "@/constants/icons";
import React from "react";
import { Image, Text, View } from "react-native";


const ScreenHeader : React.FC<ScreenHeaderProps> = ({
    title,
    subtitle,
    showLogo = true,
    className = 'w-full flex-row justify-center items-center mt-20 mb-5'
}) => {
    return (
        <View className={className}>
            {showLogo && (
                <Image source={icons.logo} className="w-12 h-10"/>
            )}
            {title && (
                <View className="items-center ml-3">
                    <Text className="text-white text-2xl font-bold text-center">
                        {title}
                    </Text>
                    {subtitle && (
                        <Text className="text-gray-400 text-center text-sm mt-1">
                            {subtitle}
                        </Text>
                    )}
                </View>
            )}
        </View>
    )
}

export default ScreenHeader