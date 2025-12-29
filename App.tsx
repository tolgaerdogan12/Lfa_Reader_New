import React, { useState, useEffect, RefObject } from 'react';
import { View, Alert } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { HistoryScreen } from './src/components/HistoryScreen';
import { ResultScreen } from './src/components/ResultScreen';
import { PreviewScreen } from './src/components/PreviewScreen';
import { CameraScreen } from './src/components/CameraScreen';
import { styles } from './src/components/common/styles';

const DEFAULT_IP = "192.168.1.127";

function App(): React.JSX.Element {
  const [ip, setIp] = useState(DEFAULT_IP);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [torch, setTorch] = useState<'off' | 'on'>('off');

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  useEffect(() => {
    requestPermission();
    loadHistory();
  }, [requestPermission]);

  const loadHistory = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('@lfa_history');
      if (jsonValue != null) setHistory(JSON.parse(jsonValue));
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  };

  const saveToHistory = async (newResult: any) => {
    try {
      const record = { ...newResult, date: new Date().toLocaleString(), id: Date.now().toString() };
      const updatedHistory = [record, ...history];
      setHistory(updatedHistory);
      await AsyncStorage.setItem('@lfa_history', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem('@lfa_history');
      setHistory([]);
    } catch (e) {
      console.error("Failed to clear history:", e);
    }
  };

  const toggleTorch = () => {
    setTorch(t => (t === 'off' ? 'on' : 'off'));
  };

  const takePhoto = async (camera: RefObject<Camera>) => {
    if (camera.current) {
      try {
        const photo = await camera.current.takePhoto({ flash: 'off' });
        setPhotoPath(`file://${photo.path}`);
      } catch (e) {
        Alert.alert("Hata", "Çekilemedi: " + e);
      }
    }
  };

  const pickFromGallery = async () => {
    const response = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 });
    if (response.assets && response.assets[0].uri) {
      setPhotoPath(response.assets[0].uri);
    }
  };

  const sendToServer = async () => {
    if (!photoPath) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri: photoPath, type: 'image/jpeg', name: 'upload.jpg' });
      formData.append('study', 'Mobil_Torch');
      formData.append('hid', 'Fixed_Light');
      formData.append('conc', '0');

      const url = `http://${ip}:8000/analyze`;
      const response = await axios.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 15000 });
      setResult(response.data);
      saveToHistory(response.data);
    } catch (error: any) {
      Alert.alert("HATA", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setResult(null);
    setPhotoPath(null);
  };

  const handleCancel = () => {
    setPhotoPath(null);
  };

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text>Kamera izni gerekiyor.</Text>
      </View>
    );
  }

  if (showHistory) {
    return <HistoryScreen history={history} onBack={() => setShowHistory(false)} onClearHistory={clearHistory} />;
  }

  if (result) {
    return <ResultScreen result={result} onRetake={handleRetake} />;
  }

  if (photoPath) {
    return <PreviewScreen photoPath={photoPath} loading={loading} onCancel={handleCancel} onSend={sendToServer} />;
  }

  return (
    <CameraScreen
      ip={ip}
      setIp={setIp}
      torch={torch}
      toggleTorch={toggleTorch}
      setShowHistory={setShowHistory}
      takePhoto={takePhoto}
      pickFromGallery={pickFromGallery}
      device={device}
    />
  );
}

export default App;
