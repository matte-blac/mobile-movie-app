import { images } from "@/constants/images";
import React from "react";
import { ActivityIndicator, Image, Text, View } from "react-native";


const Loading: React.FC<LoadingProps> = ({
    message = 'Loading...',
    size = 'large',
    showBackground = true,
    classname = ''
}) => {
    return (
        <View className={`flex-1 bg-primary justify-center items-center ${classname}`}>
            {showBackground && (
                <Image source={images.bg} className="absolute w-full h-full z-0"/>
            )}
            <ActivityIndicator size={size} color='accent'/>
            <Text className="text-white mt-4 text-lg">
                {message}
            </Text>
        </View>
    )
}

export default Loading