import React, { memo } from "react";
import { Image, Text, View, Animated } from "react-native";

const EmptyState: React.FC<EmptyStateProps> = memo(({
    icon,
    title,
    subtitle,
    className = '',
    iconClassName = 'size-16 mb-4',
    titleClassName = 'text-white text-xl font-bold text-center mb-2',
    subtitleClassName = 'text-gray-400 text-center text-base leading-6 px-4'
}) => {
    return (
        <View className={`flex-1 justify-center items-center px-10 ${className}`}>
            <View className="items-center">
                <View className="mb-6">
                    <Image
                        source={icon}
                        className={iconClassName}
                        tintColor='#4b5563'
                    />
                    <View className="absolute inset-0 rounded-full bg-gray-700/10" />
                </View>
                
                <Text className={titleClassName}>
                    {title}
                </Text>
                
                {subtitle && (
                    <Text className={subtitleClassName}>
                        {subtitle}
                    </Text>
                )}
                
                <View className="mt-6 opacity-30">
                    <View className="flex-row space-x-2">
                        <View className="w-2 h-2 bg-gray-500 rounded-full" />
                        <View className="w-2 h-2 bg-gray-500 rounded-full" />
                        <View className="w-2 h-2 bg-gray-500 rounded-full" />
                    </View>
                </View>
            </View>
        </View>
    )
}, (prevProps, nextProps) => {
    return (
        prevProps.title === nextProps.title &&
        prevProps.subtitle === nextProps.subtitle &&
        prevProps.icon === nextProps.icon &&
        prevProps.className === nextProps.className &&
        prevProps.iconClassName === nextProps.iconClassName &&
        prevProps.titleClassName === nextProps.titleClassName &&
        prevProps.subtitleClassName === nextProps.subtitleClassName
    );
});

EmptyState.displayName = 'EmptyState';

export default EmptyState