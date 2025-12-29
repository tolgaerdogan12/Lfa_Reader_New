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
  Dimensions,
  Linking,
} from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const DEFAULT_IP = "192.168.1.127";
const { width } = Dimensions.get('window');
const FRAME_WIDTH = width * 0.8;
const FRAME_HEIGHT = FRAME_WIDTH * 0.4;

function App(): React.JSX.Element {
  const [ip, setIp] = useState(DEFAULT_IP);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [torch, setTorch] = useState<'off' | 'on'>('off');
  
  // --- KAMERA SEÇİM MANTIĞI (MANUEL FALLBACK) ---
  const [manualDevice, setManualDevice] = useState<any>(null);
  const [debugMsg, setDebugMsg] = useState("Başlatılıyor...");

  // İzinler
  const { hasPermission, requestPermission } = useCameraPermission();
  
  // 1. Yöntem: Standart Hook (Önce bunu dener)
  const hookDevice = useCameraDevice('back');

  // 2. Yöntem: Manuel Tarama (Hook bulamazsa devreye girer)
  useEffect(() => {
    const findCamera = async () => {
      const status = await requestPermission();
      if (!status) return;

      // Eğer standart hook bir şey bulduysa onu kullanalım
      if (hookDevice) {
        setDebugMsg("Otomatik kamera bulundu.");
        return;
      }

      // Bulamadıysa manuel tarama yap
      setDebugMsg("Manuel kamera aranıyor...");
      const devices = Camera.getAvailableCameraDevices();
      setDebugMsg(`Bulunan Cihaz Sayısı: ${devices.length}`);

      if (devices.length > 0) {
        // Genelde 'back' (arka) kameraları filtrele, yoksa ilkini al
        const bestDevice = devices.find(d => d.position === 'back') || devices[0];
        setManualDevice(bestDevice);
      } else {
        setDebugMsg("HİÇ KAMERA BULUNAMADI!");
      }
    };

    findCamera();
    loadHistory();
  }, [hookDevice]); // hookDevice değişirse tekrar kontrol et

  // Nihai Cihaz: Hook varsa o, yoksa manuel bulunan
  const device = hookDevice || manualDevice;
  const camera = useRef<Camera>(null);

  // --- DİĞER FONKSİYONLAR ---
  const loadHistory = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('@lfa_history');
      if (jsonValue != null) setHistory(JSON.parse(jsonValue));
    } catch(e) {}
  };

  const saveToHistory = async (newResult: any) => {
    try {
      const record = { ...newResult, date: new Date().toLocaleString(), id: Date.now().toString() };
      const updatedHistory = [record, ...history];
      setHistory(updatedHistory);
      await AsyncStorage.setItem('@lfa_history', JSON.stringify(updatedHistory));
    } catch (e) {}
  };

  const clearHistory = async () => {
    Alert.alert("Sil?", "Tüm geçmiş silinecek.", [
      { text: "Vazgeç", style: "cancel" },
      { text: "SİL", style: 'destructive', onPress: async () => { await AsyncStorage.removeItem('@lfa_history'); setHistory([]); } }
    ]);
  };

  const toggleTorch = () => {
    setTorch(t => (t === 'off' ? 'on' : 'off'));
  };

  const takePhoto = async () => {
    if (camera.current) {
      try {
        const photo = await camera.current.takePhoto({ flash: 'off' });
        setPhotoPath(`file://${photo.path}`);
      } catch (e) { Alert.alert("Hata", "Çekilemedi: " + e); }
    }
  };

  const pickFromGallery = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    if (result.assets && result.assets[0].uri) setPhotoPath(result.assets[0].uri);
  };

  const sendToServer = async () => {
    if (!photoPath) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri: photoPath, type: 'image/jpeg', name: 'upload.jpg' });
      formData.append('study', 'Mobil_Forced');
      formData.append('hid', 'Manual_Select');
      formData.append('conc', '0');

      const url = `http://${ip}:8000/analyze`;
      const response = await axios.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 15000 });
      setResult(response.data);
      saveToHistory(response.data);
    } catch (error: any) { Alert.alert("HATA", error.message); } finally { setLoading(false); }
  };

  // --- EKRANLAR ---

  // 1. İZİN YOKSA
  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text style={{color:'white', marginBottom:20, fontSize:18}}>Kamera İzni Gerekli</Text>
        <TouchableOpacity style={{backgroundColor:'#28a745', padding:15, borderRadius:10}} onPress={() => Linking.openSettings()}>
          <Text style={{color:'white', fontWeight:'bold'}}>AYARLARI AÇ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 2. CİHAZ YÜKLENİYORSA (DEBUG MODU)
  if (!device) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{color:'white', marginTop:20, fontSize:16, fontWeight:'bold'}}>Kamera Aranıyor...</Text>
        <Text style={{color:'#aaa', marginTop:10}}>Durum: {debugMsg}</Text>
        <TouchableOpacity style={{marginTop:30, backgroundColor:'#555', padding:10, borderRadius:5}} onPress={() => Linking.openSettings()}>
             <Text style={{color:'white'}}>İzinleri Kontrol Et</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. GEÇMİŞ
  if (showHistory) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.btnSmall}><Text style={styles.btnText}>GERİ</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>GEÇMİŞ</Text>
          <TouchableOpacity onPress={clearHistory} style={[styles.btnSmall, {backgroundColor:'#d9534f'}]}><Text style={styles.btnText}>SİL</Text></TouchableOpacity>
        </View>
        <ScrollView style={{flex:1, padding:10}}>
          {history.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View><Text style={styles.historyRatio}>{item.ratio} Ratio</Text><Text style={styles.historyDate}>{item.date}</Text></View>
              <View><Text style={{color:'#aaa'}}>C: {item.c_val}</Text><Text style={{color:'#aaa'}}>T: {item.t_val}</Text></View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // 4. SONUÇ
  if (result) {
    return (
      <View style={styles.container}>
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>SONUÇ</Text>
          <Text style={styles.ratioText}>{result.ratio}</Text>
          <View style={styles.row}>
            <View style={styles.box}><Text style={styles.label}>C</Text><Text style={styles.value}>{result.c_val}</Text></View>
            <View style={styles.box}><Text style={styles.label}>T</Text><Text style={styles.value}>{result.t_val}</Text></View>
          </View>
          <TouchableOpacity style={styles.btnRetake} onPress={() => { setResult(null); setPhotoPath(null); }}><Text style={[styles.btnText, {color:'black'}]}>TAMAM</Text></TouchableOpacity>
        </View>
      </View>
    );
  }

  // 5. ÖNİZLEME
  if (photoPath) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoPath }} style={styles.previewImage} />
        <View style={styles.controls}>
          <TouchableOpacity style={styles.btnCancel} onPress={() => setPhotoPath(null)}><Text style={styles.btnText}>İPTAL</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnSend} onPress={sendToServer} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>ANALİZ ET</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 6. KAMERA (ANA EKRAN)
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
         <TextInput style={styles.ipInput} value={ip} onChangeText={setIp} keyboardType="numeric" />
         <View style={{flexDirection:'row', gap:10}}>
            <TouchableOpacity onPress={toggleTorch} style={[styles.iconBtn, {backgroundColor: torch === 'on' ? '#ffd700' : 'rgba(255,255,255,0.8)'}]}>
                <Text style={{fontSize:20}}>{torch === 'on' ? '⚡' : '🔦'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.iconBtn}>
                <Text style={{fontSize:20}}>📜</Text>
            </TouchableOpacity>
         </View>
      </View>

      <Camera 
        ref={camera} 
        style={StyleSheet.absoluteFill} 
        device={device} 
        isActive={true} 
        photo={true}
        torch={torch}
        exposure={0}
        enableZoomGesture={false} 
      />
      
      <View style={styles.overlay}>
        <View style={[styles.guideBox, {width: FRAME_WIDTH, height: FRAME_HEIGHT}]}>
            <View style={[styles.cornerMarker, {top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4}]} />
            <View style={[styles.cornerMarker, {top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4}]} />
            <View style={[styles.cornerMarker, {bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4}]} />
            <View style={[styles.cornerMarker, {bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4}]} />
            <View style={styles.centerCross} />
        </View>
        <Text style={styles.hint}>{torch === 'on' ? 'Çekime Hazır ⚡' : 'Işığı Aç 🔦'}</Text>
        
        {/* Hangi kamerayı kullandığını görelim (Test Amaçlı) */}
        <Text style={{color:'gray', position:'absolute', bottom: 130, fontSize:10}}>
            Aktif Kamera: {device.name || device.id} ({device.position})
        </Text>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}><Text style={{fontSize:24}}>🖼️</Text></TouchableOpacity>
        <TouchableOpacity style={styles.captureBtn} onPress={takePhoto}><View style={styles.captureBtnInner} /></TouchableOpacity>
        <View style={{width:50}} /> 
      </View>
    </View>
  );
}

