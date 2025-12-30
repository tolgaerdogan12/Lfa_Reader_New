import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const DEFAULT_IP = "192.168.1.127";
const { width } = Dimensions.get('window');

function App(): React.JSX.Element {
  // STATE'LER
  const [ip, setIp] = useState(DEFAULT_IP);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  // --- GEÇMİŞ YÖNETİMİ ---
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

  // --- KAMERA VE GALERİ ---
  
  // 1. KAMERA AÇ (SİSTEM KAMERASI)
  const openCamera = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      saveToPhotos: false,
      cameraType: 'back',
      quality: 1,
    });

    if (result.errorMessage) {
      Alert.alert("Hata", result.errorMessage);
    } else if (result.assets && result.assets[0].uri) {
      setPhotoPath(result.assets[0].uri);
    }
  };

  // 2. GALERİ AÇ
  const openGallery = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    if (result.assets && result.assets[0].uri) setPhotoPath(result.assets[0].uri);
  };

  // 3. ANALİZ ET
  const sendToServer = async () => {
    if (!photoPath) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri: photoPath, type: 'image/jpeg', name: 'upload.jpg' });
      formData.append('study', 'Mobil_SystemCamera');
      formData.append('hid', 'Native_Picker');
      formData.append('conc', '0');

      const url = `http://${ip}:8000/analyze`;
      const response = await axios.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 15000 });
      setResult(response.data);
      saveToHistory(response.data);
    } catch (error: any) { Alert.alert("HATA", error.message); } finally { setLoading(false); }
  };

  // --- EKRANLAR ---

  // 1. GEÇMİŞ EKRANI
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

  // 2. SONUÇ EKRANI
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

  // 3. FOTOĞRAF ÖNİZLEME (ANALİZ EKRANI)
  if (photoPath) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: photoPath }} style={styles.previewImage} />
        
        {/* Rehber Çizgileri (Sadece fotoğrafın üstüne görsel olarak ekledik) */}
        <View style={styles.overlay}>
           <Text style={{color:'yellow', backgroundColor:'rgba(0,0,0,0.5)', padding:5}}>Analiz İçin Hazır</Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity style={styles.btnCancel} onPress={() => setPhotoPath(null)}><Text style={styles.btnText}>İPTAL</Text></TouchableOpacity>
          <TouchableOpacity style={styles.btnSend} onPress={sendToServer} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>ANALİZ ET</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 4. ANA EKRAN (GİRİŞ)
  return (
    <View style={styles.containerCenter}>
      <Text style={styles.title}>LFA Analizcisi</Text>
      
      {/* IP Girişi */}
      <TextInput style={styles.ipInput} value={ip} onChangeText={setIp} keyboardType="numeric" placeholder="IP Adresi" />

      {/* Butonlar */}
      <View style={{width:'80%', gap:20, marginTop:40}}>
        <TouchableOpacity style={styles.bigButton} onPress={openCamera}>
            <Text style={styles.bigBtnText}>📸 KAMERA AÇ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.bigButton, {backgroundColor:'#333'}]} onPress={openGallery}>
            <Text style={styles.bigBtnText}>🖼️ GALERİDEN SEÇ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.bigButton, {backgroundColor:'#444'}]} onPress={() => setShowHistory(true)}>
            <Text style={styles.bigBtnText}>📜 GEÇMİŞ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  containerCenter: { flex: 1, backgroundColor: 'black', justifyContent:'center', alignItems:'center' },
  title: { color:'white', fontSize:30, fontWeight:'bold', marginBottom:20 },
  ipInput: { backgroundColor:'white', width:200, height:50, borderRadius:10, paddingHorizontal:10, color:'black', textAlign:'center', fontSize:18 },
  
  bigButton: { backgroundColor:'#007bff', padding:20, borderRadius:15, alignItems:'center', width:'100%' },
  bigBtnText: { color:'white', fontSize:20, fontWeight:'bold' },

  previewImage: { flex: 1, resizeMode: 'contain' },
  overlay: { position:'absolute', top:50, alignSelf:'center' },
  
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