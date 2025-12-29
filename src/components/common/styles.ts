import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
export const FRAME_WIDTH = width * 0.8;
export const FRAME_HEIGHT = FRAME_WIDTH * 0.4;

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
