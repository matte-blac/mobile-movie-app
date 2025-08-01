// interface.d.ts - Global type declarations with optimizations

// API Response Types
interface TMDBResponse<T> {
  results: T[];
  page: number;
  total_pages: number;
  total_results: number;
}

interface Movie {
  id: number;
  title: string;
  adult: boolean;
  backdrop_path: string;
  genre_ids: number[];
  original_language: string;
  original_title: string;
  overview: string;
  popularity: number;
  poster_path: string;
  release_date: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

interface TrendingMovie {
  searchTerm: string;
  movie_id: number;
  title: string;
  count: number;
  poster_url: string;
}

interface MovieDetails {
  adult: boolean;
  backdrop_path: string | null;
  belongs_to_collection: {
    id: number;
    name: string;
    poster_path: string;
    backdrop_path: string;
  } | null;
  budget: number;
  genres: {
    id: number;
    name: string;
  }[];
  homepage: string | null;
  id: number;
  imdb_id: string | null;
  original_language: string;
  original_title: string;
  overview: string | null;
  popularity: number;
  poster_path: string | null;
  production_companies: {
    id: number;
    logo_path: string | null;
    name: string;
    origin_country: string;
  }[];
  production_countries: {
    iso_3166_1: string;
    name: string;
  }[];
  release_date: string;
  revenue: number;
  runtime: number | null;
  spoken_languages: {
    english_name: string;
    iso_639_1: string;
    name: string;
  }[];
  status: string;
  tagline: string | null;
  title: string;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

interface SavedMovie {
  $id: string;
  $collectionId: string;
  $databaseId: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
  movie_id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  release_date: string;
  saved_at: string;
}

interface TrendingCardProps {
  movie: TrendingMovie;
  index: number;
}

// Component Props Types
interface MovieCardProps extends Movie {
  showSaveButton?: boolean;
}

interface SearchBarProps {
  placeholder: string;
  onPress?: () => void;
  value?: string;
  onChangeText?: (text: string) => void;
}

interface MovieInfoProps {
  label: string;
  value?: string | number | null | undefined;
}

interface ProfileSectionProps {
  title: string;
  children: React.ReactNode;
}

interface ProfileItemProps {
  icon: any;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightComponent?: React.ReactNode;
  isLast?: boolean;
  isDangerous?: boolean;
}

// Error Types
interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
}

declare class APIError extends Error implements AppError {
  code?: string;
  statusCode?: number;
  details?: any;

  constructor(message: string, code?: string, statusCode?: number, details?: any);
}

declare class AuthError extends Error implements AppError {
  code?: string;
  details?: any;

  constructor(message: string, code?: string, details?: any);
}

// Global Error Utility Functions
declare function createAPIError(
  message: string,
  statusCode?: number,
  code?: string,
  details?: any
): APIError;

declare function createAuthError(
  message: string,
  code?: string,
  details?: any
): AuthError;

declare function handleAPIError(error: any): APIError;

declare function handleAuthError(error: any): AuthError;

declare function showErrorAlert(
  error: AppError | Error,
  title?: string,
  onRetry?: () => void
): void;

declare function getErrorMessage(error: any): string;

declare function isNetworkError(error: any): boolean;

declare function shouldRetry(error: AppError): boolean;

// Utility Types
type LoadingState = {
  isLoading: boolean;
  error: AppError | null;
};

type AsyncOperation<T> = {
  data: T | null;
  loading: boolean;
  error: AppError | null;
  refetch: (bypassCache?: boolean) => Promise<void>;
  reset: () => void;
  isStale?: boolean;
  lastFetched?: number;
};

// Hook Types with enhanced options
interface UseFetchOptions {
  autoFetch?: boolean;
  cacheKey?: string;
  cacheDuration?: number; // in milliseconds
}

interface UseSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  cacheResults?: boolean;
}

// Enhanced Search Hook Return Type
interface UseSearchReturn<T> {
  query: string;
  data: T | null;
  loading: boolean;
  error: Error | null;
  updateQuery: (newQuery: string) => void;
  clearSearch: () => void;
  retry: () => void;
  isSearching: boolean;
  hasMore?: boolean;
  loadMore?: () => void;
}

