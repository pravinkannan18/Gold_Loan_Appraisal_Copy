import { useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from './button';
import { useCameraDetection, CameraContext, CameraDevice } from '@/hooks/useCameraDetection';
import { cn } from '@/lib/utils';

interface PageCameraSelectorProps {
    context: CameraContext;
    label?: string;
    onCameraSelected?: (camera: CameraDevice | null) => void;
    className?: string;
    compact?: boolean;
}

export function PageCameraSelector({
    context,
    label,
    onCameraSelected,
    className = '',
    compact = false,
}: PageCameraSelectorProps) {
    const {
        cameras,
        isLoading,
        error: cameraError,
        permission,
        enumerateDevices,
        getCameraForPage,
        setCameraForPage,
        testCamera,
    } = useCameraDetection();

    const [selectedCamera, setSelectedCamera] = useState<CameraDevice | null>(null);
    const [showDetection, setShowDetection] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    // Auto-load saved camera on mount
    useEffect(() => {
        if (cameras.length > 0) {
            const savedCamera = getCameraForPage(context);
            if (savedCamera) {
                setSelectedCamera(savedCamera);
                onCameraSelected?.(savedCamera);
            } else {
                // Show detection panel if no camera saved
                setShowDetection(true);
            }
        }
    }, [cameras, context, getCameraForPage, onCameraSelected]);

    const handleCameraSelect = (deviceId: string) => {
        const camera = cameras.find(c => c.deviceId === deviceId);
        if (camera) {
            setSelectedCamera(camera);
            setCameraForPage(context, camera);
            onCameraSelected?.(camera);
            setShowDetection(false);
        }
    };

    const handleDetectCameras = async () => {
        await enumerateDevices();
        setShowDetection(true);
    };

    const handleTestCamera = async () => {
        if (!selectedCamera) return;

        setIsTesting(true);
        const result = await testCamera(selectedCamera.deviceId);
        setIsTesting(false);

        if (!result) {
            alert('Camera test failed. The camera might be in use by another application.');
        }
    };

    const handleClearCamera = () => {
        setSelectedCamera(null);
        setCameraForPage(context, null);
        onCameraSelected?.(null);
        setShowDetection(true);
    };

    // Compact mode - just show current selection and detection button
    if (compact) {
        return (
            <div className={cn('inline-flex items-center gap-2', className)}>
                {selectedCamera ? (
                    <>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                            <Check className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">{selectedCamera.label}</span>
                        </div>
                        <Button
                            onClick={() => setShowDetection(!showDetection)}
                            variant="outline"
                            size="sm"
                        >
                            <Camera className="w-4 h-4" />
                        </Button>
                    </>
                ) : (
                    <Button
                        onClick={handleDetectCameras}
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Detecting...
                            </>
                        ) : (
                            <>
                                <Camera className="w-4 h-4 mr-2" />
                                Select Camera
                            </>
                        )}</Button>
                )}

                {/* Detection panel (shown when toggled) */}
                {showDetection && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Select Camera</h3>
                                <button
                                    onClick={() => setShowDetection(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>

                            {cameras.length === 0 ? (
                                <div className="text-center py-6">
                                    <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                                    <p className="text-gray-700 mb-4">No cameras detected</p>
                                    <Button onClick={enumerateDevices} disabled={isLoading}>
                                        <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
                                        Detect Cameras
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {cameras.map(camera => (
                                        <button
                                            key={camera.deviceId}
                                            onClick={() => handleCameraSelect(camera.deviceId)}
                                            className={cn(
                                                'w-full text-left px-4 py-3 rounded-lg border-2 transition-all',
                                                selectedCamera?.deviceId === camera.deviceId
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                {selectedCamera?.deviceId === camera.deviceId && (
                                                    <Check className="w-4 h-4 text-blue-600" />
                                                )}
                                                <span className="font-medium text-sm">{camera.label}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Full mode - complete camera selector
    return (
        <div className={cn('bg-white rounded-xl border-2 border-gray-200 p-4', className)}>
            <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Camera className="w-4 h-4" />
                    {label || 'Camera'}
                </label>
                <Button
                    onClick={handleDetectCameras}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                </Button>
            </div>

            {permission.status === 'denied' && (
                <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-700">
                            {permission.error || 'Camera permission denied'}
                        </div>
                    </div>
                </div>
            )}

            {cameraError && (
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">{cameraError}</p>
                </div>
            )}

            {isLoading ? (
                <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Detecting cameras...</p>
                </div>
            ) : cameras.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                    <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No cameras detected</p>
                    <p className="text-xs text-gray-500 mt-1">Click refresh to detect</p>
                </div>
            ) : (
                <div>
                    <select
                        value={selectedCamera?.deviceId || ''}
                        onChange={(e) => handleCameraSelect(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                    >
                        <option value="">Select camera...</option>
                        {cameras.map(camera => (
                            <option key={camera.deviceId} value={camera.deviceId}>
                                {camera.label}
                            </option>
                        ))}
                    </select>

                    {selectedCamera && (
                        <div className="mt-3 space-y-2">
                            <div className="flex items-center gap-2 text-xs bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <span className="text-green-800 flex-1">
                                    {selectedCamera.label}
                                </span>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    onClick={handleTestCamera}
                                    variant="outline"
                                    size="sm"
                                    disabled={isTesting}
                                    className="flex-1"
                                >
                                    {isTesting ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                            Testing...
                                        </>
                                    ) : (
                                        <>
                                            <Camera className="w-4 h-4 mr-2" />
                                            Test Camera
                                        </>
                                    )}
                                </Button>
                                <Button
                                    onClick={handleClearCamera}
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                >
                                    Clear
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
