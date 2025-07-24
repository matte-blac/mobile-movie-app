import { AuthProvider } from "@/context/AuthContext";
import { SavedMoviesProvider } from "@/context/SavedMoviesContext";
import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import './globals.css';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SavedMoviesProvider>
        <StatusBar hidden={true} />
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="movies/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="login"
          options={{ headerShown: false }}
        />
      </Stack>
      </SavedMoviesProvider>
    </AuthProvider>
  )
}
