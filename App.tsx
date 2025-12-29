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
  ScrollView,
  Platform,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// --- AYARLAR ---
const DEFAULT_IP = "192.168.1.127"; 

function App(): React.JSX.Element {
  // --- STATE'LER ---
  const [ip, setIp] = useState(DEFAULT_IP);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false); // Geçmiş ekranını aç/kapa

  // Kamera
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);

  // Başlangıçta Geçmişi Yükle ve İzin İste
  useEffect(() => {
    requestPermission();
    loadHistory();
  }, []);

  // --- 1. GEÇMİŞ YÖNETİMİ ---
  const loadHistory = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('@lfa_history');
      if (jsonValue != null) {
        setHistory(JSON.parse(jsonValue));
      }
    } catch(e) { console.error("Geçmiş yüklenemedi", e); }
  };

  const saveToHistory = async (newResult: any) => {
    try {
      // Tarih ekle
      const record = {
        ...newResult,
        date: new Date().toLocaleString(),
        id: Date.now().toString()
      };
      const updatedHistory = [record, ...history]; // En yeniyi başa ekle
      setHistory(updatedHistory);
      await AsyncStorage.setItem('@lfa_history', JSON.stringify(updatedHistory));
    } catch (e) { console.error("Kayıt hatası", e); }
  };

  const clearHistory = async () => {
    Alert.alert("Emin misin?", "Tüm test geçmişi silinecek.", [
      { text: "İptal", style: "cancel" },
      { 
        text: "SİL", 
        style: 'destructive', 
        onPress: async () => {
          await AsyncStorage.removeItem('@lfa_history');
          setHistory([]);
        }
      }
    ]);
  };

  // --- 2. FOTOĞRAF İŞLEMLERİ ---
  const takePhoto = async () => {
    if (camera.current) {
      try {
        const photo = await camera.current.takePhoto({ flash: 'off' });
        setPhotoPath(`file://${photo.path}`);
      } catch (e) { Alert.alert("Hata", "Fotoğraf çekilemedi: " + e); }
    }
  };

  const pickFromGallery = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    if (result.assets && result.assets.length > 0 && result.assets[0].uri) {
      setPhotoPath(result.assets[0].uri);
    }
  };

  // --- 3. SUNUCUYA GÖNDERME ---
  const sendToServer = async () => {
    if (!photoPath) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: photoPath,
        type: 'image/jpeg',
        name: 'upload.jpg',
      });
      formData.append('study', 'Mobil_V3');
      formData.append('hid', 'Patient_01');
      formData.append('conc', '0');

      const url = `http://${ip}:8000/analyze`;
      const response = await axios.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 15000,
      });

      // Sonucu göster ve kaydet
      setResult(response.data);
      saveToHistory(response.data);

    } catch (error: any) {
      Alert.alert("HATA", `Bağlantı sorunu.\nIP: ${ip}\n${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- 4. EKRANLAR ---

  // A) GEÇMİŞ EKRANI
  if (showHistory) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.btnSmall}>
            <Text style={styles.btnText}>GERİ</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>TEST GEÇMİŞİ</Text>
          <TouchableOpacity onPress={clearHistory} style={[styles.btnSmall, {backgroundColor:'#d9534f'}]}>
            <Text style={styles.btnText}>SİL</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={{flex:1, padding:10}}>
          {history.length === 0 ? (
             <Text style={{color:'#666', textAlign:'center', marginTop:50}}>Henüz kayıt yok.</Text>
          ) : (
            history.map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <View>
                  <Text style={styles.historyRatio}>{item.ratio} Ratio</Text>
                  <Text style={styles.historyDate}>{item.date}</Text>
                </View>
                <View style={{alignItems:'flex-end'}}>
                  <Text style={{color:'#aaa'}}>C: {item.c_val}</Text>
                  <Text style={{color:'#aaa'}}>T: {item.t_val}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // B) SONUÇ EKRANI
  if (result) {
    return (
      <View style={styles.container}>
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>ANALİZ TAMAMLANDI</Text>
          <Text style={styles.ratioText}>{result.ratio}</Text>
          <View style={styles.row}>
            <View style={styles.box}><Text style={styles.label}>Kontrol (C)</Text><Text style={styles.value}>{result.c_val}</Text></View>
            <View style={styles.box}><Text style={styles.label}>Test (T)</Text><Text style={styles.value}>{result.t_val}</Text></View>
          </View>
          <TouchableOpacity style={styles.btnRetake} onPress={() => { setResult(null); setPhotoPath(null); }}>
            <Text style={[styles.btnText, {color:'black'}]}>YENİ TEST</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // C) ÖNİZLEME EKRANI (Foto çekince/seçince)
  if (photoPath) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoPath }} style={styles.previewImage} />
        <View style={styles.controls}>
          <TouchableOpacity style={styles.btnCancel} onPress={() => setPhotoPath(null)}>
            <Text style={styles.btnText}>İPTAL</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSend} onPress={sendToServer} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>ANALİZ ET</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // D) KAMERA EKRANI (Ana Ekran)
  if (!device) return <View style={styles.center}><Text>Kamera Yok</Text></View>;

  return (
    <View style={styles.container}>
      {/* Üst Bar: IP ve Geçmiş */}
      <View style={styles.topBar}>
         <TextInput style={styles.ipInput} value={ip} onChangeText={setIp} keyboardType="numeric" />
         <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.historyBtn}>
            <Text style={{fontSize:20}}>📜</Text>
         </TouchableOpacity>
      </View>

      <Camera ref={camera} style={StyleSheet.absoluteFill} device={device} isActive={true} photo={true} />
      
      {/* Çerçeve */}
      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>LFA Kasetini Hizala</Text>
      </View>

      {/* Alt Bar: Galeri ve Çekim */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}>
           <Text style={{fontSize:24}}>🖼️</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}>
          <View style={styles.captureBtnInner} />
        </TouchableOpacity>

        <View style={{width:50}} /> 
      </View>
    </View>
  );
}

// --- STİLLER ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Üst Bar
  topBar: { position:'absolute', top:40, left:20, right:20, zIndex:10, flexDirection:'row', justifyContent:'space-between' },
  ipInput: { backgroundColor:'white', width:150, height:40, borderRadius:8, paddingHorizontal:10, color:'black', textAlign:'center' },
  historyBtn: { backgroundColor:'rgba(255,255,255,0.8)', width:40, height:40, borderRadius:20, justifyContent:'center', alignItems:'center' },

  // Kamera
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  frame: { width: 250, height: 100, borderWidth: 2, borderColor: '#00ff00', borderRadius: 10 },
  hint: { color: 'white', marginTop: 10, backgroundColor: 'rgba(0,0,0,0.5)', padding: 5 },
  
  // Alt Bar
  bottomBar: { height: 120, backgroundColor: 'rgba(0,0,0,0.8)', flexDirection:'row', justifyContent:'space-around', alignItems:'center', paddingHorizontal:20 },
  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: 'black' },
  galleryBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#333', justifyContent:'center', alignItems:'center', borderWidth:1, borderColor:'#666' },

  // Önizleme
  previewImage: { flex: 1, resizeMode: 'contain' },
  controls: { flexDirection: 'row', padding: 20, backgroundColor: 'black', gap: 20 },
  btnCancel: { flex: 1, backgroundColor: '#555', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnSend: { flex: 1, backgroundColor: '#28a745', padding: 15, borderRadius: 10, alignItems: 'center' },

  // Sonuç
  resultCard: { backgroundColor: '#222', margin: 20, padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 100 },
  resultTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  ratioText: { color: '#28a745', fontSize: 60, fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 20, marginVertical: 20 },
  box: { backgroundColor: '#444', padding: 15, borderRadius: 10, width: 100, alignItems: 'center' },
  label: { color: '#aaa', fontSize: 12 },
  value: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  btnRetake: { backgroundColor: 'white', padding: 15, borderRadius: 30, width: '100%', alignItems: 'center' },
  btnText: { fontWeight: 'bold', color: 'white', fontSize:16 },

  // Geçmiş Ekranı
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:20, paddingTop:50, backgroundColor:'#222' },
  headerTitle: { color:'white', fontSize:18, fontWeight:'bold' },
  btnSmall: { padding:8, backgroundColor:'#555', borderRadius:5 },
  historyItem: { backgroundColor:'#1a1a1a', padding:15, marginBottom:10, borderRadius:10, flexDirection:'row', justifyContent:'space-between', borderLeftWidth:4, borderLeftColor:'#28a745' },
  historyRatio: { color:'#28a745', fontSize:20, fontWeight:'bold' },
  historyDate: { color:'#666', fontSize:12, marginTop:5 }
});

export default App;