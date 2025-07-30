import React from "react";
import { Text, View } from "react-native";


const MovieInfo: React.FC<MovieInfoProps> = ({label, value}) => {
    const displayValue = value?.toString() || 'N/A'

    return (
        <View className="flex-col items-start justify-center mt-5">
            <Text className="text-light-200 font-normal text-sm">
                {label}
            </Text>
            <Text className="text-light-100 font-bold text-sm mt-2">
                {displayValue}
            </Text>
        </View>
    )
}

export default MovieInfo