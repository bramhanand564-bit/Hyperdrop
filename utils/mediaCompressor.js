// ==========================================
// FILE: utils/mediaCompressor.js
// ==========================================
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Video } from 'react-native-compressor'; 

// 📏 1. HELPER: फाइल का साइज़ (MB में) निकालने का फंक्शन
export const getFileSizeMB = async (fileUri) => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) return 0;
    return fileInfo.size / (1024 * 1024); // Bytes to MB
  } catch (error) {
    console.log("Error getting file size:", error);
    return 0;
  }
};

// 📷 2. SMART IMAGE COMPRESSOR (तुम्हारा 1MB वाला रूल)
export const compressImage = async (fileUri, fileSizeMB) => {
  try {
    // 🚀 RULE: अगर फोटो 1MB से छोटी है, तो उसे बिल्कुल मत छेड़ो (Original return करो)
    if (fileSizeMB <= 1.0) {
      return fileUri; 
    }

    // 📉 RULE: 1MB से बड़ी है, तो width 1080p और quality 70% कर दो (WhatsApp Standard)
    const manipResult = await ImageManipulator.manipulateAsync(
      fileUri,
      [{ resize: { width: 1080 } }], // Height apne aap set ho jayegi (Aspect Ratio maintain rahega)
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipResult.uri;
  } catch (error) {
    console.log("Image compression failed:", error);
    return fileUri; // Error aaye to original file bhej do
  }
};

// 🎥 3. SMART VIDEO COMPRESSOR (तुम्हारा 480p वाला मास्टरस्ट्रोक)
export const compressVideo = async (fileUri) => {
  try {
    // Ye library magically video ko 480p aur best bitrate me convert kar degi
    const compressedUri = await Video.compress(
      fileUri,
      {
        compressionMethod: 'auto', 
        minimumFileSizeForCompress: 5, // 5MB se chhoti video ko compress nahi karega
        maxSize: 480, // 🚀 480p (SD Quality) - Data & Storage saver!
      }
    );
    return compressedUri;
  } catch (error) {
    console.log("Video compression failed:", error);
    return fileUri; // Error aaye to original file bhej do
  }
};

// 🚀 4. MAIN PROCESSOR: जो फाइल को चेक करेगा और लिमिट लगाएगा
// qualityMode: 'standard' (Compress) ya 'original' (No compress)
export const processMediaForUpload = async (fileUri, type, qualityMode = 'standard') => {
  const sizeMB = await getFileSizeMB(fileUri);

  // 🛑 RULE: 250MB LIMIT FOR 'ORIGINAL' MODE
  if (qualityMode === 'original' && sizeMB > 250) {
    throw new Error('FILE_TOO_LARGE'); // Ise hum Chat UI me pakad kar Alert dikhayenge
  }

  // Agar user ne 'Original' select kiya hai aur size limit me hai, to seedha bhej do
  if (qualityMode === 'original') {
    return { processedUri: fileUri, finalSizeMB: sizeMB }; 
  }

  // 📉 'STANDARD' MODE: Apply Smart Compression
  let processedUri = fileUri;

  if (type === 'image') {
    processedUri = await compressImage(fileUri, sizeMB);
  } else if (type === 'video') {
    processedUri = await compressVideo(fileUri);
  }

  const finalSizeMB = await getFileSizeMB(processedUri); // Compression ke baad naya size
  
  return { processedUri, finalSizeMB };
};
