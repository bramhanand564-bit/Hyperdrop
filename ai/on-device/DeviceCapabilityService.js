import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as FileSystem from 'expo-file-system/legacy';

const GB = 1024 ** 3;
const MB = 1024 ** 2;

const DeviceCapabilityService = {
  async scan() {
    const freeStorage = await FileSystem.getFreeDiskStorageAsync().catch(() => null);
    const totalMemory = Device.totalMemory || null;
    const maxMemory = Platform.OS === 'android' ? await Device.getMaxMemoryAsync().catch(() => null) : null;
    const architectures = Device.supportedCpuArchitectures || [];
    const is64Bit = architectures.some(value => /arm64|x86_64|64/i.test(String(value)));
    const runtimeSupported = is64Bit;
    const safeRamBudget = totalMemory ? Math.max(512 * MB, Math.floor(totalMemory * 0.35)) : null;
    return {
      platform: Platform.OS,
      osVersion: String(Device.osVersion || 'unknown'),
      manufacturer: Device.manufacturer || 'unknown',
      model: Device.modelName || Device.productName || 'unknown',
      ramBytes: totalMemory,
      ramGB: totalMemory ? +(totalMemory / GB).toFixed(2) : null,
      maxAppMemoryBytes: maxMemory,
      freeStorageBytes: freeStorage,
      freeStorageGB: freeStorage ? +(freeStorage / GB).toFixed(2) : null,
      architectures,
      is64Bit,
      gpuBackend: Platform.OS === 'ios' ? 'Metal' : 'CPU / OpenCL when available',
      runtimeSupported,
      safeRamBudgetMB: Math.round(safeRamBudget / MB),
      scannedAt: Date.now(),
    };
  },
};

export default DeviceCapabilityService;
