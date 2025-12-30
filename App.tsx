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
} from 'react-native';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';

// --- SUNUCU AYARLARI ---
// Usta buraya kendi bilgisayarının IP adresini yazmayı unutma!
// Emulator kullanıyorsan 10.0.2.2, gerçek telefonda ise 192.168.x.x
const SERVER_URL = 'http://192.168.1.100:5000'; 

export default function App() {
  const [photo, setPhoto] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Sunucudan gelen tüm veriyi burada tutacağız
  const [result, setResult] = useState<any>(null);

  // Fotoğraf Seçme / Çekme
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
        setResult(null); // Yeni foto seçince eski sonucu sil
      }
    };

    if (type === 'camera') launchCamera(options, callback);
    else launchImageLibrary(options, callback);
  };

  // Analiz Gönderme
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

    try {
      const response = await fetch(`${SERVER_URL}/analyze`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();
      console.log("Sunucu Cevabı:", data); // Debug için konsola bas

      if (data.success) {
        // --- BAŞARILI ---
        setResult(data);
        
        // Eğer sunucudan "Warning" geldiyse (Örn: Bulanık resim) uyarı ver
        if (data.warning) {
          Alert.alert("Dikkat", data.warning);
        }
      } else {
        // --- HATA (Motor çalıştı ama hata döndü) ---
        // Örn: "Dosya okunamadı" veya Python tarafındaki bir exception
        setResult(null);
        Alert.alert("Analiz Hatası", data.error || "Bilinmeyen bir hata oluştu.");
      }

    } catch (error) {
      // --- AĞ HATASI ---
      Alert.alert("Bağlantı Hatası", "Sunucuya ulaşılamadı. IP adresini kontrol et.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        
        <Text style={styles.header}>LFA Analiz V17</Text>

        {/* FOTOĞRAF ALANI */}
        <View style={styles.imageContainer}>
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.previewImage} resizeMode="contain" />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>Fotoğraf Yok</Text>
            </View>
          )}
        </View>

        {/* BUTONLAR */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => handleSelectPhoto('camera')}>
            <Text style={styles.btnText}>Kamera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={() => handleSelectPhoto('library')}>
            <Text style={styles.btnText}>Galeri</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.btnPrimary, loading && styles.btnDisabled]} 
          onPress={handleAnalyze}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnTextPrimary}>ANALİZ ET</Text>}
        </TouchableOpacity>

        {/* --- SONUÇ EKRANI (DİNAMİK) --- */}
        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Sonuç: {parseFloat(result.ratio).toFixed(4)}</Text>
            
            {/* Netlik ve Uyarı Bilgisi */}
            <View style={styles.infoRow}>
              <Text style={styles.label}>Netlik Skoru:</Text>
              <Text style={[styles.value, result.blur_score < 15 ? styles.textDanger : styles.textSuccess]}>
                {result.blur_score ? result.blur_score.toFixed(1) : "N/A"}
              </Text>
            </View>

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

            {/* Grafik Gösterimi */}
            {result.graph_url && (
               <Image 
               // Sunucudan dönen URL'nin başına sunucu adresini ekliyoruz (Eğer tam URL dönmüyorsa)
               // Server.py'da "static" klasörünü serve ettiğimizden emin olmalıyız.
               // Şimdilik varsayım: graph_path dosya yolu dönüyor.
               // React Native'de local file path'i image componentte göstermek zordur.
               // En sağlıklısı server'ın resim URL'si dönmesidir.
               // *Geçici Çözüm:* Sadece metin gösteriyoruz, resmi indirmek ayrı iş.
                 source={{ uri: `${SERVER_URL}/static/${result.filename.split('.')[0]}_graph.png?t=${new Date().getTime()}` }} 
                 style={styles.graphImage} 
                 resizeMode="contain"
               />
            )}
             {/* Not: Grafik resmi için Server.py tarafında 'static' klasör ayarı yapılmalı. 
                 Yapmadıysan resim görünmez, sadece metinler görünür. */}

          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContainer: { padding: 20, alignItems: 'center' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  imageContainer: { 
    width: '100%', height: 300, backgroundColor: '#E0E0E0', 
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
    borderRadius: 8, alignItems: 'center', marginBottom: 20 
  },
  btnDisabled: { backgroundColor: '#B0BEC5' },
  btnText: { color: '#333', fontWeight: '600' },
  btnTextPrimary: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  
  // Sonuç Kartı Tasarımı
  resultCard: { 
    width: '100%', backgroundColor: '#FFF', padding: 20, borderRadius: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 4, elevation: 3
  },
  resultTitle: { fontSize: 22, fontWeight: 'bold', color: '#2196F3', textAlign: 'center', marginBottom: 15 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  grid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, borderTopWidth: 1, borderColor: '#EEE', paddingTop: 10 },
  gridItem: { alignItems: 'center', flex: 1 },
  label: { fontSize: 14, color: '#666' },
  value: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  warningBox: { backgroundColor: '#FFF3CD', padding: 10, borderRadius: 5, marginVertical: 10 },
  warningText: { color: '#856404', fontSize: 14 },
  textDanger: { color: '#D32F2F' },
  textSuccess: { color: '#388E3C' },
  graphImage: { width: '100%', height: 150, marginTop: 15 }
});