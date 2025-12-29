import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import axios from 'axios';

// --- AYARLAR ---
// Server IP adresini buraya yaz (Sonuna / ekleme)
const DEFAULT_IP = "192.168.1.127"; 

function App(): React.JSX.Element {
  // --- STATE'LER ---
  const [ip, setIp] = useState(DEFAULT_IP);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Kamera İzinleri ve Cihaz Seçimi
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);

  // Uygulama açılınca izin iste
  useEffect(() => {
    requestPermission();
  }, []);

  // --- FOTOĞRAF ÇEKME ---
  const takePhoto = async () => {
    if (camera.current) {
      try {
        const photo = await camera.current.takePhoto({
          flash: 'off',
        });
        // Telefondaki dosya yolunu alıyoruz (file://...)
        setPhotoPath(`file://${photo.path}`);
      } catch (e) {
        Alert.alert("Hata", "Fotoğraf çekilemedi: " + e);
      }
    }
  };

  // --- SUNUCUYA GÖNDERME (NATIVE YÖNTEM) ---
  const sendToServer = async () => {
    if (!photoPath) return;

    setLoading(true);
    try {
      // 1. Form Data Hazırla (Android'in anladığı dilden)
      const formData = new FormData();
      
      formData.append('file', {
        uri: photoPath,       // Dosyanın yolu
        type: 'image/jpeg',   // Dosya tipi
        name: 'test_lfa.jpg', // Dosya adı
      });

      formData.append('study', 'Proje_New');
      formData.append('hid', 'Mobile_V2');
      formData.append('conc', '0');

      // 2. İsteği Gönder (Eski /analyze endpoint'ini kullanıyoruz çünkü artık gerçek dosya yolluyoruz)
      const url = `http://${ip}:8000/analyze`;
      console.log("Gidiyor:", url);

      const response = await axios.post(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 10000, // 10 saniye bekle
      });

      // 3. Sonucu Göster
      setResult(response.data);

    } catch (error: any) {
      console.error(error);
      Alert.alert("HATA", `Sunucuya ulaşılamadı.\nIP: ${ip}\nHata: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- EKRAN: KAMERA YOKSA VEYA İZİN YOKSA ---
  if (!hasPermission) return <View style={styles.center}><Text>Kamera izni verilmeli.</Text></View>;
  if (!device) return <View style={styles.center}><Text>Kamera cihazı bulunamadı.</Text></View>;

  // --- EKRAN: SONUÇ GÖSTERME ---
  if (result) {
    return (
      <View style={styles.container}>
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>ANALİZ SONUCU</Text>
          <Text style={styles.ratioText}>{result.ratio}</Text>
          
          <View style={styles.row}>
            <View style={styles.box}>
              <Text style={styles.label}>Kontrol (C)</Text>
              <Text style={styles.value}>{result.c_val}</Text>
            </View>
            <View style={styles.box}>
              <Text style={styles.label}>Test (T)</Text>
              <Text style={styles.value}>{result.t_val}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.btnRetake} 
            onPress={() => { setResult(null); setPhotoPath(null); }}
          >
            <Text style={styles.btnText}>YENİ TEST</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- EKRAN: FOTOĞRAF ÖNİZLEME ---
  if (photoPath) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoPath }} style={styles.previewImage} />
        
        <View style={styles.controls}>
          <TouchableOpacity style={styles.btnCancel} onPress={() => setPhotoPath(null)}>
            <Text style={styles.btnText}>TEKRAR</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.btnSend} onPress={sendToServer} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>ANALİZ ET</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // --- EKRAN: KAMERA (CANLI) ---
  return (
    <View style={styles.container}>
      {/* IP AYAR KUTUSU (En üstte) */}
      <View style={styles.ipBox}>
        <Text style={{color:'white'}}>Sunucu IP:</Text>
        <TextInput 
          style={styles.ipInput} 
          value={ip} 
          onChangeText={setIp} 
          keyboardType="numeric"
        />
      </View>

      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
      />

      {/* Şablon Çerçevesi (Yeşil Kutu) */}
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>LFA Kasetini Çerçeveye Al</Text>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
          <View style={styles.captureBtnInner} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// --- STİLLER ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Kamera Arayüzü
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  frame: { width: 250, height: 100, borderWidth: 2, borderColor: '#00ff00', borderRadius: 10 },
  hint: { color: 'white', marginTop: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 5 },
  
  bottomBar: { height: 120, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: 'black' },
  
  // IP Kutusu
  ipBox: { position: 'absolute', top: 40, left: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 8 },
  ipInput: { backgroundColor: 'white', width: 150, height: 35, padding: 5, borderRadius: 5, marginTop: 5, color: 'black' },

  // Önizleme ve Kontroller
  previewImage: { flex: 1, resizeMode: 'contain' },
  controls: { flexDirection: 'row', padding: 20, backgroundColor: 'black', gap: 20 },
  btnCancel: { flex: 1, backgroundColor: '#555', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnSend: { flex: 1, backgroundColor: '#28a745', padding: 15, borderRadius: 10, alignItems: 'center' },
  
  // Sonuç Ekranı
  resultCard: { backgroundColor: '#222', margin: 20, padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 100 },
  resultTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  ratioText: { color: '#28a745', fontSize: 60, fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 20, marginVertical: 20 },
  box: { backgroundColor: '#444', padding: 15, borderRadius: 10, width: 100, alignItems: 'center' },
  label: { color: '#aaa', fontSize: 12 },
  value: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  btnRetake: { backgroundColor: 'white', padding: 15, borderRadius: 30, width: '100%', alignItems: 'center' },
  btnText: { fontWeight: 'bold', color: 'black' }
});

export default App;