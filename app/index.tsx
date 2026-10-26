// app/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useProducts } from '@/hooks/useProducts';
import { syncProducts } from '@/services/sync';
import type { Product } from '@/db/schema';

export default function IndexScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const {
    products,
    totalUnits,
    totalValue,
    pendingCount,
    deleteProduct,
  } = useProducts(searchQuery);

  const formatCurrency = (amount: number) => {
    return '$' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleSync = async () => {
    if (!user) {
      setSyncStatusMessage({ text: 'No hay usuario autenticado', type: 'error' });
      return;
    }

    setIsSyncing(true);
    setSyncStatusMessage({ text: 'Sincronizando con Supabase...', type: 'info' });

    const result = await syncProducts(user.id);
    setIsSyncing(false);

    if (result.success) {
      setSyncStatusMessage({
        text: `Sincronización exitosa: ${result.message}`,
        type: 'success',
      });
    } else {
      setSyncStatusMessage({
        text: `Error de sincronización: ${result.message}`,
        type: 'error',
      });
    }
  };

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: '/producto',
      params: { id: product.id.toString() },
    });
  };

  const handleProductLongPress = (product: Product) => {
    Alert.alert(
      'Eliminar producto',
      `¿Estás seguro de que deseas eliminar "${product.name}" del inventario?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(product.id);
            } catch (err: any) {
              Alert.alert('Error', 'No se pudo eliminar el producto: ' + err.message);
            }
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Cerrar sesión', '¿Deseas cerrar tu sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await signOut();
        },
      },
    ]);
  };

  const isPending = (p: Product) => {
    return !p.syncedAt || p.syncedAt.getTime() < p.updatedAt.getTime();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Barra superior con título y botón de salir */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.appName}>Mi Tienda</Text>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user?.email || 'Tendero'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        {/* Tarjetas de Resumen / Totales */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Unidades</Text>
            <Text style={styles.summaryValue}>{totalUnits}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Valor Total</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalValue)}</Text>
          </View>
          <View
            style={[
              styles.summaryCard,
              pendingCount > 0 ? styles.summaryCardWarning : styles.summaryCardSuccess,
            ]}
          >
            <Text style={styles.summaryLabel}>Pendientes</Text>
            <Text
              style={[
                styles.summaryValue,
                pendingCount > 0 ? styles.summaryValueWarning : styles.summaryValueSuccess,
              ]}
            >
              {pendingCount}
            </Text>
          </View>
        </View>

        {/* Botones de acción principales: Sincronizar y Agregar */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.syncButton, isSyncing && styles.btnDisabled]}
            onPress={handleSync}
            disabled={isSyncing}
            activeOpacity={0.8}
          >
            {isSyncing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.syncButtonText}>🔄 Sincronizar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/producto')}
            activeOpacity={0.8}
          >
            <Text style={styles.addButtonText}>➕ Nuevo Producto</Text>
          </TouchableOpacity>
        </View>

        {/* Mensaje de estado de sincronización */}
        {syncStatusMessage && (
          <View
            style={[
              styles.statusBanner,
              syncStatusMessage.type === 'success' && styles.statusSuccess,
              syncStatusMessage.type === 'error' && styles.statusError,
              syncStatusMessage.type === 'info' && styles.statusInfo,
            ]}
          >
            <Text
              style={[
                styles.statusBannerText,
                syncStatusMessage.type === 'success' && styles.textSuccess,
                syncStatusMessage.type === 'error' && styles.textError,
                syncStatusMessage.type === 'info' && styles.textInfo,
              ]}
            >
              {syncStatusMessage.text}
            </Text>
          </View>
        )}

        {/* Barra de Búsqueda (Punto extra) */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="🔍 Buscar producto por nombre..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Lista de productos */}
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No hay productos registrados</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'No se encontraron productos con ese nombre.'
                  : 'Toca "➕ Nuevo Producto" para añadir el primero.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const pending = isPending(item);
            return (
              <TouchableOpacity
                style={styles.productCard}
                onPress={() => handleProductPress(item)}
                onLongPress={() => handleProductLongPress(item)}
                activeOpacity={0.7}
              >
                <View style={styles.productHeader}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <View
                    style={[
                      styles.syncBadge,
                      pending ? styles.badgePending : styles.badgeSynced,
                    ]}
                  >
                    <Text
                      style={[
                        styles.syncBadgeText,
                        pending ? styles.badgePendingText : styles.badgeSyncedText,
                      ]}
                    >
                      {pending ? '⏳ Pendiente' : '☁️ En la nube'}
                    </Text>
                  </View>
                </View>

                <View style={styles.productDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Cantidad:</Text>
                    <Text style={styles.detailValue}>{item.quantity} uds</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Precio unitario:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(item.price)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Subtotal:</Text>
                    <Text style={styles.detailTotal}>
                      {formatCurrency(item.quantity * item.price)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.hintText}>
                  Toca para editar • Mantén presionado para eliminar
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0284c7',
  },
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  userEmail: {
    fontSize: 12,
    color: '#bae6fd',
    maxWidth: 200,
  },
  logoutBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryCardWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
    borderWidth: 1,
  },
  summaryCardSuccess: {
    backgroundColor: '#f0fdf4',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  summaryValueWarning: {
    color: '#b45309',
  },
  summaryValueSuccess: {
    color: '#15803d',
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 8,
  },
  syncButton: {
    flex: 1,
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  btnDisabled: {
    opacity: 0.7,
  },
  statusBanner: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  statusError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statusInfo: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  statusBannerText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  textSuccess: {
    color: '#166534',
  },
  textError: {
    color: '#991b1b',
  },
  textInfo: {
    color: '#1e40af',
  },
  searchContainer: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1e293b',
  },
  listContent: {
    padding: 12,
    paddingBottom: 32,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgePending: {
    backgroundColor: '#fef3c7',
  },
  badgeSynced: {
    backgroundColor: '#dcfce7',
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgePendingText: {
    color: '#b45309',
  },
  badgeSyncedText: {
    color: '#15803d',
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  detailTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0284c7',
  },
  hintText: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#475569',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
