import { icons } from "@/constants/icons";
import React, { memo, useCallback } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

const ProfileItem: React.FC<ProfileItemProps> = memo(({
    icon,
    title,
    subtitle,
    onPress,
    showArrow = true,
    rightComponent,
    isLast = false,
    isDangerous = false
}) => {
    const handlePress = useCallback(() => {
        onPress?.();
    }, [onPress]);

    const iconTintColor = isDangerous ? '#ef4444' : 'accent';
    const titleColor = isDangerous ? 'text-red-400' : 'text-white';
    const borderStyle = !isLast ? 'border-b border-dark-100' : '';

    return (
        <TouchableOpacity
            onPress={handlePress}
            className={`flex-row items-center px-4 py-4 ${borderStyle}`}
            disabled={!onPress}
            activeOpacity={0.7}
        >
            <Image
                source={icon}
                className="size-6 mr-4"
                tintColor={iconTintColor}
            />
            <View className="flex-1">
                <Text className={`text-base font-medium ${titleColor}`}>
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
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.title === nextProps.title &&
        prevProps.subtitle === nextProps.subtitle &&
        prevProps.icon === nextProps.icon &&
        prevProps.showArrow === nextProps.showArrow &&
        prevProps.isLast === nextProps.isLast &&
        prevProps.isDangerous === nextProps.isDangerous &&
        prevProps.onPress === nextProps.onPress &&
        prevProps.rightComponent === nextProps.rightComponent
    );
});

ProfileItem.displayName = 'ProfileItem';

export default ProfileItem