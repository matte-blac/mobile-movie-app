import { icons } from "@/constants/icons";
import { useSavedMovies } from "@/context/SavedMoviesContext";
import { removeSavedMovie, saveMovie } from '@/services/appwrite';
import { Link } from "expo-router";
import React, { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Text, TouchableOpacity, View } from 'react-native';

const MovieCard = memo(({ 
    id, 
    poster_path, 
    title, 
    vote_average, 
    release_date, 
    showSaveButton = true, 
    ...movieData
}: MovieCardProps) => {

    const {isMovieSaved, addSavedMovie, removeSavedMovie: removeFromGlobalState} = useSavedMovies();
    const [isLoading, setIsLoading] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    const isSaved = isMovieSaved(id);

    // Memoize the movie object to prevent infinite re-renders
    const movieToSave = useMemo((): Movie => ({
        id,
        title,
        poster_path,
        vote_average,
        release_date,
        ...movieData
    }), [id, title, poster_path, vote_average, release_date, JSON.stringify(movieData)]);

    const handleSaveToggle = useCallback(async (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        
        setIsLoading(true);
        try {
            if (isSaved) {
                 removeFromGlobalState(id);
                 await removeSavedMovie(id);
            } else {
                addSavedMovie(id);
                await saveMovie(movieToSave);
            }
        } catch (error) {
            console.error('Error saving movie:', error);
            const errorMessage = error instanceof Error ? error.message : 'An error occurred';


            if (isSaved) {
                addSavedMovie(id);
            } else {
                removeFromGlobalState(id);
            }

            if (errorMessage.includes('already saved')) {
                Alert.alert('Already Saved', 'This movie is already in your saved list.');
                addSavedMovie(id)
            } else if (errorMessage.includes('not authorized')) {
                Alert.alert('Permission Error', 'Please make sure you are logged in and have permission to save movies.');
            } else {
                Alert.alert('Error', `Failed to ${isSaved ? 'remove' : 'save'} movie. Please try again.`);
            }
        } finally {
            setIsLoading(false);
        }
    }, [id, isSaved, movieToSave, addSavedMovie, removeFromGlobalState]);

    const handleImageLoad = useCallback(() => {
        setImageLoading(false);
        setImageError(false);
    }, []);

    const handleImageError = useCallback(() => {
        setImageLoading(false);
        setImageError(true);
    }, []);

    const imageSource = useMemo(() => {
        return poster_path && !imageError
            ? { uri: `https://image.tmdb.org/t/p/w342/${poster_path}` }
            : { uri: `https://placehold.co/342x513/1a1a1a/ffffff.png?text=${encodeURIComponent(title)}` };
    }, [poster_path, imageError, title]);

    const yearFromDate = useMemo(() => {
        return release_date?.split('-')[0] || '';
    }, [release_date]);

    const roundedRating = useMemo(() => {
        return Math.round(vote_average / 2);
    }, [vote_average]);

    return (
        <View className="relative">
            <Link href={`/movies/${id}`} asChild>
                <TouchableOpacity>
                    <View className="relative">
                        <Image
                            source={imageSource}
                            style={{
                                width: '100%',
                                height: 208,
                                borderRadius: 8,
                            }}
                            resizeMode="cover"
                            onLoad={handleImageLoad}
                            onError={handleImageError}
                        />  

                        {/* loading placeholder */}
                        {imageLoading && (
                            <View className="absolute inset-0 bg-dark-200 rounded-lg items-center justify-center">
                                <ActivityIndicator color='accent' size='small' />
                                <Text className="text-gray-400 text-xs mt-2">Loading...</Text>
                            </View>
                        )}

                        {/* Error placeholder */}
                        {imageError && !imageLoading && (
                            <View className="absolute inset-0 bg-dark-200 rounded-lg items-center justify-center">
                                <Image source={icons.logo} className="w-8 h-6 opacity-50"/>
                                <Text className="text-gray-400 text-xs mt-2 text-center px-2" numberOfLines={2}>
                                    {title}
                                </Text>
                            </View>
                        )}
                    </View>
                    
                    {showSaveButton && (
                        <TouchableOpacity
                            onPress={handleSaveToggle}
                            className={`absolute top-2 right-2 w-8 h-8 rounded-full items-center justify-center ${
                                isSaved ? 'bg-accent' : 'bg-black/50'
                            }`}
                            disabled={isLoading}
                        >
                            <Image 
                                source={icons.save} 
                                className="size-4" 
                                tintColor={isSaved ? '#ffffff' : '#a8b5db'}
                            />
                        </TouchableOpacity>
                    )}
                    
                    <Text className="text-sm font-bold text-white mt-2" numberOfLines={1}>
                        {title}
                    </Text>
                    <View className="flex-row items-center justify-start gap-x-1">
                        <Image source={icons.star} className="size-4"/>
                        <Text className="text-xs text-white font-bold uppercase">
                            {roundedRating}
                        </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-light-300 font-medium mt-1">
                            {yearFromDate}
                        </Text>
                    </View>
                </TouchableOpacity>
            </Link>
        </View>
    );
});

MovieCard.displayName = 'MovieCard';

export default MovieCard;