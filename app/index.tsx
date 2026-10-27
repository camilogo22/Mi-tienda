// app/index.tsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useProducts } from '@/hooks/useProducts';
import { useAutoSync } from '@/hooks/useAutoSync';
import { syncProducts } from '@/services/sync';
import { productsRepo } from '@/db/repositories/products';
import type { Product } from '@/db/schema';

type FilterType = 'todos' | 'pendientes' | 'nube';

export default function IndexScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('todos');
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

  // Asegura productos iniciales de ejemplo si no existen registros
  useEffect(() => {
    productsRepo.ensureSampleProducts().catch((e) => console.log('Inicialización:', e));
  }, []);

  // Sincronización automática al recuperar la conexión a internet
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
    return '$' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' pesos';
  };

  const isPending = (p: Product) => {
    return !p.syncedAt || p.syncedAt.getTime() < p.updatedAt.getTime();
  };

  // Filtrado avanzado combinado (búsqueda por texto + filtro rápido)
  const displayProducts = useMemo(() => {
    return products.filter((p) => {
      if (activeFilter === 'pendientes') return isPending(p);
      if (activeFilter === 'nube') return !isPending(p);
      return true;
    });
  }, [products, activeFilter]);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Cabecera Principal */}
        <View style={styles.topHeader}>
          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Ionicons name="storefront" size={24} color="#ffffff" />
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
            <Ionicons name="log-out-outline" size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.logoutButtonText}>Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Tarjetas de Métricas de Inventario */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <Ionicons name="cube-outline" size={14} color="#0284c7" />
              <Text style={styles.metricLabel}>Stock</Text>
            </View>
            <Text style={styles.metricNumber}>{totalUnits}</Text>
            <Text style={styles.metricFoot}>{allProducts.length} productos</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={styles.metricHeaderRow}>
              <Ionicons name="cash-outline" size={14} color="#16a34a" />
              <Text style={styles.metricLabel}>Valor Total</Text>
            </View>
            <Text style={styles.metricNumberValue}>
              {'$' + totalValue.toLocaleString('es-CO')}
            </Text>
            <Text style={styles.metricFoot}>En pesos</Text>
          </View>

          <View
            style={[
              styles.metricCard,
              pendingCount > 0 ? styles.metricPendingAlert : styles.metricSyncedOk,
            ]}
          >
            <View style={styles.metricHeaderRow}>
              <Ionicons
                name={pendingCount > 0 ? 'cloud-upload-outline' : 'checkmark-done-circle-outline'}
                size={14}
                color={pendingCount > 0 ? '#b45309' : '#15803d'}
              />
              <Text style={styles.metricLabel}>Pendientes</Text>
            </View>
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

        {/* Botones Principales de Sincronización y Nuevo Producto */}
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
              <View style={styles.btnContentRow}>
                <Ionicons name="sync" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.syncBtnText}>Sincronizar</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push('/producto')}
            activeOpacity={0.8}
          >
            <View style={styles.btnContentRow}>
              <Ionicons name="add-circle" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.addBtnText}>Nuevo producto</Text>
            </View>
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
            <Ionicons
              name={
                syncStatusMessage.type === 'success'
                  ? 'checkmark-circle'
                  : syncStatusMessage.type === 'error'
                  ? 'alert-circle'
                  : 'information-circle'
              }
              size={18}
              color={
                syncStatusMessage.type === 'success'
                  ? '#15803d'
                  : syncStatusMessage.type === 'error'
                  ? '#b91c1c'
                  : '#0369a1'
              }
              style={{ marginRight: 8 }}
            />
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

        {/* Barra de Búsqueda Mejorada */}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre (ej. arroz, aceite, leche)..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filtros rápidos: Todos / Pendientes / En la nube */}
          <View style={styles.filterTabsRow}>
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'todos' && styles.filterChipActive]}
              onPress={() => setActiveFilter('todos')}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === 'todos' && styles.filterChipTextActive,
                ]}
              >
                Todos ({products.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === 'pendientes' && styles.filterChipActiveWarning,
              ]}
              onPress={() => setActiveFilter('pendientes')}
            >
              <Ionicons
                name="time-outline"
                size={12}
                color={activeFilter === 'pendientes' ? '#b45309' : '#64748b'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === 'pendientes' && styles.filterChipTextWarning,
                ]}
              >
                Pendientes ({pendingCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === 'nube' && styles.filterChipActiveSuccess,
              ]}
              onPress={() => setActiveFilter('nube')}
            >
              <Ionicons
                name="cloud-done-outline"
                size={12}
                color={activeFilter === 'nube' ? '#15803d' : '#64748b'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === 'nube' && styles.filterChipTextSuccess,
                ]}
              >
                En la nube ({allProducts.length - pendingCount})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista de Productos con Scroll Reactivo */}
        <FlatList
          data={displayProducts}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isSyncing} onRefresh={handleSync} />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="cube-outline" size={48} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyHeading}>
                {searchQuery || activeFilter !== 'todos'
                  ? 'No se encontraron productos'
                  : 'Inventario vacío'}
              </Text>
              <Text style={styles.emptyDetails}>
                {searchQuery
                  ? `No hay coincidencias para "${searchQuery}" con el filtro actual.`
                  : 'Presiona "Nuevo producto" para registrar existencias en la tienda.'}
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
                    <Ionicons
                      name={pending ? 'time-outline' : 'cloud-done'}
                      size={12}
                      color={pending ? '#b45309' : '#15803d'}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        pending ? styles.pillPendingText : styles.pillSyncedText,
                      ]}
                    >
                      {pending ? 'Pendiente' : 'En la nube'}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardSpecs}>
                  <View style={styles.specBox}>
                    <Text style={styles.specLabel}>Existencias</Text>
                    <Text style={styles.specValue}>{item.quantity} uds</Text>
                  </View>
                  <View style={styles.specBox}>
                    <Text style={styles.specLabel}>Precio unitario</Text>
                    <Text style={styles.specValue}>
                      {'$' + item.price.toLocaleString('es-CO')}
                    </Text>
                  </View>
                  <View style={styles.specBox}>
                    <Text style={styles.specLabel}>Subtotal</Text>
                    <Text style={styles.specTotal}>
                      {'$' + (item.quantity * item.price).toLocaleString('es-CO')}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActionsFooter}>
                  <View style={styles.hintWithIcon}>
                    <Ionicons name="create-outline" size={13} color="#94a3b8" style={{ marginRight: 4 }} />
                    <Text style={styles.actionPrompt}>Toca para editar · Mantén presionado para borrar</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleProductDelete(item)}
                    style={styles.deleteMiniBtn}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="trash-outline" size={14} color="#dc2626" />
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  metricsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 6,
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
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metricHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  metricPendingAlert: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  metricSyncedOk: {
    backgroundColor: '#f0fdf4',
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
    marginVertical: 1,
  },
  metricNumberValue: {
    fontSize: 13,
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
    paddingVertical: 8,
    gap: 10,
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
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  statusNotice: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flex: 1,
    fontSize: 13,
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
  searchSection: {
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  filterTabsRow: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  filterChipActiveWarning: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  filterChipActiveSuccess: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  filterChipTextWarning: {
    color: '#92400e',
  },
  filterChipTextSuccess: {
    color: '#166534',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  hintWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionPrompt: {
    fontSize: 11,
    color: '#94a3b8',
  },
  deleteMiniBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fee2e2',
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
