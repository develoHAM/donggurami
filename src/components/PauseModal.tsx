import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  visible: boolean;
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export function PauseModal({ visible, onResume, onRestart, onHome }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Paused</Text>
          <Btn label="Resume" primary onPress={onResume} />
          <Btn label="Restart" onPress={onRestart} />
          <Btn label="Home" onPress={onHome} />
        </View>
      </View>
    </Modal>
  );
}

function Btn({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable style={[styles.btn, primary && styles.btnPrimary]} onPress={onPress}>
      <Text style={[styles.btnText, primary && styles.btnTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#FFF7EC', borderRadius: 20, padding: 24, width: 260, gap: 10 },
  title: { fontSize: 24, fontWeight: '800', color: '#5C4033', textAlign: 'center', marginBottom: 8 },
  btn: { backgroundColor: '#EADBC8', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#E2553B' },
  btnText: { fontSize: 16, fontWeight: '700', color: '#5C4033' },
  btnTextPrimary: { color: '#fff' },
});
