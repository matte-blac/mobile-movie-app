import React from "react";
import { Text, View } from "react-native";


const ProfileSection: React.FC<ProfileSectionProps> = ({title, children}) => (
    <View className="mb-6">
        <Text className="text-white text-lg font-bold mb-3">
            {title}
        </Text>
        <View className="bg-dark-200 rounded-xl overflow-hidden">
            {children}
        </View>
    </View>
)

export default ProfileSection