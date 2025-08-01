// app/movies/[id].tsx

import { ErrorScreen, Loading, MovieInfo } from "@/components/shared";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import useFetch from "@/hooks/useFetch";
import { fetchMovieDetails, getImageUrl } from "@/services/api";
import { router, useLocalSearchParams } from "expo-router";
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View, Animated } from 'react-native';

// Memoized components
const MoviePoster = memo(({ posterUrl, title }: { posterUrl: string; title: string }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
    setImageError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);

  return (
    <View className="relative">
      <Image
        source={{ uri: posterUrl }}
        className='w-full h-[550px]'
        resizeMode='stretch'
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      
      {imageLoading && (
        <View className="absolute inset-0 bg-dark-200 items-center justify-center">
          <Animated.View style={{ opacity: 0.7 }}>
            <Text className="text-gray-400">Loading poster...</Text>
          </Animated.View>
        </View>
      )}

      {imageError && (
        <View className="absolute inset-0 bg-dark-200 items-center justify-center">
          <Image source={icons.logo} className="w-16 h-12 opacity-50 mb-2"/>
          <Text className="text-gray-400 text-center px-4">{title}</Text>
        </View>
      )}

      <View className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />
    </View>
  );
}, (prevProps, nextProps) => {
  return prevProps.posterUrl === nextProps.posterUrl && prevProps.title === nextProps.title;
});

const MovieHeader = memo(({ 
  title, 
  releaseYear, 
  runtime, 
  voteAverage, 
  voteCount 
}: {
  title: string;
  releaseYear: string;
  runtime: number | null;
  voteAverage: number;
  voteCount: string;
}) => (
  <View className='flex-col items-start justify-center mt-5 px-5'>
    <View className='flex-row items-center gap-x-1 mt-2'>
      <Text className='text-white font-bold text-xl' numberOfLines={2}>
        {title}
      </Text>
      {releaseYear && (
        <Text className='text-white font-bold text-xl'>
          ({releaseYear})
        </Text>
      )}
    </View>
    
    {runtime && (
      <View className='flex-row items-center gap-x-1 mt-2'>
        <Text className='text-light-200 text-sm'>
          Runtime: {runtime}m
        </Text>
      </View>
    )}
    
    <View className='flex-row items-center bg-dark-100 px-3 py-2 rounded-md gap-x-1 mt-2'>
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
  </View>
), (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.releaseYear === nextProps.releaseYear &&
    prevProps.runtime === nextProps.runtime &&
    prevProps.voteAverage === nextProps.voteAverage &&
    prevProps.voteCount === nextProps.voteCount
  );
});

const MovieDetailsSection = memo(({ movie }: { movie: MovieDetails }) => {
  const genres = useMemo(() => 
    movie.genres?.map((g) => g.name).join(' • ') || 'N/A', 
    [movie.genres]
  );
  
  const productionCompanies = useMemo(() => 
    movie.production_companies?.map((c) => c.name).join(' • ') || 'N/A',
    [movie.production_companies]
  );

  const budgetFormatted = useMemo(() => 
    movie.budget && movie.budget > 0 ? `$${movie.budget.toLocaleString()}` : null,
    [movie.budget]
  );

  const revenueFormatted = useMemo(() => 
    movie.revenue && movie.revenue > 0 ? `$${movie.revenue.toLocaleString()}` : null,
    [movie.revenue]
  );

  return (
    <View className="px-5">
      {movie.status && (
        <MovieInfo label='Status' value={movie.status} />
      )}
      <MovieInfo label='Overview' value={movie.overview} />
      <MovieInfo label='Genres' value={genres} />
      <MovieInfo label='Production Companies' value={productionCompanies} />
      
      {movie.tagline && (
        <MovieInfo label='Tagline' value={movie.tagline} />
      )}
      
      {budgetFormatted && (
        <MovieInfo label='Budget' value={budgetFormatted} />
      )}
      
      {revenueFormatted && (
        <MovieInfo label='Revenue' value={revenueFormatted} />
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.movie.id === nextProps.movie.id &&
    prevProps.movie.overview === nextProps.movie.overview &&
    prevProps.movie.genres === nextProps.movie.genres &&
    prevProps.movie.production_companies === nextProps.movie.production_companies &&
    prevProps.movie.tagline === nextProps.movie.tagline &&
    prevProps.movie.status === nextProps.movie.status &&
    prevProps.movie.budget === nextProps.movie.budget &&
    prevProps.movie.revenue === nextProps.movie.revenue
  );
});

const BackButton = memo(({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity 
    className='absolute bottom-5 left-0 right-0 mx-5 bg-accent rounded-lg py-3.5 flex flex-row items-center justify-center z-50 shadow-lg' 
    onPress={onPress}
    activeOpacity={0.8}
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
), (prevProps, nextProps) => {
  return prevProps.onPress === nextProps.onPress;
});

const MovieDetails = () => {
  const { id } = useLocalSearchParams();

  const { data: movie, loading, error, refetch } = useFetch(() =>
    fetchMovieDetails(id as string),
    { 
      cacheKey: `movie-${id}`,
      cacheDuration: 10 * 60 * 1000 // 10 minutes cache
    }
  );

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  const movieData = useMemo(() => {
    if (!movie) return null;

    const posterUrl = getImageUrl(movie.poster_path, 'w500');
    const releaseYear = movie.release_date?.split('-')[0] || '';
    const voteAverage = Math.round(movie.vote_average ?? 0);
    const voteCount = movie.vote_count ? 
      `${(movie.vote_count / 1000).toFixed(1)}K votes` : '';

    return {
      posterUrl,
      releaseYear,
      voteAverage,
      voteCount
    };
  }, [movie]);

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

  if (!movie || !movieData) {
    return (
      <ErrorScreen 
        error={new Error("Movie not found")}
        title="Movie Not Found"
        showLogo={false}
      />
    );
  }

  return (
    <View className='bg-primary flex-1'>
      <Image source={images.bg} className="absolute w-full h-full z-0" />
      
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={100}
        windowSize={10}
      >
        <MoviePoster 
          posterUrl={movieData.posterUrl || ''} 
          title={movie.title} 
        />
        
        <MovieHeader
          title={movie.title}
          releaseYear={movieData.releaseYear}
          runtime={movie.runtime}
          voteAverage={movieData.voteAverage}
          voteCount={movieData.voteCount}
        />

        <MovieDetailsSection movie={movie} />
      </ScrollView>
      
      <BackButton onPress={handleBackPress} />
    </View>
  );
};

export default MovieDetails;