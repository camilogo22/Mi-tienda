// app/producto.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useProducts } from '@/hooks/useProducts';

export default function ProductoFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = Boolean(id);

  const { createProduct, updateProduct, getProductById } = useProducts();

  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      loadProduct(Number(id));
    }
  }, [id]);

  const loadProduct = async (productId: number) => {
    setIsLoading(true);
    try {
      const prod = await getProductById(productId);
      if (prod) {
        setName(prod.name);
        setQuantity(prod.quantity.toString());
        setPrice(prod.price.toString());
      } else {
        const errorMsg = 'No se encontró el producto a editar.';
        if (Platform.OS === 'web') {
          window.alert(errorMsg);
          router.back();
        } else {
          Alert.alert('Error', errorMsg, [
            { text: 'Aceptar', onPress: () => router.back() },
          ]);
        }
      }
    } catch (err: any) {
      if (Platform.OS === 'web') {
        window.alert('Error al cargar el producto: ' + err.message);
      } else {
        Alert.alert('Error', 'Error al cargar el producto: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('El nombre del producto es obligatorio.');
      return;
    }

    const parsedQuantity = Number(quantity.trim());
    if (
      quantity.trim() === '' ||
      isNaN(parsedQuantity) ||
      !Number.isInteger(parsedQuantity) ||
      parsedQuantity < 0
    ) {
      setErrorMessage('La cantidad debe ser un número entero mayor o igual a 0.');
      return;
    }

    const parsedPrice = Number(price.trim());
    if (
      price.trim() === '' ||
      isNaN(parsedPrice) ||
      !Number.isInteger(parsedPrice) ||
      parsedPrice < 0
    ) {
      setErrorMessage(
        'El precio debe ser un número entero mayor o igual a 0 (en pesos, sin decimales).'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditing && id) {
        await updateProduct(Number(id), {
          name: trimmedName,
          quantity: parsedQuantity,
          price: parsedPrice,
        });
      } else {
        await createProduct({
          name: trimmedName,
          quantity: parsedQuantity,
          price: parsedPrice,
        });
      }
      router.back();
    } catch (err: any) {
      setErrorMessage('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const calcSubtotal = () => {
    const q = Number(quantity);
    const p = Number(price);
    if (!isNaN(q) && !isNaN(p) && q >= 0 && p >= 0) {
      return (q * p).toLocaleString('es-CO');
    }
    return '0';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Cargando datos del producto...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.badgeRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>
                {isEditing ? 'Edición de inventario' : 'Alta de producto'}
              </Text>
            </View>
          </View>

          <Text style={styles.formTitle}>
            {isEditing ? 'Editar producto' : 'Nuevo producto'}
          </Text>
          <Text style={styles.formSubtitle}>
            {isEditing
              ? 'Actualiza los datos del producto existente en la tienda'
              : 'Registra un producto para llevar control del stock y precio'}
          </Text>

          {errorMessage ? (
            <View style={styles.alertBox}>
              <Text style={styles.alertBadge}>[Error]</Text>
              <Text style={styles.alertText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.fieldLabel}>Nombre del producto *</Text>
            <TextInput
              style={styles.inputControl}
              placeholder="Ejemplo: Arroz Diana 1kg, Aceite Premier, Leche entera"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.twoColRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Cantidad (unidades) *</Text>
              <TextInput
                style={styles.inputControl}
                placeholder="0"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                value={quantity}
                onChangeText={setQuantity}
              />
              <Text style={styles.fieldHint}>Mayor o igual a 0</Text>
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>Precio en pesos *</Text>
              <TextInput
                style={styles.inputControl}
                placeholder="4500"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                value={price}
                onChangeText={setPrice}
              />
              <Text style={styles.fieldHint}>Sin puntos ni comas</Text>
            </View>
          </View>

          {/* Tarjeta de Cálculo */}
          <View style={styles.calcSummaryBox}>
            <Text style={styles.calcLabel}>Valor en existencia calculado:</Text>
            <Text style={styles.calcValue}>${calcSubtotal()} pesos</Text>
          </View>

          <View style={styles.actionButtonGroup}>
            <TouchableOpacity
              style={[styles.primarySaveBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primarySaveBtnText}>
                  {isEditing ? 'Actualizar producto' : 'Guardar en inventario'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => router.back()}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  categoryPill: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  categoryPillText: {
    color: '#0369a1',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 18,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  alertBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#b91c1c',
  },
  alertText: {
    flex: 1,
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputControl: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  fieldHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  calcSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  calcLabel: {
    fontSize: 13,
    color: '#0369a1',
    fontWeight: '600',
  },
  calcValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0284c7',
  },
  actionButtonGroup: {
    gap: 10,
  },
  primarySaveBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  primarySaveBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelBtn: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
