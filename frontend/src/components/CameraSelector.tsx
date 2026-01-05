import { useState, useEffect } from 'react';
import { Camera, Video, RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraDevice {
  deviceId: string;
  label: string;
  groupId: string;
}

interface CameraSelectorProps {
  onCameraSelect: (deviceId: string) => void;
  selectedDeviceId?: string;
  className?: string;
  autoDetect?: boolean;
}

export function CameraSelector({
  onCameraSelect,
  selectedDeviceId,
  className = '',
  autoDetect = true
}: CameraSelectorProps) {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const detectCameras = async () => {
    setIsDetecting(true);
    try {
      // Request camera permission first
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);

      // Enumerate devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      const cameraList: CameraDevice[] = videoDevices.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`,
        groupId: device.groupId
      }));

      setCameras(cameraList);

      console.log('📹 Available Cameras:', cameraList.length);
      cameraList.forEach((cam, idx) => {
        console.log(`  [${idx + 1}] ${cam.label} (ID: ${cam.deviceId})`);
      });

      // Auto-select first camera if autoDetect is enabled
      if (autoDetect && cameraList.length > 0 && !selectedDeviceId) {
        onCameraSelect(cameraList[0].deviceId);
      }

    } catch (error: any) {
      console.error('Camera detection error:', error);
      setHasPermission(false);
      setCameras([]);
    } finally {
      setIsDetecting(false);
    }
  };

  useEffect(() => {
    if (autoDetect) {
      detectCameras();
    }
  }, [autoDetect]);

  if (!hasPermission && cameras.length === 0) {
    return (
      <div className={cn("rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800", className)}>
        <div className="flex items-center gap-2 mb-3">
          <Video className="h-4 w-4 text-gray-500" />
          <label className="text-sm font-medium text-gray-900 dark:text-white">Select the Camera</label>
        </div>
        <button
          onClick={detectCameras}
          disabled={isDetecting}
          className="w-full flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isDetecting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Detecting Cameras...
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              Detect Cameras
            </>
          )}
        </button>
      </div>
    );
  }

  if (cameras.length === 0) {
    return (
      <div className={cn("rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20", className)}>
        <div className="flex items-center gap-2 mb-2">
          <Camera className="h-4 w-4 text-red-600 dark:text-red-400" />
          <label className="text-sm font-medium text-red-900 dark:text-red-100">No Cameras Detected</label>
        </div>
        <p className="text-xs text-red-700 dark:text-red-300 mb-3">
          Please connect a camera and try again
        </p>
        <button
          onClick={detectCameras}
          disabled={isDetecting}
          className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={cn("h-4 w-4", isDetecting && "animate-spin")} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 shadow-sm", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <label htmlFor="camera-select" className="text-sm font-medium text-gray-900 dark:text-white">
              Select the Camera
            </label>
          </div>
          
          <div className="relative">
            <select
              id="camera-select"
              value={selectedDeviceId || ''}
              onChange={(e) => onCameraSelect(e.target.value)}
              className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 shadow-sm transition-colors hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:border-gray-500 dark:focus:border-blue-400"
            >
              {cameras.map((camera, index) => (
                <option key={camera.deviceId} value={camera.deviceId}>
                  {camera.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
          </div>

          {cameras.length > 1 && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {cameras.length} cameras available
            </p>
          )}
        </div>

        <button
          onClick={detectCameras}
          disabled={isDetecting}
          title="Refresh camera list"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <RefreshCw className={cn("h-4 w-4", isDetecting && "animate-spin")} />
        </button>
      </div>
    </div>
  );
}
