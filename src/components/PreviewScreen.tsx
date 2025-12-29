import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { styles } from './common/styles';

interface PreviewScreenProps {
  photoPath: string;
  loading: boolean;
  onCancel: () => void;
  onSend: () => void;
}

export const PreviewScreen: React.FC<PreviewScreenProps> = ({ photoPath, loading, onCancel, onSend }) => {
  return (
    <View style={styles.container}>
      <Image source={{ uri: photoPath }} style={styles.previewImage} />
      <View style={styles.controls}>
        <TouchableOpacity style={styles.btnCancel} onPress={onCancel}><Text style={styles.btnText}>İPTAL</Text></TouchableOpacity>
        <TouchableOpacity style={styles.btnSend} onPress={onSend} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>ANALİZ ET</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};
