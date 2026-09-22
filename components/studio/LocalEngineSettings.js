import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

// 🤖 AVAILABLE OPEN-SOURCE MODELS
const LOCAL_MODELS = [
  { id: 'tiny-coder', name: 'TinyCoder 1.1B', size: '680 MB', reqRam: 2, desc: 'Fast code generation.' },
  { id: 'phi-3-mini', name: 'Phi-3 Mini 3.8B', size: '2.2 GB', reqRam: 4, desc: 'Smart logic & chat replies.' },
  { id: 'llama-3-8b', name: 'Llama-3 8B (Q4)', size: '4.7 GB', reqRam: 8, desc: 'Pro level, heavy processing.' }
];

export default function LocalEngineSettings({ selectedModel, setSelectedModel, isDownloaded, onDownload, onDelete }) {
  const { isDark } = useTheme();
  
  // Simulated Device RAM (Real app will use react-native-device-info)
  const [deviceRam, setDeviceRam] = useState(0); 
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  const textMain = isDark ? '#F5F5F7' : '#1C1C1E';
  const textSub = isDark ? '#8E8E93' : '#6C6C70';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const cardBg = isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF';

  useEffect(() => {
    // Simulating hardware scan
    setTimeout(() => {
      setDeviceRam(6); // Maan lo phone mein 6GB RAM hai
      setIsAnalyzing(false);
    }, 1200);
  }, []);

  const getPerformanceTag = (reqRam) => {
    if (isAnalyzing) return { text: 'Analyzing...', color: textSub, icon: 'sync' };
    if (deviceRam >= reqRam + 2) return { text: 'Smooth & Fast', color: '#34C759', icon: 'rocket' };
    if (deviceRam >= reqRam) return { text: 'Good for Chat', color: '#FF9500', icon: 'chatbubbles' };
    return { text: 'Not Recommended (May Crash)', color: '#FF3B30', icon: 'warning' };
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
        <Ionicons name="hardware-chip" size={18} color={textMain} style={{ marginRight: 8 }} />
        <Text style={{ color: textMain, fontSize: 16, fontWeight: 'bold' }}>Hardware Scan</Text>
      </View>

      {isAnalyzing ? (
        <ActivityIndicator size="small" color="#087EFF" style={{ alignSelf: 'flex-start', marginBottom: 20 }} />
      ) : (
        <Text style={{ color: '#087EFF', fontWeight: 'bold', marginBottom: 20 }}>✓ {deviceRam}GB RAM Detected</Text>
      )}

      {LOCAL_MODELS.map((model) => {
        const perf = getPerformanceTag(model.reqRam);
        const isSelected = selectedModel === model.id;

        return (
          <TouchableOpacity 
            key={model.id}
            style={[styles.modelCard, { borderColor: isSelected ? '#087EFF' : borderCol, backgroundColor: isSelected ? 'rgba(8,126,255,0.05)' : cardBg }]}
            onPress={() => setSelectedModel(model.id)}
            activeOpacity={0.8}
          >
            <View style={styles.modelHeader}>
              <Text style={[styles.modelName, { color: textMain }]}>{model.name}</Text>
              <Text style={{ color: textSub, fontSize: 12, fontWeight: 'bold' }}>{model.size}</Text>
            </View>
            
            <Text style={{ color: textSub, fontSize: 12, marginBottom: 12 }}>{model.desc}</Text>

            <View style={[styles.perfBadge, { backgroundColor: `${perf.color}15` }]}>
              <Ionicons name={perf.icon} size={14} color={perf.color} style={{ marginRight: 5 }} />
              <Text style={{ color: perf.color, fontSize: 11, fontWeight: 'bold' }}>{perf.text}</Text>
            </View>

            {isSelected && (
              <View style={[styles.downloadArea, { borderTopColor: borderCol }]}>
                {isDownloaded ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: '#34C759', fontWeight: 'bold', fontSize: 13 }}>✓ Ready to use offline</Text>
                    <TouchableOpacity onPress={onDelete} style={{ padding: 5 }}>
                      <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.downloadBtn} onPress={() => onDownload(model.name)}>
                    <Ionicons name="cloud-download-outline" size={16} color="#087EFF" style={{ marginRight: 6 }} />
                    <Text style={{ color: '#087EFF', fontWeight: 'bold', fontSize: 13 }}>Download to Device</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  modelCard: { padding: 15, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  modelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modelName: { fontSize: 15, fontWeight: 'bold' },
  perfBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  downloadArea: { marginTop: 15, paddingTop: 15, borderTopWidth: 1 },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,126,255,0.1)', paddingVertical: 10, borderRadius: 10 }
});