// --- STİLLER ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' },
  topBar: { position:'absolute', top:40, left:20, right:20, zIndex:10, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  ipInput: { backgroundColor:'white', width:150, height:40, borderRadius:8, paddingHorizontal:10, color:'black', textAlign:'center' },
  iconBtn: { backgroundColor:'rgba(255,255,255,0.8)', width:40, height:40, borderRadius:20, justifyContent:'center', alignItems:'center' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  guideBox: { position: 'relative' },
  cornerMarker: { position: 'absolute', width: 30, height: 30, borderColor: '#00ff00' },
  centerCross: { position: 'absolute', top: '50%', left: '50%', width: 10, height: 10, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 5, transform: [{translateX: -5}, {translateY: -5}] },
  hint: { color: '#00ff00', fontWeight:'bold', marginTop: 20, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10, borderRadius:5 },
  bottomBar: { height: 120, backgroundColor: 'rgba(0,0,0,0.8)', flexDirection:'row', justifyContent:'space-around', alignItems:'center', paddingHorizontal:20 },
  captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center' },
  captureBtnInner: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: 'black' },
  galleryBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#333', justifyContent:'center', alignItems:'center', borderWidth:1, borderColor:'#666' },
  previewImage: { flex: 1, resizeMode: 'contain' },
  controls: { flexDirection: 'row', padding: 20, backgroundColor: 'black', gap: 20 },
  btnCancel: { flex: 1, backgroundColor: '#555', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnSend: { flex: 1, backgroundColor: '#28a745', padding: 15, borderRadius: 10, alignItems: 'center' },
  resultCard: { backgroundColor: '#222', margin: 20, padding: 20, borderRadius: 20, alignItems: 'center', marginTop: 100 },
  resultTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  ratioText: { color: '#28a745', fontSize: 60, fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 20, marginVertical: 20 },
  box: { backgroundColor: '#444', padding: 15, borderRadius: 10, width: 100, alignItems: 'center' },
  label: { color: '#aaa', fontSize: 12 },
  value: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  btnRetake: { backgroundColor: 'white', padding: 15, borderRadius: 30, width: '100%', alignItems: 'center' },
  btnText: { fontWeight: 'bold', color: 'white', fontSize:16 },
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:20, paddingTop:50, backgroundColor:'#222' },
  headerTitle: { color:'white', fontSize:18, fontWeight:'bold' },
  btnSmall: { padding:8, backgroundColor:'#555', borderRadius:5 },
  historyItem: { backgroundColor:'#1a1a1a', padding:15, marginBottom:10, borderRadius:10, flexDirection:'row', justifyContent:'space-between', borderLeftWidth:4, borderLeftColor:'#28a745' },
  historyRatio: { color:'#28a745', fontSize:20, fontWeight:'bold' },
  historyDate: { color:'#666', fontSize:12, marginTop:5 }
});

export default App;
