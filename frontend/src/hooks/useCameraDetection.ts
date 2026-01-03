import { useState, useEffect, useCallback, useRef } from 'react';

export interface CameraDevice {
  deviceId: string;
  groupId: string;
  kind: 'videoinput';
  label: string;
  index?: number;
}

export interface CameraSelection {
  faceCam: CameraDevice | null;
  scanCam: CameraDevice | null;
  allDevices: CameraDevice[];
}

export interface CameraPermissionState {
  status: 'prompt' | 'granted' | 'denied' | 'checking';
  error: string | null;
}

const FACE_KEYWORDS = ['front', 'internal', 'integrated', 'face', 'built-in', 'webcam', 'ir camera'];
const SCAN_KEYWORDS = ['usb', 'external', 'barcode', 'document', 'logitech', 'back', 'rear'];

export const useCameraDetection = () => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedFaceCam, setSelectedFaceCam] = useState<CameraDevice | null>(null);
  const [selectedScanCam, setSelectedScanCam] = useState<CameraDevice | null>(null);
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
   * Smart camera selection based on device labels
   */
  const smartSelectCameras = useCallback((devices: CameraDevice[]): CameraSelection => {
    if (devices.length === 0) {
      return { faceCam: null, scanCam: null, allDevices: [] };
    }

    // Find face camera (internal/built-in camera)
    let faceCam = devices.find(device =>
      device.label && FACE_KEYWORDS.some(keyword =>
        device.label.toLowerCase().includes(keyword)
      )
    ) || devices[0]; // Fallback to first device

    // Find scan camera (external/USB camera)
    let scanCam = devices.find(device =>
      device.label && SCAN_KEYWORDS.some(keyword =>
        device.label.toLowerCase().includes(keyword)
      )
    );

    // If no scan camera found, use second device or same as face cam
    if (!scanCam) {
      scanCam = devices.length > 1 ? devices[1] : devices[0];
    }

    return { faceCam, scanCam, allDevices: devices };
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
          return;
        }
      }

      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices
        .filter(device => device.kind === 'videoinput')
        .map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label,
          groupId: device.groupId,
          kind: 'videoinput' as const,
          index,
        }));

      setCameras(videoInputs);

      // Check if we have stored preferences
      const storedFaceCam = localStorage.getItem('selectedFaceCam');
      const storedScanCam = localStorage.getItem('selectedScanCam');

      let faceCam: CameraDevice | null = null;
      let scanCam: CameraDevice | null = null;

      // Try to restore from localStorage
      if (storedFaceCam) {
        faceCam = videoInputs.find(d => d.deviceId === storedFaceCam) || null;
      }
      if (storedScanCam) {
        scanCam = videoInputs.find(d => d.deviceId === storedScanCam) || null;
      }

      // If no stored preferences or devices not found, don't auto-select
      // (User must now select manually as per requirements)
      if (!faceCam || !scanCam) {
        console.log('📹 Manual selection required - no auto-selection applied');
      }

      setSelectedFaceCam(faceCam);
      setSelectedScanCam(scanCam);

      console.log('📹 Detected cameras:', {
        total: videoInputs.length,
        faceCam: faceCam?.label || 'None',
        scanCam: scanCam?.label || 'None',
      });

      setIsLoading(false);
    } catch (error: any) {
      console.error('Device enumeration failed:', error);
      setError('Failed to enumerate camera devices: ' + error.message);
      setIsLoading(false);
    }
  }, [checkPermission, requestPermission, smartSelectCameras]);

  /**
   * Manually select a camera
   */
  const selectFaceCam = useCallback((device: CameraDevice | null) => {
    setSelectedFaceCam(device);
    if (device) {
      localStorage.setItem('selectedFaceCam', device.deviceId);
    } else {
      localStorage.removeItem('selectedFaceCam');
    }
  }, []);

  const selectScanCam = useCallback((device: CameraDevice | null) => {
    setSelectedScanCam(device);
    if (device) {
      localStorage.setItem('selectedScanCam', device.deviceId);
    } else {
      localStorage.removeItem('selectedScanCam');
    }
  }, []);

  /**
   * Reset to smart auto-selection
   */
  const resetToAutoSelection = useCallback(() => {
    localStorage.removeItem('selectedFaceCam');
    localStorage.removeItem('selectedScanCam');

    const smartSelection = smartSelectCameras(cameras);
    setSelectedFaceCam(smartSelection.faceCam);
    setSelectedScanCam(smartSelection.scanCam);
  }, [cameras, smartSelectCameras]);

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

    // Note: We can't enumerate and stop all streams here because
    // getUserMedia creates new streams. Instead, we just ensure
    // our internal streams are stopped. The page should handle
    // stopping any video element streams before calling this.
    console.log('✓ All internal streams stopped');
  }, []);

  return {
    // State
    cameras,
    selectedFaceCam,
    selectedScanCam,
    permission,
    isLoading,
    error,

    // Actions
    enumerateDevices,
    selectFaceCam,
    selectScanCam,
    resetToAutoSelection,
    testCamera,
    requestPermission,
    stopAllStreams,
  };
};
