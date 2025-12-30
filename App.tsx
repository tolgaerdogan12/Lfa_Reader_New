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
  TextInput,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';

export default function App() {
  // --- STATE ---
  const [photo, setPhoto] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Varsayılan IP (Değiştirebilirsin)
  const [serverIp, setServerIp] = useState('192.168.1.25'); 

  // URL Oluşturucu Helper
  const getServerUrl = () => {
    let ip = serverIp.trim();
    if (!ip.startsWith('http')) ip = `http://${ip}`;
    if (!ip.includes(':')) ip = `${ip}:5000`;
    return ip;
  };

  // Kamera İzni İsteme (Android İçin)
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: "Kamera İzni",
            message: "Analiz yapabilmek için kameraya erişim gerekiyor.",
            buttonNeutral: "Sonra Sor",
            buttonNegative: "İptal",
            buttonPositive: "Tamam"
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Fotoğraf Seçme (Base64 Modu Açık)
  const handleSelectPhoto = async (type: 'camera' | 'library') => {
    const options = {
      mediaType: 'photo' as const,
      quality: 0.8, // Transfer hızı için kaliteyi biraz kıstık (Motor etkilenmez)
      includeBase64: true, // <--- İŞTE SİHİRLİ ANAHTAR BU
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
        setResult(null); // Yeni foto seçince eski sonucu temizle
      }
    };

    if (type === 'camera') {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
            Alert.alert("İzin Yok", "Kamera izni verilmedi.");
            return;
        }
        launchCamera(options as any, callback);
    } else {
        launchImageLibrary(options as any, callback);
    }
  };

  // Analiz Etme (JSON Yöntemiyle)
  const handleAnalyze = async () => {
    if (!photo || !photo.base64) {
      Alert.alert('Uyarı', 'Fotoğraf verisi (Base64) alınamadı. Tekrar çekin.');
      return;
    }

    setLoading(true);

    // Endpoint artık /analyze_base64
    const targetUrl = `${getServerUrl()}/analyze_base64`;
    console.log("İstek Gönderiliyor:", targetUrl);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Dosya değil, JSON gönderiyoruz
        },
        // Resmi 'image' anahtarıyla paketliyoruz
        body: JSON.stringify({
          image: photo.base64, 
          study: "MobilTest",
          hid: "MobilUser"
        }),
      });

      const data = await response.json();
      console.log("Sunucu Cevabı:", data);

      if (data.success) {
        // --- BAŞARILI ---
        setResult(data);
        
        // Eğer motor "Bulanık" dediyse uyarıyı göster
        if (data.warning) {
          Alert.alert("Dikkat", data.warning);
        }
      } else {
        // --- MOTOR HATASI ---
        setResult(null);
        Alert.alert("Analiz Hatası", data.error || "Bilinmeyen hata.");
      }

    } catch (error) {
      // --- AĞ HATASI ---
      Alert.alert("Bağlantı Hatası", `Sunucuya ulaşılamadı.\nAdres: ${targetUrl}\nIP adresini kontrol et.`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        <Text style={styles.header}>LFA Analiz V17.6 (Base64)</Text>

        {/* IP GİRİŞ ALANI */}
        <View style={styles.ipContainer}>
          <Text style={styles.ipLabel}>Sunucu IP Adresi:</Text>
          <TextInput
            style={styles.ipInput}
            value={serverIp}
            onChangeText={setServerIp}
            placeholder="Örn: 192.168.1.25"
            keyboardType="numeric" 
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
            
            {/* Netlik Skoru Göstergesi */}
            <View style={styles.infoRow}>
              <Text style={styles.label}>Netlik Skoru:</Text>
              <Text style={[styles.value, (result.blur_score || 0) < 15 ? styles.textDanger : styles.textSuccess]}>
                {result.blur_score ? result.blur_score.toFixed(1) : "N/A"}
              </Text>
            </View>

            {/* Uyarı Kutusu (Bulanık Uyarısı Burada Çıkar) */}
            {result.warning ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>⚠️ {result.warning}</Text>
              </View>
            ) : null}

            {/* C ve T Değerleri */}
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

            {/* Grafik Resmi */}
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
  
  // Sonuç Kartı Stilleri
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
  
  // Uyarı Kutusu
  warningBox: { backgroundColor: '#FFF3CD', padding: 10, borderRadius: 5, marginVertical: 10, borderWidth: 1, borderColor: '#FFEEBA' },
  warningText: { color: '#856404', fontSize: 14, textAlign: 'center' },
  
  // Netlik Skoru Renkleri
  textDanger: { color: '#D32F2F', fontWeight: 'bold' },
  textSuccess: { color: '#388E3C', fontWeight: 'bold' },
  
  graphImage: { width: '100%', height: 200, marginTop: 15, backgroundColor: '#FAFAFA' }
});