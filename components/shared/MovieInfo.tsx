import React, { memo } from "react";
import { Text, View } from "react-native";


const MovieInfo: React.FC<MovieInfoProps> = memo(({label, value}) => {
    const displayValue = value?.toString() || 'N/A';

    return (
        <View className="flex-col items-start justify-center mt-5">
            <Text className="text-light-200 font-normal text-sm mb-1">
                {label}
            </Text>
            <View className="bg-dark-100/30 px-3 py-2 rounded-lg w-full">
                <Text className="text-light-100 font-bold text-sm">
                    {displayValue}
                </Text>
            </View>
        </View>
    );
}, (prevProps, nextProps) => {
    return (
        prevProps.label === nextProps.label &&
        prevProps.value === nextProps.value
    );
});

MovieInfo.displayName = 'MovieInfo';

export default MovieInfo