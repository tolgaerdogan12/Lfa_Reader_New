import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Camera, useCameraDevice, CameraDevice } from 'react-native-vision-camera';
import { styles, FRAME_WIDTH, FRAME_HEIGHT } from './common/styles';

interface CameraScreenProps {
  ip: string;
  torch: 'on' | 'off';
  setIp: (ip: string) => void;
  toggleTorch: () => void;
  setShowHistory: (show: boolean) => void;
  takePhoto: (camera: React.RefObject<Camera>) => void;
  pickFromGallery: () => void;
  device: CameraDevice | undefined;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  ip,
  torch,
  setIp,
  toggleTorch,
  setShowHistory,
  takePhoto,
  pickFromGallery,
  device,
}) => {
  const camera = useRef<Camera>(null);

  if (!device) {
    return (
      <View style={styles.center}>
        <Text>Kamera Yok</Text>
      </View>
    );
  }

  const handleTakePhoto = () => {
    takePhoto(camera);
  };

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
        <Text style={styles.hint}>{torch === 'on' ? 'Işık Açık - Çekim Yapabilirsin' : 'Işığı Açman Önerilir 🔦'}</Text>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.galleryBtn} onPress={pickFromGallery}><Text style={{fontSize:24}}>🖼️</Text></TouchableOpacity>
        <TouchableOpacity style={styles.captureBtn} onPress={handleTakePhoto}><View style={styles.captureBtnInner} /></TouchableOpacity>
        <View style={{width:50}} />
      </View>
    </View>
  );
};
