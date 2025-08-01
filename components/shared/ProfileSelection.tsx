import React, { memo } from "react";
import { Text, View } from "react-native";


const ProfileSection: React.FC<ProfileSectionProps> = memo(({title, children}) => (
    <View className="mb-6">
        <Text className="text-white text-lg font-bold mb-3">
            {title}
        </Text>
        <View className="bg-dark-200 rounded-xl overflow-hidden shadow-lg">
            {children}
        </View>
    </View>
), (prevProps, nextProps) => {
    return (
        prevProps.title === nextProps.title &&
        prevProps.children === nextProps.children
    );
});

ProfileSection.displayName = 'ProfileSection';

export default ProfileSection