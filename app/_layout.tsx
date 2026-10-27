// app/_layout.tsx
import React from 'react';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import migrations from '@/drizzle/migrations';
import { db } from '@/db/client';
import { AuthProvider, useAuth } from '@/context/AuthContext';

function RootNavigator() {
  const { session, isLoading } = useAuth();

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
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ title: 'Iniciar Sesión', headerShown: false }} />
        <Stack.Screen name="registro" options={{ title: 'Crear Cuenta' }} />
      </Stack.Protected>

      <Stack.Protected guard={!!session}>
        <Stack.Screen name="index" options={{ title: 'Mi Tienda', headerShown: false }} />
        <Stack.Screen name="producto" options={{ title: 'Producto' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const isWeb = Platform.OS === 'web';
  const { success, error } = isWeb
    ? { success: true, error: null }
    : useMigrations(db, migrations);

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

