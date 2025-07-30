// app/movies/[id].tsx

import { ErrorScreen, Loading, MovieInfo } from "@/components/shared";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import useFetch from "@/hooks/useFetch";
import { fetchMovieDetails, getImageUrl } from "@/services/api";
import { router, useLocalSearchParams } from "expo-router";
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const MovieDetails = () => {
  const { id } = useLocalSearchParams();

  const { data: movie, loading, error, refetch } = useFetch(() =>
    fetchMovieDetails(id as string)
  );

  if (loading) {
    return <Loading message="Loading movie details..." />;
  }

  if (error) {
    return (
      <ErrorScreen 
        error={error} 
        onRetry={refetch}
        title="Failed to load movie details"
      />
    );
  }

  if (!movie) {
    return (
      <ErrorScreen 
        error={new Error("Movie not found")}
        title="Movie Not Found"
        showLogo={false}
      />
    );
  }

  const posterUrl = getImageUrl(movie.poster_path, 'w500');
  const releaseYear = movie.release_date?.split('-')[0] || '';
  const genres = movie.genres?.map((g) => g.name).join(' • ') || 'N/A';
  const productionCompanies = movie.production_companies
    ?.map((c) => c.name)
    .join(' • ') || 'N/A';
  const voteAverage = Math.round(movie.vote_average ?? 0);
  const voteCount = movie.vote_count ? 
    `${(movie.vote_count / 1000).toFixed(1)}K votes` : '';

  return (
    <View className='bg-primary flex-1'>
      <Image source={images.bg} className="absolute w-full h-full z-0" />
      
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Image
            source={{ uri: posterUrl }}
            className='w-full h-[550px]'
            resizeMode='stretch'
          />
        </View>
        
        <View className='flex-col items-start justify-center mt-5 px-5'>
          <View className='flex-row items-center gap-x-1 mt-2'>
            <Text className='text-white font-bold text-xl'>
              {movie.title}
            </Text>
            {releaseYear && (
              <Text className='text-white font-bold text-xl'>
                ({releaseYear})
              </Text>
            )}
          </View>
          
          {movie.runtime && (
            <View className='flex-row items-center gap-x-1 mt-2'>
              <Text className='text-light-200 text-sm'>
                Runtime: {movie.runtime}m
              </Text>
            </View>
          )}
          
          <View className='flex-row items-center bg-dark-100 px-2 py-1 rounded-md gap-x-1 mt-2'>
            <Image source={icons.star} className='size-4'/>
            <Text className='text-white font-bold text-sm'>
              {voteAverage}/10
            </Text>
            {voteCount && (
              <Text className='text-light-200 text-sm'>
                ({voteCount})
              </Text>
            )}
          </View>
          
          <MovieInfo label='Overview' value={movie.overview} />
          <MovieInfo label='Genres' value={genres} />
          <MovieInfo label='Production Companies' value={productionCompanies} />
          
          {movie.tagline && (
            <MovieInfo label='Tagline' value={movie.tagline} />
          )}
          
          {movie.status && (
            <MovieInfo label='Status' value={movie.status} />
          )}
          
          {movie.budget && movie.budget > 0 && (
            <MovieInfo 
              label='Budget' 
              value={`$${movie.budget.toLocaleString()}`} 
            />
          )}
          
          {movie.revenue && movie.revenue > 0 && (
            <MovieInfo 
              label='Revenue' 
              value={`$${movie.revenue.toLocaleString()}`} 
            />
          )}
        </View>
      </ScrollView>
      
      <TouchableOpacity 
        className='absolute bottom-5 left-0 right-0 mx-5 bg-accent rounded-lg py-3.5 flex flex-row items-center justify-center z-50' 
        onPress={router.back}
      >
        <Image 
          source={icons.arrow} 
          className='size-5 mr-1 mt-0.5 rotate-180' 
          tintColor='#fff'
        />
        <Text className='text-white font-semibold text-base'>
          Return To Collection
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default MovieDetails;