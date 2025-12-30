import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  TextInput, // Yeni: IP girmek için eklendi
} from 'react-native';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';

export default function App() {
  // --- STATE ---
  const [photo, setPhoto] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // YENİ: IP Adresi artık bir değişken (State)
  // Varsayılan olarak senin son IP'ni koydum, ama değiştirebilirsin.
  const [serverIp, setServerIp] = useState('192.168.1.25');

  // Helper: Tam URL oluşturucu (http://IP:5000)
  const getServerUrl = () => {
    // Kullanıcı http yazdı mı kontrol et, yazmadıysa ekle
    let ip = serverIp.trim();
    if (!ip.startsWith('http')) {
      ip = `http://${ip}`;
    }
    // Port numarası (5000) yoksa ekle (Basit kontrol)
    if (!ip.includes(':')) {
      ip = `${ip}:5000`;
    }
    return ip;
  };

  // Fotoğraf Seçme
  const handleSelectPhoto = (type: 'camera' | 'library') => {
    const options = {
      mediaType: 'photo' as const,
      quality: 1,
      saveToPhotos: true,
    };

    const callback = (response: any) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        Alert.alert('Hata', response.errorMessage);
        return;
      }
      if (response.assets && response.assets.length > 0) {
        setPhoto(response.assets[0]);
        setResult(null); 
      }
    };

    if (type === 'camera') launchCamera(options as any, callback);
    else launchImageLibrary(options as any, callback);
  };

  // Analiz Etme
  const handleAnalyze = async () => {
    if (!photo) {
      Alert.alert('Uyarı', 'Lütfen önce bir fotoğraf seçin.');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'ios' ? photo.uri?.replace('file://', '') : photo.uri,
      type: photo.type,
      name: photo.fileName || 'test_image.jpg',
    });

    // Dinamik URL kullanıyoruz
    const targetUrl = `${getServerUrl()}/analyze`;
    console.log("İstek Gönderiliyor:", targetUrl);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();
      console.log("Cevap Geldi:", data);

      if (data.success) {
        setResult(data);
        if (data.warning) {
          Alert.alert("Dikkat", data.warning);
        }
      } else {
        setResult(null);
        Alert.alert("Analiz Hatası", data.error || "Bilinmeyen hata.");
      }

    } catch (error) {
      Alert.alert("Bağlantı Hatası", `Sunucuya ulaşılamadı.\nAdres: ${targetUrl}\nIP adresini kontrol et.`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        <Text style={styles.header}>LFA Analiz V17.5</Text>

        {/* --- YENİ: IP ADRESİ AYARI --- */}
        <View style={styles.ipContainer}>
          <Text style={styles.ipLabel}>Sunucu IP Adresi:</Text>
          <TextInput
            style={styles.ipInput}
            value={serverIp}
            onChangeText={setServerIp}
            placeholder="Örn: 192.168.1.25"
            keyboardType="numeric" // Telefondan kolay giriş için
          />
        </View>

        {/* FOTOĞRAF ALANI */}
        <View style={styles.imageContainer}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.previewImage} resizeMode="contain" />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Fotoğraf Seçilmedi</Text>
            </View>
          )}
        </View>

        {/* BUTONLAR */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => handleSelectPhoto('camera')}>
            <Text style={styles.btnText}>📸 Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => handleSelectPhoto('library')}>
            <Text style={styles.btnText}>🖼️ Galeri</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.btnPrimary, loading && styles.btnDisabled]} 
          onPress={handleAnalyze}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnTextPrimary}>ANALİZ BAŞLAT</Text>}
        </TouchableOpacity>

        {/* --- SONUÇ KARTI --- */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Sonuç: {parseFloat(result.ratio).toFixed(4)}</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.label}>Netlik Skoru:</Text>
              <Text style={[styles.value, (result.blur_score || 0) < 15 ? styles.textDanger : styles.textSuccess]}>
                {result.blur_score ? result.blur_score.toFixed(1) : "N/A"}
              </Text>
            </View>

            {result.warning ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>⚠️ {result.warning}</Text>
              </View>
            ) : null}

            <View style={styles.grid}>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Control (C)</Text>
                <Text style={styles.value}>{parseInt(result.c_val)}</Text>
              </View>
              <View style={styles.gridItem}>
                <Text style={styles.label}>Test (T)</Text>
                <Text style={styles.value}>{parseInt(result.t_val)}</Text>
              </View>
            </View>

            {/* Grafik Resmi: Dinamik IP kullanarak */}
            {result.graph_url && (
               <Image 
                 source={{ uri: `${getServerUrl()}/${result.graph_url}?t=${new Date().getTime()}` }} 
                 style={styles.graphImage} 
                 resizeMode="contain"
               />
            )}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContainer: { padding: 20, alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  
  // IP Ayar Stilleri
  ipContainer: { 
    width: '100%', marginBottom: 15, padding: 10, 
    backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#DDD' 
  },
  ipLabel: { fontSize: 12, color: '#666', marginBottom: 5 },
  ipInput: { 
    fontSize: 16, color: '#333', borderBottomWidth: 1, 
    borderBottomColor: '#2196F3', paddingVertical: 5 
  },

  imageContainer: { 
    width: '100%', height: 250, backgroundColor: '#E0E0E0', 
    justifyContent: 'center', alignItems: 'center', borderRadius: 10, marginBottom: 20, overflow: 'hidden'
  },
  previewImage: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center' },
  placeholderText: { color: '#888' },
  
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 15 },
  btnSecondary: { 
    flex: 1, backgroundColor: '#FFF', padding: 15, borderRadius: 8, 
    marginHorizontal: 5, alignItems: 'center', borderWidth: 1, borderColor: '#DDD' 
  },
  btnPrimary: { 
    width: '100%', backgroundColor: '#2196F3', padding: 15, 
    borderRadius: 8, alignItems: 'center', marginBottom: 30 
  },
  btnDisabled: { backgroundColor: '#B0BEC5' },
  btnText: { color: '#333', fontWeight: '600' },
  btnTextPrimary: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  resultCard: { 
    width: '100%', backgroundColor: '#FFF', padding: 20, borderRadius: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, marginBottom: 50
  },
  resultTitle: { fontSize: 22, fontWeight: 'bold', color: '#2196F3', textAlign: 'center', marginBottom: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 1, borderColor: '#EEE', paddingTop: 10 },
  gridItem: { alignItems: 'center', flex: 1 },
  label: { fontSize: 14, color: '#666' },
  value: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  
  warningBox: { backgroundColor: '#FFF3CD', padding: 10, borderRadius: 5, marginVertical: 10, borderWidth: 1, borderColor: '#FFEEBA' },
  warningText: { color: '#856404', fontSize: 14, textAlign: 'center' },
  textDanger: { color: '#D32F2F' },
  textSuccess: { color: '#388E3C' },
  
  graphImage: { width: '100%', height: 200, marginTop: 15, backgroundColor: '#FAFAFA' }
});