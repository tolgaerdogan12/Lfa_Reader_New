import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { styles } from './common/styles';

interface Result {
  ratio: string;
  c_val: string;
  t_val: string;
}

interface ResultScreenProps {
  result: Result;
  onRetake: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ result, onRetake }) => {
  return (
    <View style={styles.container}>
      <View style={styles.resultCard}>
        <Text style={styles.resultTitle}>SONUÇ</Text>
        <Text style={styles.ratioText}>{result.ratio}</Text>
        <View style={styles.row}>
          <View style={styles.box}><Text style={styles.label}>C</Text><Text style={styles.value}>{result.c_val}</Text></View>
          <View style={styles.box}><Text style={styles.label}>T</Text><Text style={styles.value}>{result.t_val}</Text></View>
        </View>
        <TouchableOpacity style={styles.btnRetake} onPress={onRetake}><Text style={[styles.btnText, {color:'black'}]}>TAMAM</Text></TouchableOpacity>
      </View>
    </View>
  );
};
