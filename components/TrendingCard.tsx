import { images } from "@/constants/images";
import MaskedView from "@react-native-masked-view/masked-view";
import { Link } from "expo-router";
import React, { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from 'react-native';

const TrendingCard = memo(({ movie: {movie_id, title, poster_url}, index}: TrendingCardProps) => {
    const [imageLoading, setImageLoading] = useState(true)
    const [imageError, setImageError] = useState(false)

    const imageUrl = useMemo(() => {
        return poster_url?.replace('https://api.themoviedb.org/t/p/w500/', 'https://image.tmdb.org/t/p/w500/');
    }, [poster_url]) 

    const handleImageLoad = useCallback(() => {
        setImageLoading(false)
        setImageError(false)
    }, [])

    const handleImageError = useCallback(() => {
        setImageLoading(false)
        setImageError(true)
    }, [])

    const shouldShowImage = useMemo(() => {
        return imageUrl && !imageError
    }, [imageUrl, imageError])

    return (
        <TouchableOpacity className="mr-4">
            <Link href={`/movies/${movie_id}`} asChild>
            <TouchableOpacity className={'w-32 h-48 relative'}>
                <Image
                    source={{ uri: imageUrl }}
                    style={{ width: 128, height: 192, borderRadius: 8 }}
                    resizeMode="cover"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                />

                {shouldShowImage && imageLoading && (
                    <View className="absolute inset-0 bg-dark-200 rounded-lg items-center justify-center">
                        <ActivityIndicator color='accent' size='small'/>
                    </View>
                )}

                {!shouldShowImage || imageError && !imageLoading && (
                    <View className="absolute inset-0 bg-dark-200 rounded-lg items-center justify-center">
                        <Text className="text-gray-400 text-xs text-center px-2" numberOfLines={2}>
                            {title}
                        </Text>
                    </View>
                )}

                <View className='absolute -left-0.5 px-2 py-1 rounded-full'>
                    <MaskedView maskElement={
                        <Text className='font-bold text-white text-6xl'>
                            {index + 1}
                        </Text>
                    }>
                        <Image
                            source={images.rankingGradient}
                            className='size-14'
                            resizeMode='cover'
                        />
                    </MaskedView>
                </View>
                <Text className='text-sm font-bold mt-2 text-light-200' numberOfLines={2}>
                    {title}
                </Text>
            </TouchableOpacity>
        </Link>
        </TouchableOpacity>
        
    )
})

TrendingCard.displayName = 'TrendingCard'

export default TrendingCard