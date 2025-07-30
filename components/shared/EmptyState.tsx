import React from "react";
import { Image, Text, View } from "react-native";


const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    subtitle,
    className = '',
    iconClassName = 'size-16 mb-4',
    titleClassName = 'text-white text-xl font-bold text-center mb-2',
    subtitleClassName = 'text-gray-400 text-center text-base leading-6'
}) => {
    return (
        <View className={`flex-1 justify-center items-center px-10 ${className}`}>
            <Image
                source={icon}
                className={iconClassName}
                tintColor='#6b7280'
            />
            <Text className={titleClassName}>
                {title}
            </Text>
            {subtitle && (
                <Text className={subtitleClassName}>
                    {subtitle}
                </Text>
            )}
        </View>
    )
}

export default EmptyState