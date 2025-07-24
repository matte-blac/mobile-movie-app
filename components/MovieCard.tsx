import { icons } from "@/constants/icons";
import { useSavedMovies } from "@/context/SavedMoviesContext";
import { removeSavedMovie, saveMovie } from '@/services/appwrite';
import { Link } from "expo-router";
import React, { useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';

interface MovieCardProps extends Movie {
    showSaveButton?: boolean;
}

const MovieCard = ({ 
    id, 
    poster_path, 
    title, 
    vote_average, 
    release_date, 
    showSaveButton = true, 
    ...movieData
}: Movie) => {

    const {isMovieSaved, addSavedMovie, removeSavedMovie: removeFromGlobalState} = useSavedMovies();
    const [isLoading, setIsLoading] = useState(false);

    const isSaved = isMovieSaved(id)

    // useEffect(() => {
    //     const checkSavedStatus = async () => {
    //         try {
    //             const saved = await isMovieSaved(id);
    //             setIsSaved(saved);
    //         } catch (error) {
    //             console.error('Error checking saved status:', error);
    //         }
    //     };

    //     if (showSaveButton) {
    //         checkSavedStatus();
    //     }
    // }, [id, showSaveButton]);

    const handleSaveToggle = async (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        
        setIsLoading(true);
        try {
            const movieToSave: Movie = {
                id,
                title,
                poster_path,
                vote_average,
                release_date,
                ...movieData
            };

            if (isSaved) {
                await removeSavedMovie(id);
                removeFromGlobalState(id);
            } else {
                await saveMovie(movieToSave);
                addSavedMovie(id);
            }
        } catch (error) {
            console.error('Error saving movie:', error);
            const errorMessage = error instanceof Error ? error.message : 'An error occurred';

            if (errorMessage.includes('already saved')) {
                Alert.alert('Already Saved', 'This movie is already in your saved list.');
            } else if (errorMessage.includes('not authorized')) {
                Alert.alert('Permission Error', 'Please make sure you are logged in and have permission to save movies.');
            } else {
                Alert.alert('Error', `Failed to ${isSaved ? 'remove' : 'save'} movie. Please try again.`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View className="relative">
            <Link href={`/movies/${id}`} asChild>
                <TouchableOpacity>
                    <Image
                        source={{
                            uri: poster_path
                                ? `https://image.tmdb.org/t/p/w500/${poster_path}`
                                : `https://placehold.co/404/1a1a1a/ffffff.png`
                        }}
                        className="w-full h-52 rounded-lg"
                        resizeMode="cover"
                    />
                    
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
                            {Math.round(vote_average / 2)}
                        </Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                        <Text className="text-xs text-light-300 font-medium mt-1">
                            {release_date?.split('-')[0]}
                        </Text>
                    </View>
                </TouchableOpacity>
            </Link>
        </View>
    );
};

export default MovieCard;