import { useState, useEffect, useCallback, useRef } from 'react';

export interface CameraDevice {
  deviceId: string;
  groupId: string;
  kind: 'videoinput';
  label: string;
  index?: number;
}

export interface CameraPermissionState {
  status: 'prompt' | 'granted' | 'denied' | 'checking';
  error: string | null;
}

// Page contexts for camera selection
export type CameraContext =
  | 'appraiser-identification'
  | 'customer-image-capture'
  | 'purity-testing'
  | 'rbi-compliance'
  | 'general';

const FACE_KEYWORDS = ['front', 'internal', 'integrated', 'face', 'built-in', 'webcam', 'ir camera'];
const SCAN_KEYWORDS = ['usb', 'external', 'barcode', 'document', 'logitech', 'back', 'rear'];

// LocalStorage key generator for page-specific cameras
const getCameraStorageKey = (context: CameraContext) => `camera_${context}`;

export const useCameraDetection = () => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [permission, setPermission] = useState<CameraPermissionState>({
    status: 'checking',
    error: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store cleanup function for temporary stream
  const tempStreamRef = useRef<MediaStream | null>(null);

  /**
   * Check camera permission status
   */
  const checkPermission = useCallback(async () => {
    try {
      // Check if Permissions API is supported
      if ('permissions' in navigator) {
        const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermission({ status: permissionStatus.state as any, error: null });

        // Listen for permission changes
        permissionStatus.onchange = () => {
          setPermission({ status: permissionStatus.state as any, error: null });
        };

        return permissionStatus.state;
      } else {
        // Fallback: assume we need to request
        setPermission({ status: 'prompt', error: null });
        return 'prompt';
      }
    } catch (error) {
      console.error('Permission check failed:', error);
      setPermission({ status: 'prompt', error: null });
      return 'prompt';
    }
  }, []);

  /**
   * Request camera permission by getting temporary stream
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setPermission({ status: 'checking', error: null });

      // Request camera access to unlock device labels
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      tempStreamRef.current = stream;

      // Stop the stream immediately - we just needed it for permission
      stream.getTracks().forEach(track => track.stop());
      tempStreamRef.current = null;

      setPermission({ status: 'granted', error: null });
      return true;
    } catch (error: any) {
      console.error('Permission request failed:', error);

      let errorMessage = 'Camera access denied';
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No camera devices found on this system.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Camera is in use by another application.';
      }

      setPermission({ status: 'denied', error: errorMessage });
      setError(errorMessage);
      return false;
    }
  }, []);

  /**
   * Enumerate all video input devices
   */
  const enumerateDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check permission first
      const permStatus = await checkPermission();

      // If permission not granted, request it
      if (permStatus !== 'granted') {
        const granted = await requestPermission();
        if (!granted) {
          setIsLoading(false);
          return [];
        }
      }

      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices
        .filter(device => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`,
          groupId: device.groupId,
          kind: 'videoinput' as const,
          index,
        }));

      setCameras(videoInputs);

      console.log('📹 Detected cameras:', {
        total: videoInputs.length,
        cameras: videoInputs.map(c => c.label),
      });

      setIsLoading(false);
      return videoInputs;
    } catch (error: any) {
      console.error('Device enumeration failed:', error);
      setError('Failed to enumerate camera devices: ' + error.message);
      setIsLoading(false);
      return [];
    }
  }, [checkPermission, requestPermission]);

  /**
   * Get saved camera for specific page/context
   */
  const getCameraForPage = useCallback((context: CameraContext): CameraDevice | null => {
    const storageKey = getCameraStorageKey(context);
    const savedDeviceId = localStorage.getItem(storageKey);

    if (!savedDeviceId) {
      return null;
    }

    // Note: cameras state might be empty on first render, so we might need to find it 
    // after enumeration. For now, we try to find it in the current list.
    // If cameras list is empty, this returns undefined/null, effectively waiting for enumeration.
    const camera = cameras.find(c => c.deviceId === savedDeviceId);

    if (camera) {
      console.log(`📹 Auto-loaded ${context} camera:`, camera.label);
      return camera;
    } else if (cameras.length > 0) {
      // Only warn if we have cameras but couldn't find the saved one
      console.warn(`⚠️ Saved ${context} camera not found in current device list`);
      // Optional: don't clear it immediately in case of temporary glitche, 
      // but strictly speaking if it's not in enumerated list, it's gone.
      return null;
    }
    return null;
  }, [cameras]);

  /**
   * Save camera for specific page/context
   */
  const setCameraForPage = useCallback((context: CameraContext, camera: CameraDevice | null) => {
    const storageKey = getCameraStorageKey(context);

    if (camera) {
      localStorage.setItem(storageKey, camera.deviceId);
      console.log(`✅ Saved ${context} camera:`, camera.label);
    } else {
      localStorage.removeItem(storageKey);
      console.log(`🗑️ Cleared ${context} camera`);
    }
  }, []);

  /**
   * Get all saved cameras (for dashboard overview)
   */
  const getAllSavedCameras = useCallback((): Record<CameraContext, CameraDevice | null> => {
    const contexts: CameraContext[] = [
      'appraiser-identification',
      'customer-image-capture',
      'purity-testing',
      'rbi-compliance',
      'general',
    ];

    const savedCameras: Record<string, CameraDevice | null> = {};

    contexts.forEach(context => {
      savedCameras[context] = getCameraForPage(context);
    });

    return savedCameras as Record<CameraContext, CameraDevice | null>;
  }, [getCameraForPage]);

  /**
   * Clear all saved cameras
   */
  const clearAllCameras = useCallback(() => {
    const contexts: CameraContext[] = [
      'appraiser-identification',
      'customer-image-capture',
      'purity-testing',
      'rbi-compliance',
      'general',
    ];

    contexts.forEach(context => {
      const storageKey = getCameraStorageKey(context);
      localStorage.removeItem(storageKey);
    });

    console.log('🗑️ All camera settings cleared');
  }, []);

  /**
   * Test camera by getting a stream
   */
  const testCamera = useCallback(async (deviceId: string): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });

      // Camera works! Stop the stream
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Camera test failed:', error);
      return false;
    }
  }, []);

  /**
   * Handle hot-plugging: detect when cameras are added/removed
   */
  useEffect(() => {
    const handleDeviceChange = () => {
      console.log('📹 Camera devices changed, re-enumerating...');
      enumerateDevices();
    };

    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enumerateDevices]);

  /**
   * Initial enumeration on mount
   */
  useEffect(() => {
    enumerateDevices();

    // Cleanup temp stream on unmount
    return () => {
      if (tempStreamRef.current) {
        tempStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [enumerateDevices]);

  /**
   * Stop all active camera streams (call before backend access)
   */
  const stopAllStreams = useCallback(() => {
    console.log('🛑 Stopping all camera streams...');

    // Stop temp stream if exists
    if (tempStreamRef.current) {
      tempStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('  ✓ Stopped temp stream track');
      });
      tempStreamRef.current = null;
    }

    console.log('✓ All internal streams stopped');
  }, []);

  return {
    // State
    cameras,
    permission,
    isLoading,
    error,

    // Actions
    enumerateDevices,
    getCameraForPage,
    setCameraForPage,
    getAllSavedCameras,
    clearAllCameras,
    testCamera,
    requestPermission,
    stopAllStreams,
  };
};
