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

// Enhanced Hook Options
interface UseFetchOptions {
  autoFetch?: boolean;
  cacheKey?: string;
  cacheDuration?: number;
  enableRetry?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  retryBackoff?: number;
  staleTime?: number;
  backgroundRefetch?: boolean;
  dedupe?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: AppError) => void;
  onStaleData?: (data: any) => void;
}

interface UseSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  cacheResults?: boolean;
  enableRetry?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheTTL?: number;
  onSuccess?: (data: any, query: string) => void;
  onError?: (error: Error, query: string) => void;
  backgroundRefetch?: boolean;
  maxConcurrentRequests?: number;
}

// Enhanced Hook Return Types
interface AsyncOperation<T> {
  data: T | null;
  loading: boolean;
  error: AppError | null;
  refetch: (bypassCache?: boolean) => Promise<void>;
  reset: () => void;
  isStale?: boolean;
  lastFetched?: number;
  refetchInBackground?: () => Promise<void>;
  clearCache?: () => void;
}

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
  clearCache?: () => void;
  getCachedQueries?: () => string[];
  getSimilarQueries?: (query: string) => string[];
  cancelSearch?: () => void;
}

// Cache Management Types
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  isStale?: boolean;
}

interface CacheOptions {
  maxSize?: number;
  defaultTTL?: number;
  enablePersistence?: boolean;
  staleTime?: number;
}

interface CacheStats {
  size: number;
  keys: string[];
  entries: Array<{
    key: string;
    timestamp: number;
    expiry: number;
    isStale: boolean;
    age: number;
  }>;
}

// Request Configuration Types
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

interface RequestOptions extends RequestInit {
  retryConfig?: Partial<RetryConfig>;
  cacheKey?: string;
  cacheTTL?: number;
  staleTime?: number;
  enableCache?: boolean;
  enableRetry?: boolean;
}

// Search Cache Types
interface SearchCacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  query: string;
}

// Network State and Performance Types
interface NetworkMonitor {
  isOnline: boolean;
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

interface RequestMetrics {
  duration: number;
  retryCount: number;
  cacheHit: boolean;
  size: number;
  url: string;
  method: string;
  status?: number;
}

// Error Types with Enhanced Information
interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
  retryable?: boolean;
  timestamp?: number;
  requestId?: string;
}

declare class APIError extends Error implements AppError {
  code?: string;
  statusCode?: number;
  details?: any;
  retryable?: boolean;
  timestamp?: number;
  requestId?: string;

  constructor(
    message: string, 
    code?: string, 
    statusCode?: number, 
    details?: any,
    retryable?: boolean
  );
}

declare class AuthError extends Error implements AppError {
  code?: string;
  details?: any;
  timestamp?: number;

  constructor(message: string, code?: string, details?: any);
}

// Component Props Types (existing)
interface TrendingCardProps {
  movie: TrendingMovie;
  index: number;
}

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

// Enhanced Loading and Error States
interface LoadingState {
  isLoading: boolean;
  error: AppError | null;
  progress?: number;
  message?: string;
}

interface LoadingProps {
  message?: string;
  size?: 'small' | 'large';
  showBackground?: boolean;
  className?: string;
  progress?: number;
}

interface ErrorScreenProps {
  error: AppError | Error;
  onRetry?: () => void;
  title?: string;
  icon?: any;
  showLogo?: boolean;
  className?: string;
  showDetails?: boolean;
}

interface EmptyStateProps {
  icon: any;
  title: string;
  subtitle?: string;
  className?: string;
  iconClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  className?: string;
  rightComponent?: React.ReactNode;
}

// Context Types with Enhanced Features
interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
  sessionExpiry?: Date;
  lastActivity?: Date;
}

interface SavedMoviesContextType {
  savedMoviesIds: Set<number>;
  savedMovies: SavedMovie[];
  loading: boolean;
  refreshSavedMovies: () => Promise<void>;
  addSavedMovie: (movieId: number) => void;
  removeSavedMovie: (movieId: number) => void;
  isMovieSaved: (movieId: number) => boolean;
  clearAllSavedMovies: () => Promise<void>;
  syncStatus: 'idle' | 'syncing' | 'error';
}

// Global Utility Function Declarations
declare function createAPIError(
  message: string,
  statusCode?: number,
  code?: string,
  details?: any,
  retryable?: boolean
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

// Performance and Analytics Types
interface PerformanceMetrics {
  renderTime: number;
  apiLatency: number;
  cacheHitRate: number;
  errorRate: number;
  retryRate: number;
}

interface AnalyticsEvent {
  eventName: string;
  parameters?: Record<string, any>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

interface UserInteraction {
  type: 'tap' | 'swipe' | 'scroll' | 'search' | 'save' | 'remove';
  target: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

// Advanced State Management
interface AppState {
  auth: AuthState;
  movies: MoviesState;
  search: SearchState;
  cache: CacheState;
  network: NetworkState;
  performance: PerformanceState;
}

interface AuthState {
  user: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  sessionExpiry: number | null;
  lastActivity: number | null;
}

interface MoviesState {
  trending: TrendingMovie[];
  latest: Movie[];
  saved: SavedMovie[];
  details: Record<string, MovieDetails>;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
  lastUpdated: Record<string, number>;
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
  suggestions: string[];
  recentQueries: string[];
}

interface CacheState {
  entries: Record<string, CacheEntry<any>>;
  size: number;
  lastCleanup: number;
  hitRate: number;
  missRate: number;
}

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  effectiveType: string | null;
  downlink: number;
  rtt: number;
}

interface PerformanceState {
  metrics: PerformanceMetrics;
  monitoring: boolean;
  alerts: string[];
}

// Form and Validation Types
interface FormFieldState {
  value: string;
  error: string | null;
  touched: boolean;
  dirty: boolean;
  valid: boolean;
  validating?: boolean;
}

interface FormState {
  fields: Record<string, FormFieldState>;
  isValid: boolean;
  isSubmitting: boolean;
  submitCount: number;
  errors: Record<string, string>;
  isDirty: boolean;
  isValidating: boolean;
}

// Theme and Accessibility
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

interface AccessibilityProps {
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  accessibilityState?: Record<string, boolean>;
  testID?: string;
}

//  enhanced pagination response
interface PaginatedMoviesResponse {
    movies: Movie[];
    pagination: {
        currentPage: number;
        totalPages: number;
        totalResults: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
}

interface PaginationState {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    hasNextPage: boolean;
    loadingMore: boolean;
}