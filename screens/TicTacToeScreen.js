import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function TicTacToeScreen({ navigation }) {
  const { isDark } = useTheme();
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);

  const bg = isDark ? '#121212' : '#F5F5F7';
  const textMain = isDark ? '#FFFFFF' : '#000000';
  const cardBg = isDark ? '#1E1E1E' : '#FFFFFF';
  const borderCol = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

  // जीतने वाले को चेक करने का लॉजिक
  const checkWinner = (squares) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) return squares[a];
    }
    return null;
  };

  const winner = checkWinner(board);

  const handlePress = (index) => {
    if (board[index] || winner) return; // अगर बॉक्स भरा है या कोई जीत गया है, तो कुछ मत करो
    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
  };

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="close" size={28} color={textMain} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textMain }]}>Tic-Tac-Toe Portal</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Game Area */}
      <View style={styles.gameArea}>
        <Text style={[styles.status, { color: textMain }]}>
          {winner ? `Winner: ${winner} 🏆` : `Next Player: ${isXNext ? 'X' : 'O'}`}
        </Text>

        <View style={[styles.board, { backgroundColor: cardBg, borderColor: borderCol }]}>
          {board.map((cell, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.cell, { borderColor: borderCol, borderRightWidth: (index + 1) % 3 === 0 ? 0 : 1, borderBottomWidth: index >= 6 ? 0 : 1 }]} 
              onPress={() => handlePress(index)}
            >
              <Text style={[styles.cellText, { color: cell === 'X' ? '#FF3B30' : '#007AFF' }]}>{cell}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={resetGame}>
          <Text style={styles.resetText}>Restart Game</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 45, paddingBottom: 15, paddingHorizontal: 20 },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  gameArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 50 },
  status: { fontSize: 24, fontWeight: 'bold', marginBottom: 40 },
  board: { width: 300, height: 300, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderRadius: 15, overflow: 'hidden' },
  cell: { width: '33.33%', height: '33.33%', justifyContent: 'center', alignItems: 'center' },
  cellText: { fontSize: 40, fontWeight: 'bold' },
  resetBtn: { marginTop: 50, backgroundColor: '#007AFF', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25 },
  resetText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});
