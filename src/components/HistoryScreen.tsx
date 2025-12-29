import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { styles } from './common/styles';

interface HistoryItem {
  id: string;
  ratio: string;
  date: string;
  c_val: string;
  t_val: string;
}

interface HistoryScreenProps {
  history: HistoryItem[];
  onBack: () => void;
  onClearHistory: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ history, onBack, onClearHistory }) => {
  const handleClearHistory = () => {
    Alert.alert("Sil?", "Tüm geçmiş silinecek.", [
      { text: "Vazgeç", style: "cancel" },
      { text: "SİL", style: 'destructive', onPress: onClearHistory }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.btnSmall}><Text style={styles.btnText}>GERİ</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>GEÇMİŞ</Text>
        <TouchableOpacity onPress={handleClearHistory} style={[styles.btnSmall, {backgroundColor:'#d9534f'}]}><Text style={styles.btnText}>SİL</Text></TouchableOpacity>
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
};
