import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Gem, Play, Square, AlertCircle, ScanLine, RefreshCw, Wifi, WifiOff, Video, VideoOff } from 'lucide-react';
import { StepIndicator } from '../components/journey/StepIndicator';
import { showToast } from '../lib/utils';
import { Button } from '../components/ui/button';
import { PageCameraSelector } from '../components/ui/page-camera-selector';
import { useCameraDetection } from '../hooks/useCameraDetection';
import { webrtcService, type SessionStatus } from '../services/webrtc';

/**
 * WebRTC-based Purity Testing Page
 * Uses WebRTC for ultra-low latency video streaming with backend AI inference
 */
export function WebRTCPurityTesting() {
    const navigate = useNavigate();

    // Camera state
    const [selectedCameraId, setSelectedCameraId] = useState<string>('');
    const [showCameraSelection, setShowCameraSelection] = useState(true);

    // WebRTC state
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionState, setConnectionState] = useState<string>('disconnected');
    const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);

    // Analysis state
    const [rubbingCompleted, setRubbingCompleted] = useState(false);
    const [acidCompleted, setAcidCompleted] = useState(false);
    const [currentTask, setCurrentTask] = useState<'rubbing' | 'acid' | 'done'>('rubbing');

    // Video refs
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    // Annotated frame for WebSocket mode
    const [annotatedFrame, setAnnotatedFrame] = useState<string | null>(null);
    const [connectionMode, setConnectionMode] = useState<'webrtc' | 'websocket' | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    // Camera detection hook
    const {
        cameras,
        permission,
        isLoading: cameraLoading,
        error: cameraError,
        enumerateDevices,
        requestPermission,
    } = useCameraDetection();

    // Auto-request camera permission
    useEffect(() => {
        if (permission.status === 'prompt') {
            requestPermission();
        }
    }, [permission.status, requestPermission]);

    // Handle remote stream from WebRTC
    const handleRemoteStream = useCallback((stream: MediaStream) => {
        console.log('🎬 Received remote stream with', stream.getTracks().length, 'tracks');
        setRemoteStream(stream);
    }, []);

    // Apply remote stream to video element when available
    useEffect(() => {
        if (remoteStream && remoteVideoRef.current) {
            console.log('🎬 Applying remote stream to video element');
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [remoteStream]);

    // Handle session status updates
    const handleStatusChange = useCallback((status: SessionStatus) => {
        setSessionStatus(status);

        // Update local state from session
        if (status.detection_status) {
            if (status.detection_status.rubbing_detected && !rubbingCompleted) {
                setRubbingCompleted(true);
                showToast('✅ Rubbing Test Detected!', 'success');
            }
            if (status.detection_status.acid_detected && !acidCompleted) {
                setAcidCompleted(true);
                showToast('✅ Acid Test Detected!', 'success');
            }
        }

        setCurrentTask(status.current_task);
    }, [rubbingCompleted, acidCompleted]);

    // Handle annotated frames (WebSocket mode)
    const handleAnnotatedFrame = useCallback((frame: string) => {
        setAnnotatedFrame(frame);
    }, []);

    // Handle connection state changes
    const handleConnectionStateChange = useCallback((state: string) => {
        console.log('🔗 Connection state changed:', state);
        setConnectionState(state);
        setIsConnected(state === 'connected');

        // Update mode
        const mode = webrtcService.getMode();
        if (mode) setConnectionMode(mode);

        if (state === 'failed' || state === 'disconnected') {
            showToast('WebRTC connection lost', 'error');
        }
    }, []);

    // Setup WebRTC callbacks
    useEffect(() => {
        webrtcService.setOnRemoteStream(handleRemoteStream);
        webrtcService.setOnAnnotatedFrame(handleAnnotatedFrame);
        webrtcService.setOnStatusChange(handleStatusChange);
        webrtcService.setOnConnectionStateChange(handleConnectionStateChange);

        return () => {
            // Cleanup on unmount
            webrtcService.disconnect();
        };
    }, [handleRemoteStream, handleStatusChange, handleConnectionStateChange]);

    // Connect to WebRTC
    const connectWebRTC = async () => {
        if (!selectedCameraId) {
            showToast('Please select a camera first', 'error');
            return;
        }

        setIsConnecting(true);
        try {
            const session = await webrtcService.connect(
                localVideoRef.current || undefined,
                selectedCameraId
            );

            if (session) {
                setIsConnected(true);
                setConnectionMode(session.mode);
                showToast(`✅ Connected (${session.mode} mode)!`, 'success');
            }
        } catch (error) {
            console.error('WebRTC connection failed:', error);
            showToast('Failed to connect WebRTC', 'error');
        } finally {
            setIsConnecting(false);
        }
    };

    // Disconnect WebRTC
    const disconnectWebRTC = async () => {
        await webrtcService.disconnect();
        setIsConnected(false);
        setSessionStatus(null);
        showToast('WebRTC disconnected', 'info');
    };

    // Toggle connection
    const toggleConnection = async () => {
        if (isConnected) {
            await disconnectWebRTC();
        } else {
            await connectWebRTC();
        }
    };

    // Switch task (rubbing → acid → done)
    const switchTask = async (task: 'rubbing' | 'acid' | 'done') => {
        const success = await webrtcService.setTask(task);
        if (success) {
            setCurrentTask(task);
            showToast(`Switched to ${task} mode`, 'success');
        } else {
            showToast('Failed to switch task', 'error');
        }
    };

    // Reset session
    const resetSession = async () => {
        const success = await webrtcService.reset();
        if (success) {
            setRubbingCompleted(false);
            setAcidCompleted(false);
            setCurrentTask('rubbing');
            showToast('Session reset', 'info');
        }
    };

    // Handle next step
    const handleNext = () => {
        if (!rubbingCompleted || !acidCompleted) {
            showToast('Complete both rubbing and acid tests', 'error');
            return;
        }

        // Save results
        const testResults = {
            rubbingCompleted,
            acidCompleted,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('purityResults', JSON.stringify(testResults));

        // Disconnect and navigate
        disconnectWebRTC();
        navigate('/appraisal-summary');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <StepIndicator currentStep={4} />

            <div className="w-full px-6 py-8">
                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 rounded-2xl p-6 mb-6 shadow-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <Gem className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Purity Testing</h1>
                                <p className="text-emerald-100">Real-time AI-powered gold analysis</p>
                            </div>
                        </div>

                        {/* Connection Status */}
                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isConnected
                                ? 'bg-green-500/20 text-green-200 border border-green-400/30'
                                : 'bg-red-500/20 text-red-200 border border-red-400/30'
                                }`}>
                                {isConnected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                                <span className="font-medium">{connectionState}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Camera Selection */}
                {showCameraSelection && (
                    <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center">
                                <ScanLine className="w-6 h-6 mr-2 text-emerald-400" />
                                Camera Selection
                            </h3>
                            <div className="flex gap-2">
                                <Button onClick={enumerateDevices} disabled={cameraLoading} variant="outline" size="sm">
                                    {cameraLoading ? (
                                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Scanning...</>
                                    ) : (
                                        <><RefreshCw className="w-4 h-4 mr-2" /> Refresh</>
                                    )}
                                </Button>
                                <Button onClick={() => setShowCameraSelection(false)} variant="outline" size="sm">
                                    ✕ Close
                                </Button>
                            </div>
                        </div>

                        {permission.status === 'denied' && (
                            <div className="mb-4 p-4 bg-red-900/30 border border-red-500/30 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                                    <p className="text-red-200">Camera permission denied. Please enable in browser settings.</p>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-center">
                            <PageCameraSelector
                                context="purity-testing"
                                label="📹 Select Camera for Analysis"
                                onCameraSelected={(camera) => setSelectedCameraId(camera?.deviceId || '')}
                                className="w-full max-w-md"
                            />
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Video Streams */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Processed Video (from backend) */}
                        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-lg font-bold text-white flex items-center">
                                    <Video className="w-5 h-5 mr-2 text-emerald-400" />
                                    AI-Annotated Stream
                                </h4>
                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${isConnected ? 'bg-green-500/20 text-green-300' : 'bg-slate-600 text-slate-300'
                                    }`}>
                                    {isConnected ? '🔴 LIVE' : 'Offline'}
                                </div>
                            </div>

                            <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border-2 border-emerald-500/30">
                                {/* Remote video stream (always rendered for ref, visible in WebRTC mode) */}
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`w-full h-full object-cover ${connectionMode !== 'webrtc' ? 'hidden' : ''}`}
                                />

                                {/* WebSocket mode: show annotated frame as image */}
                                {connectionMode === 'websocket' && annotatedFrame && (
                                    <img
                                        src={annotatedFrame}
                                        alt="AI Analysis"
                                        className="w-full h-full object-cover"
                                    />
                                )}

                                {!isConnected && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90">
                                        <VideoOff className="w-16 h-16 text-slate-500 mb-4" />
                                        <p className="text-slate-400 text-lg">Connect to start analysis</p>
                                    </div>
                                )}

                                {/* Mode indicator */}
                                {isConnected && connectionMode && (
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
                                        {connectionMode.toUpperCase()} mode
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Local Video Preview (small) */}
                        <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700">
                            <h5 className="text-sm font-medium text-slate-300 mb-2">Local Camera Preview</h5>
                            <div className="relative aspect-video max-h-40 bg-slate-900 rounded-lg overflow-hidden">
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Controls Panel */}
                    <div className="space-y-4">
                        {/* Connection Controls */}
                        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700">
                            <h4 className="text-lg font-bold text-white mb-4">Connection</h4>

                            <Button
                                onClick={toggleConnection}
                                disabled={!selectedCameraId || isConnecting}
                                className={`w-full py-6 text-lg font-bold ${isConnected
                                    ? 'bg-red-500 hover:bg-red-600'
                                    : 'bg-emerald-500 hover:bg-emerald-600'
                                    }`}
                            >
                                {isConnecting ? (
                                    <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Connecting...</>
                                ) : isConnected ? (
                                    <><Square className="w-5 h-5 mr-2" /> Disconnect</>
                                ) : (
                                    <><Play className="w-5 h-5 mr-2" /> Connect & Analyze</>
                                )}
                            </Button>

                            {isConnected && (
                                <Button
                                    onClick={resetSession}
                                    variant="outline"
                                    className="w-full mt-2 border-slate-600 text-slate-300"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Reset Session
                                </Button>
                            )}
                        </div>

                        {/* Task Switcher */}
                        {isConnected && (
                            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700">
                                <h4 className="text-lg font-bold text-white mb-4">Current Task</h4>

                                <div className="grid grid-cols-3 gap-2">
                                    {(['rubbing', 'acid', 'done'] as const).map((task) => (
                                        <Button
                                            key={task}
                                            onClick={() => switchTask(task)}
                                            variant={currentTask === task ? 'default' : 'outline'}
                                            className={`capitalize ${currentTask === task
                                                ? 'bg-emerald-500 text-white'
                                                : 'border-slate-600 text-slate-300'
                                                }`}
                                        >
                                            {task}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Detection Status */}
                        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700">
                            <h4 className="text-lg font-bold text-white mb-4">Detection Status</h4>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                    <span className="text-slate-300">Rubbing Test</span>
                                    <span className={`font-bold ${rubbingCompleted ? 'text-green-400' : 'text-amber-400'}`}>
                                        {rubbingCompleted ? '✅ Detected' : '⏳ Pending'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                    <span className="text-slate-300">Acid Test</span>
                                    <span className={`font-bold ${acidCompleted ? 'text-green-400' : 'text-amber-400'}`}>
                                        {acidCompleted ? '✅ Detected' : '⏳ Pending'}
                                    </span>
                                </div>

                                {sessionStatus?.detection_status?.gold_purity && (
                                    <div className="flex items-center justify-between p-3 bg-amber-900/30 rounded-lg border border-amber-500/30">
                                        <span className="text-amber-200">Gold Purity</span>
                                        <span className="font-bold text-amber-400">
                                            {sessionStatus.detection_status.gold_purity}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Session Info */}
                        {sessionStatus && (
                            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700 text-sm">
                                <div className="text-slate-400 space-y-1">
                                    <div>Session: <span className="text-slate-200">{sessionStatus.session_id}</span></div>
                                    <div>Task: <span className="text-emerald-400">{sessionStatus.current_task}</span></div>
                                    <div>State: <span className="text-slate-200">{sessionStatus.connection_state}</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                    <Button onClick={() => navigate('/rbi-compliance')} variant="outline" className="border-slate-600 text-slate-300">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>

                    <Button
                        onClick={handleNext}
                        disabled={!rubbingCompleted || !acidCompleted}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-8"
                    >
                        Continue to Summary
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default WebRTCPurityTesting;
