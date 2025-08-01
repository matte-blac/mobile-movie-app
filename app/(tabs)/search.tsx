import MovieCard from "@/components/MovieCard";
import SearchBar from "@/components/SearchBar";
import { icons } from "@/constants/icons";
import { images } from "@/constants/images";
import { fetchMovies } from "@/services/api";
import { updateSearchCount } from "@/services/appwrite";
import React, { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, Text, View } from 'react-native';

const {width: screenWidth} = Dimensions.get('window')
const ITEM_WIDTH = (screenWidth - 40 - 32) / 3
const ITEM_HEIGHT = 260
const ITEMS_PER_PAGE = 20

// Memoized components
const SearchHeader = memo(({ searchQuery, onChangeText }: {
    searchQuery: string;
    onChangeText: (text: string) => void;
}) => (
    <>
        <View className="w-full flex-row justify-center mt-20 items-center">
            <Image source={icons.logo} className="w-12 h-10"/>
        </View>
        <View className="my-5">
            <SearchBar
                placeholder="Search For Movies..."
                value={searchQuery}
                onChangeText={onChangeText}
            />
        </View>
    </>
));

const LoadingIndicator = memo(({ searchQuery }: { searchQuery: string }) => (
    <View className="py-4 items-center">
        <ActivityIndicator size='large' color='accent'/>
        <Text className="text-gray-400 text-sm mt-2">Searching...</Text>
    </View>
));

const ErrorDisplay = memo(({ error }: { error: Error }) => (
    <View className="py-4 items-center">
        <Text className="text-red-400 text-center">
            {error.message}
        </Text>
    </View>
));

const SearchResults = memo(({ searchQuery, movieCount }: {
    searchQuery: string;
    movieCount: number;
}) => (
    <Text className="text-xl text-white font-bold mb-4">
        Search Results for {' '}
        <Text className="text-accent">{searchQuery}</Text> ({movieCount})
    </Text>
));

const EmptyState = memo(({ searchQuery }: { searchQuery: string }) => (
    <View className="mt-10 px-5 py-8 items-center">
        <Image
            source={icons.search}
            className="w-16 h-16 mb-4"
            tintColor='#4b5563'
        />
        <Text className="text-center text-gray-400 text-lg font-medium">
            {searchQuery.trim() ? 'No Movies Found' : 'Search For Movies'}
        </Text>
        {searchQuery.trim() && (
            <Text className="text-center text-gray-500 text-sm mt-2">
                Try different keywords or check your spelling
            </Text>
        )}
    </View>
));

const LoadMoreButton = memo(({ onPress, loading }: {
    onPress: () => void;
    loading: boolean;
}) => (
    <View className="py-4 items-center">
        {loading ? (
            <ActivityIndicator size="small" color="accent" />
        ) : (
            <Text className="text-accent text-base font-medium" onPress={onPress}>
                Load More Movies
            </Text>
        )}
    </View>
));

interface PaginatedResults {
    movies: Movie[];
    currentPage: number;
    hasMore: boolean;
    totalResults: number;
}