// Context Types
interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>
}

interface SavedMoviesContextType {
  savedMoviesIds: Set<number>;
  savedMovies: SavedMovie[];
  loading: boolean;
  refreshSavedMovies: () => Promise<void>;
  addSavedMovie: (movieId: number) => void;
  removeSavedMovie: (movieId: number) => void;
  isMovieSaved: (movieId: number) => boolean;
}

// Enhanced Component Props with Performance Optimizations
interface LoadingProps {
    message?: string;
    size?: 'small' |'large';
    showBackground?: boolean
    classname?: string;
}

interface ErrorScreenProps {
    error: AppError | Error;
    onRetry?: () => void;
    title?: string;
    icon?: any;
    showLogo?: boolean;
    className?: string;
}

interface EmptyStateProps {
    icon: any;
    title: string;
    subtitle?: string;
    className?: string;
    iconClassName?: string;
    titleClassName?: string;
    subtitleClassName?: string;
}

interface ScreenHeaderProps {
    title?: string;
    subtitle?: string;
    showLogo?: boolean;
    className?: string;
}

// Performance Optimization Types
interface MemoizedComponentProps {
  shouldUpdate?: (prevProps: any, nextProps: any) => boolean;
}

interface VirtualizedListProps {
  getItemLayout?: (data: any, index: number) => {length: number, offset: number, index: number};
  removeClippedSubviews?: boolean;
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  windowSize?: number;
  initialNumToRender?: number;
}

// Cache Management Types
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry?: number;
}

interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number; // Time to live in milliseconds
  enablePersistence?: boolean;
}

// Enhanced Search Types with Pagination
interface PaginatedSearchResult<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  totalResults: number;
  hasMore: boolean;
}

interface SearchPaginationOptions {
  itemsPerPage?: number;
  preloadNextPage?: boolean;
  maxCachedPages?: number;
}

// Network State Types
interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

// Image Loading Types
interface ImageLoadState {
  loading: boolean;
  error: boolean;
  loaded: boolean;
}

// Gesture and Animation Types
interface GestureConfig {
  enableSwipeGestures?: boolean;
  swipeThreshold?: number;
  animationDuration?: number;
}

interface AnimationConfig {
  useNativeDriver?: boolean;
  duration?: number;
  easing?: any;
}

// Analytics and Tracking Types
interface AnalyticsEvent {
  eventName: string;
  parameters?: Record<string, any>;
  timestamp?: number;
}

interface UserInteraction {
  type: 'tap' | 'swipe' | 'scroll' | 'search' | 'save' | 'remove';
  target: string;
  metadata?: Record<string, any>;
}

// State Management Types
interface AppState {
  auth: AuthState;
  movies: MoviesState;
  search: SearchState;
  cache: CacheState;
  network: NetworkState;
}

interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  sessionExpiry: number | null;
}

interface MoviesState {
  trending: TrendingMovie[];
  latest: Movie[];
  saved: SavedMovie[];
  details: Record<string, MovieDetails>;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
}

interface SearchState {
  query: string;
  results: Movie[];
  loading: boolean;
  error: string | null;
  pagination: {
    currentPage: number;
    totalPages: number;
    hasMore: boolean;
  };
  history: string[];
}

interface CacheState {
  entries: Record<string, CacheEntry<any>>;
  size: number;
  lastCleanup: number;
}

// Form and Validation Enhanced Types
interface FormFieldState {
  value: string;
  error: string | null;
  touched: boolean;
  dirty: boolean;
  valid: boolean;
}

interface FormState {
  fields: Record<string, FormFieldState>;
  isValid: boolean;
  isSubmitting: boolean;
  submitCount: number;
  errors: Record<string, string>;
}

// Theme and Styling Types
interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  error: string;
  success: string;
  warning: string;
}

interface ThemeConfig {
  colors: ThemeColors;
  typography: Record<string, any>;
  spacing: Record<string, number>;
  borderRadius: Record<string, number>;
  shadows: Record<string, any>;
}

// Accessibility Types
interface AccessibilityProps {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  accessibilityState?: Record<string, boolean>;
  testID?: string;
}