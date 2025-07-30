// interface.d.ts - Global type declarations

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
  refetch: () => Promise<void>;
  reset: () => void;
};

// Hook Types
interface UseFetchOptions {
  autoFetch?: boolean;
}

interface UseSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
}

// Context Types
interface AuthContextType {
  user: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

interface SavedMoviesContextType {
  savedMoviesIds: Set<number>;
  savedMovies: SavedMovie[];
  refreshSavedMovies: () => Promise<void>;
  addSavedMovie: (movieId: number) => void;
  removeSavedMovie: (movieId: number) => void;
  isMovieSaved: (movieId: number) => boolean;
}

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