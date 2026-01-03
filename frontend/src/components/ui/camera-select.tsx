import React, { useState, useRef, useEffect } from 'react';
import { Button } from './button';
import { Camera, CheckCircle2, XCircle, Video, AlertCircle, RefreshCw } from 'lucide-react';
import { CameraDevice } from '../../hooks/useCameraDetection';

interface CameraSelectProps {
  label: string;
  devices: CameraDevice[];
  selectedDevice: CameraDevice | null;
  onSelect: (device: CameraDevice) => void;
  onTest?: (deviceId: string) => Promise<boolean>;
  className?: string;
  onStopPreview?: () => void;
}

export const CameraSelect = React.forwardRef<{ stopPreview: () => void }, CameraSelectProps>((
  {
    label,
    devices,
    selectedDevice,
    onSelect,
    onTest,
    className = '',
  },
  ref
) => {
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleTest = async () => {
    if (!selectedDevice || !onTest) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    const result = await onTest(selectedDevice.deviceId);
    setTestResult(result ? 'success' : 'error');
    setIsTesting(false);
    
    // Clear result after 3 seconds
    setTimeout(() => setTestResult(null), 3000);
  };

  const startPreview = async () => {
    if (!selectedDevice) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: selectedDevice.deviceId } },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Failed to start preview:', error);
    }
  };

  const stopPreview = () => {
    if (streamRef.current) {
      console.log('🛑 Stopping camera preview stream...');
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('  ✓ Stopped track:', track.label);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowPreview(false);
  };

  // Expose stopPreview to parent via ref
  React.useImperativeHandle(ref, () => ({
    stopPreview,
  }));

  // Stop preview when device changes
  useEffect(() => {
    stopPreview();
  }, [selectedDevice?.deviceId]);

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-semibold text-gray-700">
        {label}
      </label>

      <div className="flex gap-2">
        <select
          value={selectedDevice?.deviceId || ''}
          onChange={(e) => {
            const device = devices.find(d => d.deviceId === e.target.value);
            if (device) onSelect(device);
          }}
          className="flex-1 px-4 py-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-mono text-sm"
        >
          <option value="">Select camera...</option>
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.index || 0}`}
            </option>
          ))}
        </select>

        {onTest && selectedDevice && (
          <Button
            onClick={handleTest}
            disabled={isTesting}
            variant="outline"
            size="sm"
            className="px-3"
          >
            {isTesting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : testResult === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : testResult === 'error' ? (
              <XCircle className="w-4 h-4 text-red-600" />
            ) : (
              <Video className="w-4 h-4" />
            )}
          </Button>
        )}

        {selectedDevice && (
          <Button
            onClick={showPreview ? stopPreview : startPreview}
            variant="outline"
            size="sm"
            className="px-3"
          >
            <Camera className="w-4 h-4" />
          </Button>
        )}
      </div>

      {selectedDevice && (
        <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <span className="font-semibold text-green-800">Selected:</span>
            <span className="ml-2 font-mono text-green-700">{selectedDevice.label}</span>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="relative rounded-xl overflow-hidden border-2 border-blue-300 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-48 object-cover"
          />
          <div className="absolute top-2 right-2">
            <button
              onClick={stopPreview}
              className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs rounded-md"
            >
              Stop Preview
            </button>
          </div>
        </div>
      )}

      {testResult === 'error' && (
        <div className="flex items-center gap-2 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span className="text-red-700">Camera test failed. Device may be in use.</span>
        </div>
      )}
    </div>
  );
});