const Search = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [results, setResults] = useState<PaginatedResults>({
        movies: [],
        currentPage: 0,
        hasMore: false,
        totalResults: 0
    });
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const debounceTimeoutRef = useRef<NodeJS.Timeout>();
    const abortControllerRef = useRef<AbortController>();
    const lastQueryRef = useRef('');

    const searchMovies = useCallback(async (query: string, page: number = 1, append: boolean = false) => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Skip if the query is too short
        if (query.length < 2) {
            setResults({ movies: [], currentPage: 0, hasMore: false, totalResults: 0 });
            setLoading(false);
            setLoadingMore(false);
            setError(null);
            return;
        }

        // Skip if same query and page as last one
        if (query === lastQueryRef.current && page === 1 && !append) {
            return;
        }

        lastQueryRef.current = query;
        abortControllerRef.current = new AbortController();

        if (!append) {
            setLoading(true);
        } else {
            setLoadingMore(true);
        }
        setError(null);

        try {
            // Simulate pagination by fetching more results
            const response = await fetch(
                `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&page=${page}`,
                {
                    headers: {
                        accept: 'application/json',
                        Authorization: `Bearer ${process.env.EXPO_PUBLIC_MOVIE_API_KEY}`,
                    },
                    signal: abortControllerRef.current.signal
                }
            );

            if (!response.ok) {
                throw new Error('Search failed');
            }

            const data = await response.json();
            const newMovies = data.results || [];

            // Only update if this is still the current query
            if (query === lastQueryRef.current) {
                setResults(prev => ({
                    movies: append ? [...prev.movies, ...newMovies] : newMovies,
                    currentPage: page,
                    hasMore: page < data.total_pages && newMovies.length > 0,
                    totalResults: data.total_results || 0
                }));

                // Update search count for analytics
                if (newMovies.length > 0 && newMovies[0] && page === 1) {
                    updateSearchCount(query, newMovies[0]).catch(console.error);
                }
            }
        } catch (err: any) {
            if (query === lastQueryRef.current && err.name !== 'AbortError') {
                setError(err instanceof Error ? err : new Error('Search Failed'));
                if (!append) {
                    setResults({ movies: [], currentPage: 0, hasMore: false, totalResults: 0 });
                }
            }
        } finally {
            if (query === lastQueryRef.current) {
                setLoading(false);
                setLoadingMore(false);
            }
        }
    }, []);

    const debounceSearch = useCallback((query: string) => {
        // Clear existing timeout
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        // Clear results if query is empty
        if (!query.trim()) {
            setResults({ movies: [], currentPage: 0, hasMore: false, totalResults: 0 });
            setLoading(false);
            setError(null);
            lastQueryRef.current = '';
            return;
        }

        setLoading(true);
        setError(null);

        // Debounce the actual search
        debounceTimeoutRef.current = setTimeout(() => {
            searchMovies(query.trim(), 1, false);
        }, 300);
    }, [searchMovies]);

    const handleSearchChange = useCallback((text: string) => {
        setSearchQuery(text);
        debounceSearch(text);
    }, [debounceSearch]);

    const handleLoadMore = useCallback(() => {
        if (!loadingMore && results.hasMore && searchQuery.trim()) {
            searchMovies(searchQuery.trim(), results.currentPage + 1, true);
        }
    }, [searchMovies, searchQuery, results.currentPage, results.hasMore, loadingMore]);

    const renderMovieItem = useCallback(({item}: {item: Movie}) => (
        <View style={{width: ITEM_WIDTH}}>
            <MovieCard {...item}/>
        </View>
    ), []);

    const getItemLayout = useCallback((_data: ArrayLike<Movie> | null | undefined, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * Math.floor(index / 3),
        index,
    }), []);

    const keyExtractor = useCallback((item: Movie) => item.id.toString(), []);

    const renderFooter = useCallback(() => {
        if (!results.hasMore || results.movies.length === 0) return null;
        return <LoadMoreButton onPress={handleLoadMore} loading={loadingMore} />;
    }, [results.hasMore, results.movies.length, handleLoadMore, loadingMore]);

    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    const ListHeaderComponent = useMemo(() => {
        return (
            <>
                <SearchHeader searchQuery={searchQuery} onChangeText={handleSearchChange} />

                {loading && searchQuery.length >= 2 && (
                    <LoadingIndicator searchQuery={searchQuery} />
                )}

                {error && searchQuery.length >= 2 && (
                    <ErrorDisplay error={error} />
                )}

                {!loading && !error && searchQuery.trim() && results.movies.length > 0 && (
                    <SearchResults searchQuery={searchQuery} movieCount={results.totalResults} />
                )}
            </>
        );
    }, [searchQuery, handleSearchChange, loading, error, results.movies.length, results.totalResults]);

    const ListEmptyComponent = useMemo(() => {
        if (loading || error) return null;
        return <EmptyState searchQuery={searchQuery} />;
    }, [loading, error, searchQuery]);

    const flatListProps = useMemo(() => ({
        renderItem: renderMovieItem,
        keyExtractor: keyExtractor,
        getItemLayout: getItemLayout,
        numColumns: 3 as const,
        columnWrapperStyle: {
            justifyContent: 'space-between' as const,
            paddingHorizontal: 5,
            marginBottom: 16
        },
        contentContainerStyle: {
            paddingBottom: 120,
            flexGrow: 1
        },
        showsVerticalScrollIndicator: false,
        removeClippedSubviews: true,
        maxToRenderPerBatch: 6,
        updateCellsBatchingPeriod: 100,
        windowSize: 10,
        initialNumToRender: 6,
        keyboardShouldPersistTaps: 'handled' as const,
        onEndReached: handleLoadMore,
        onEndReachedThreshold: 0.1,
        ListFooterComponent: renderFooter,
    }), [renderMovieItem, keyExtractor, getItemLayout, handleLoadMore, renderFooter]);

    return (
        <View className="flex-1 bg-primary">
            <Image source={images.bg} className="flex-1 absolute w-full h-full z-0" resizeMode="cover"/>
            <FlatList
                {...flatListProps}
                data={results.movies}
                className="px-5"
                ListHeaderComponent={ListHeaderComponent}
                ListEmptyComponent={ListEmptyComponent}
            />
        </View>
    );
};

export default Search;