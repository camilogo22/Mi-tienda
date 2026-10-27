// app/index.tsx
import React, { useState, useCallback, useEffect } from 'react';
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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useProducts } from '@/hooks/useProducts';
import { useAutoSync } from '@/hooks/useAutoSync';
import { syncProducts } from '@/services/sync';
import { productsRepo } from '@/db/repositories/products';
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
    allProducts,
    totalUnits,
    totalValue,
    pendingCount,
    deleteProduct,
  } = useProducts(searchQuery);

  // Asegura productos de ejemplo si la lista está vacía
  useEffect(() => {
    productsRepo.ensureSampleProducts().catch((e) => console.log('Inicialización:', e));
  }, []);

  // Sincronización automática al recuperar conexión
  useAutoSync(
    user?.id,
    useCallback((result) => {
      setSyncStatusMessage({
        text: `Sincronización automática: ${result.message}`,
        type: 'success',
      });
    }, [])
  );

  const formatCurrency = (amount: number) => {
    return '$' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const handleSync = async () => {
    if (!user) {
      setSyncStatusMessage({ text: 'No hay usuario autenticado', type: 'error' });
      return;
    }

    setIsSyncing(true);
    setSyncStatusMessage({ text: 'Sincronizando con la nube de Supabase...', type: 'info' });

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

  const handleProductDelete = (product: Product) => {
    const confirmDelete = async () => {
      try {
        await deleteProduct(product.id);
        setSyncStatusMessage({
          text: `"${product.name}" eliminado del inventario`,
          type: 'info',
        });
      } catch (err: any) {
        Alert.alert('Error', 'No se pudo eliminar el producto: ' + err.message);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`¿Deseas eliminar "${product.name}" del inventario?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Eliminar producto',
        `¿Deseas eliminar "${product.name}" del inventario?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: confirmDelete },
        ]
      );
    }
  };

  const handleSignOut = () => {
    const performLogout = async () => {
      await signOut();
    };

    if (Platform.OS === 'web') {
      if (window.confirm('¿Deseas cerrar tu sesión?')) {
        performLogout();
      }
    } else {
      Alert.alert('Cerrar sesión', '¿Deseas salir de la aplicación?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', style: 'destructive', onPress: performLogout },
      ]);
    }
  };

  const isPending = (p: Product) => {
    return !p.syncedAt || p.syncedAt.getTime() < p.updatedAt.getTime();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Cabecera Principal */}
        <View style={styles.topHeader}>
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.brandTitle}>Mi Tienda</Text>
              <View style={styles.onlinePill}>
                <View style={styles.greenDot} />
                <Text style={styles.onlinePillText}>Base local activa</Text>
              </View>
            </View>
            <Text style={styles.userSubtitle} numberOfLines={1}>
              {user?.email || 'Usuario tendero'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutButtonText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        {/* Tarjetas de Estadísticas */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total unidades</Text>
            <Text style={styles.metricNumber}>{totalUnits}</Text>
            <Text style={styles.metricFoot}>{allProducts.length} registros</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Valor inventario</Text>
            <Text style={styles.metricNumberValue}>
              {formatCurrency(totalValue)}
            </Text>
            <Text style={styles.metricFoot}>Total en pesos</Text>
          </View>

          <View
            style={[
              styles.metricCard,
              pendingCount > 0 ? styles.metricPendingAlert : styles.metricSyncedOk,
            ]}
          >
            <Text style={styles.metricLabel}>Pendientes</Text>
            <Text
              style={[
                styles.metricNumber,
                pendingCount > 0 ? styles.pendingTextAlert : styles.syncedTextOk,
              ]}
            >
              {pendingCount}
            </Text>
            <Text style={styles.metricFoot}>
              {pendingCount > 0 ? 'Por respaldar' : 'Al día en nube'}
            </Text>
          </View>
        </View>

        {/* Botones de Acción */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.syncBtn, isSyncing && styles.btnDisabled]}
            onPress={handleSync}
            disabled={isSyncing}
            activeOpacity={0.8}
          >
            {isSyncing ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.syncBtnText}>[⟳] Sincronizar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/producto')}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnText}>[+] Nuevo producto</Text>
          </TouchableOpacity>
        </View>

        {/* Banner de Estado de Sincronización */}
        {syncStatusMessage && (
          <View
            style={[
              styles.statusNotice,
              syncStatusMessage.type === 'success' && styles.statusSuccess,
              syncStatusMessage.type === 'error' && styles.statusError,
              syncStatusMessage.type === 'info' && styles.statusInfo,
            ]}
          >
            <Text
              style={[
                styles.statusNoticeText,
                syncStatusMessage.type === 'success' && styles.textSuccess,
                syncStatusMessage.type === 'error' && styles.textError,
                syncStatusMessage.type === 'info' && styles.textInfo,
              ]}
            >
              {syncStatusMessage.text}
            </Text>
          </View>
        )}

        {/* Barra de Búsqueda */}
        <View style={styles.searchWrap}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>[Búsqueda]</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Escribe el nombre del producto..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearch}>[X]</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Lista de Productos */}
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isSyncing} onRefresh={handleSync} />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyHeading}>
                {searchQuery ? 'Sin resultados para la búsqueda' : 'No hay productos en inventario'}
              </Text>
              <Text style={styles.emptyDetails}>
                {searchQuery
                  ? `No se encontró ningún producto que coincida con "${searchQuery}".`
                  : 'Presiona "[+] Nuevo producto" para registrar existencias.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const pending = isPending(item);
            return (
              <TouchableOpacity
                style={styles.cardItem}
                onPress={() => handleProductPress(item)}
                onLongPress={() => handleProductDelete(item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.productTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      pending ? styles.pillPending : styles.pillSynced,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        pending ? styles.pillPendingText : styles.pillSyncedText,
                      ]}
                    >
                      {pending ? '● Pendiente' : '● En la nube'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardSpecs}>
                  <View style={styles.specBox}>
                    <Text style={styles.specLabel}>Existencias</Text>
                    <Text style={styles.specValue}>{item.quantity} unidades</Text>
                  </View>
                  <View style={styles.specBox}>
                    <Text style={styles.specLabel}>Precio unitario</Text>
                    <Text style={styles.specValue}>{formatCurrency(item.price)}</Text>
                  </View>
                  <View style={styles.specBox}>
                    <Text style={styles.specLabel}>Valor total</Text>
                    <Text style={styles.specTotal}>
                      {formatCurrency(item.quantity * item.price)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActionsFooter}>
                  <Text style={styles.actionPrompt}>
                    Toca para editar · Mantén presionado para borrar
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleProductDelete(item)}
                    style={styles.deleteMiniBtn}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.deleteMiniText}>[Borrar]</Text>
                  </TouchableOpacity>
                </View>
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
    backgroundColor: '#f8fafc',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 5,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ade80',
  },
  onlinePillText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  userSubtitle: {
    fontSize: 12,
    color: '#e0f2fe',
    marginTop: 2,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  metricsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  metricPendingAlert: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  metricSyncedOk: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginVertical: 2,
  },
  metricNumberValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0284c7',
    marginVertical: 2,
  },
  metricFoot: {
    fontSize: 10,
    color: '#94a3b8',
  },
  pendingTextAlert: {
    color: '#b45309',
  },
  syncedTextOk: {
    color: '#15803d',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 8,
  },
  syncBtn: {
    flex: 1,
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  syncBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  addBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  statusNotice: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  statusError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  statusInfo: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  statusNoticeText: {
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '600',
  },
  textSuccess: {
    color: '#15803d',
  },
  textError: {
    color: '#b91c1c',
  },
  textInfo: {
    color: '#0369a1',
  },
  searchWrap: {
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  clearSearch: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    paddingHorizontal: 4,
  },
  listContainer: {
    padding: 12,
    paddingBottom: 40,
  },
  cardItem: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  productTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillPending: {
    backgroundColor: '#fef3c7',
  },
  pillSynced: {
    backgroundColor: '#dcfce7',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pillPendingText: {
    color: '#b45309',
  },
  pillSyncedText: {
    color: '#15803d',
  },
  cardSpecs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  specBox: {
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  specTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0284c7',
  },
  cardActionsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  actionPrompt: {
    fontSize: 11,
    color: '#94a3b8',
  },
  deleteMiniBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: '#fee2e2',
  },
  deleteMiniText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#334155',
    marginBottom: 6,
  },
  emptyDetails: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
