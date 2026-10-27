// app/_layout.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useDatabaseMigrations } from '@/hooks/useDatabaseMigrations';
import { AuthProvider, useAuth } from '@/context/AuthContext';

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const currentSegment = segments[0] as string | undefined;
    const isAuthRoute = currentSegment === 'login' || currentSegment === 'registro';

    if (!session && !isAuthRoute) {
      router.replace('/login');
    } else if (session && (isAuthRoute || !currentSegment)) {
      router.replace('/');
    }
  }, [session, segments, isLoading, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0284c7' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerBackTitle: 'Volver',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Mi Tienda', headerShown: false }} />
      <Stack.Screen name="producto" options={{ title: 'Producto' }} />
      <Stack.Screen name="login" options={{ title: 'Iniciar Sesión', headerShown: false }} />
      <Stack.Screen name="registro" options={{ title: 'Crear Cuenta' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const { success, error } = useDatabaseMigrations();

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Text style={{ color: '#dc2626', fontSize: 18, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
          Error en base de datos local
        </Text>
        <Text style={{ color: '#991b1b', fontSize: 14, textAlign: 'center' }}>
          {error.message}
        </Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={{ marginTop: 12, color: '#64748b', fontSize: 14 }}>
          Iniciando base de datos local...
        </Text>
      </View>
    );
  }

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </AuthProvider>
  );
}
