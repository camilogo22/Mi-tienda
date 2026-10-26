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
        Alert.alert('Error', 'No se encontró el producto a editar.', [
          { text: 'Aceptar', onPress: () => router.back() },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Error al cargar el producto: ' + err.message);
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
    if (quantity.trim() === '' || isNaN(parsedQuantity) || !Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
      setErrorMessage('La cantidad debe ser un número entero mayor o igual a 0.');
      return;
    }

    const parsedPrice = Number(price.trim());
    if (price.trim() === '' || isNaN(parsedPrice) || !Number.isInteger(parsedPrice) || parsedPrice < 0) {
      setErrorMessage('El precio debe ser un número entero mayor o igual a 0 (en pesos, sin decimales).');
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
      setErrorMessage('Error al guardar el producto: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsSubmitting(false);
    }
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
          <Text style={styles.title}>
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </Text>
          <Text style={styles.subtitle}>
            {isEditing
              ? 'Modifica los datos del producto en el inventario'
              : 'Registra un nuevo producto para tu tienda'}
          </Text>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre del producto *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Arroz Diana 1kg, Leche entera, Harina PAN"
              placeholderTextColor="#94a3b8"
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cantidad en existencia *</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              value={quantity}
              onChangeText={setQuantity}
            />
            <Text style={styles.helperText}>Unidades enteras mayores o iguales a 0</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Precio en pesos (COP) *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. 4500"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              value={price}
              onChangeText={setPrice}
            />
            <Text style={styles.helperText}>Sin puntos ni comas ni decimales</Text>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.saveButton, isSubmitting && styles.btnDisabled]}
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isEditing ? 'Actualizar Producto' : 'Guardar Producto'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
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
    padding: 20,
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
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  helperText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  buttonGroup: {
    marginTop: 10,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
  btnDisabled: {
    opacity: 0.7,
  },
});
