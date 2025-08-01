import { icons } from "@/constants/icons";
import React, { memo } from "react";
import { Image, Text, View } from "react-native";


const ScreenHeader: React.FC<ScreenHeaderProps> = memo(({
    title,
    subtitle,
    showLogo = true,
    className = 'w-full flex-row justify-center items-center mt-20 mb-5'
}) => {
    return (
        <View className={className}>
            {showLogo && (
                <View className="relative">
                    <Image source={icons.logo} className="w-12 h-10"/>
                    <View/>
                </View>
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
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.title === nextProps.title &&
        prevProps.subtitle === nextProps.subtitle &&
        prevProps.showLogo === nextProps.showLogo &&
        prevProps.className === nextProps.className
    );
});

ScreenHeader.displayName = 'ScreenHeader';

export default ScreenHeader