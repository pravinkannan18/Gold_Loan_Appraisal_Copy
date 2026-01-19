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
        console.log('📊 Status update:', status);
        setSessionStatus(status);

        // Update local state from session
        if (status.detection_status) {
            // Rubbing detected - backend auto-switches to acid task
            if (status.detection_status.rubbing_detected) {
                setRubbingCompleted(true);
            }
            
            // Acid detected - backend auto-switches to done task
            if (status.detection_status.acid_detected) {
                setAcidCompleted(true);
            }
        }

        // Update current task from backend (backend handles auto-switching)
        console.log('📋 Task update:', status.current_task);
        setCurrentTask(status.current_task);
    }, []); // No dependencies - uses setters which are stable

    // Auto-navigate to summary page when both tests are complete
    useEffect(() => {
        if (rubbingCompleted && acidCompleted && currentTask === 'done') {
            console.log('🎉 Both tests complete! Navigating to summary...');
            showToast('🎉 Purity testing complete! Proceeding to summary...', 'success');
            
            // Disconnect WebRTC and navigate after a short delay
            setTimeout(() => {
                webrtcService.disconnect();
                navigate('/appraisal-summary');
            }, 2000);
        }
    }, [rubbingCompleted, acidCompleted, currentTask, navigate]);

    // Show toasts when tests complete
    const [rubbingToastShown, setRubbingToastShown] = useState(false);
    const [acidToastShown, setAcidToastShown] = useState(false);
    
    useEffect(() => {
        if (rubbingCompleted && !rubbingToastShown) {
            showToast('✅ Rubbing Test Complete! Starting Acid Test...', 'success');
            setRubbingToastShown(true);
        }
    }, [rubbingCompleted, rubbingToastShown]);
    
    useEffect(() => {
        if (acidCompleted && !acidToastShown) {
            showToast('✅ Acid Test Complete! Analysis Done!', 'success');
            setAcidToastShown(true);
        }
    }, [acidCompleted, acidToastShown]);

    // Handle annotated frames (WebSocket mode)
    const handleAnnotatedFrame = useCallback((frame: string) => {
        console.log('🖼️ Received annotated frame, length:', frame?.length);
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

        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
            console.warn('⚠️ Connection lost or closed:', state);
            showToast('WebRTC connection lost', 'error');
        }
    }, []);

    // Setup WebRTC callbacks - only once on mount
    useEffect(() => {
        webrtcService.setOnRemoteStream(handleRemoteStream);
        webrtcService.setOnAnnotatedFrame(handleAnnotatedFrame);
        webrtcService.setOnStatusChange(handleStatusChange);
        webrtcService.setOnConnectionStateChange(handleConnectionStateChange);
        // NOTE: No cleanup disconnect here - it was causing premature disconnection
        // Disconnect is handled explicitly by user action or auto-navigation
    }, [handleRemoteStream, handleAnnotatedFrame, handleStatusChange, handleConnectionStateChange]);
    
    // Cleanup on unmount only
    useEffect(() => {
        return () => {
            console.log('🧹 Component unmounting - disconnecting WebRTC');
            webrtcService.disconnect();
        };
    }, []); // Empty deps - only runs on unmount

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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
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
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center">
                                <ScanLine className="w-6 h-6 mr-2 text-emerald-500" />
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
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                                    <p className="text-red-600">Camera permission denied. Please enable in browser settings.</p>
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
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-lg font-bold text-gray-800 flex items-center">
                                    <Video className="w-5 h-5 mr-2 text-emerald-500" />
                                    AI-Annotated Stream
                                </h4>
                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${isConnected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {isConnected ? '🔴 LIVE' : 'Offline'}
                                </div>
                            </div>

                            <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden border-2 border-emerald-200">
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

                                {/* WebSocket mode: show processing indicator when no frame but connected */}
                                {connectionMode === 'websocket' && !annotatedFrame && isConnected && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
                                        <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
                                        <p className="text-gray-500 text-lg">Processing frames...</p>
                                    </div>
                                )}

                                {!isConnected && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50">
                                        <VideoOff className="w-16 h-16 text-gray-400 mb-4" />
                                        <p className="text-gray-500 text-lg">Connect to start analysis</p>
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
                        <div className="bg-white/60 rounded-xl p-3 border border-gray-200 shadow-sm">
                            <h5 className="text-sm font-medium text-gray-600 mb-2">Local Camera Preview</h5>
                            <div className="relative aspect-video max-h-40 bg-gray-100 rounded-lg overflow-hidden">
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
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 shadow-sm">
                            <h4 className="text-lg font-bold text-gray-800 mb-4">Connection</h4>

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
                                    className="w-full mt-2 border-gray-300 text-gray-600"
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Reset Session
                                </Button>
                            )}
                        </div>

                        {/* Task Switcher */}
                        {isConnected && (
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 shadow-sm">
                                <h4 className="text-lg font-bold text-gray-800 mb-4">Current Task</h4>

                                <div className="grid grid-cols-3 gap-2">
                                    {(['rubbing', 'acid', 'done'] as const).map((task) => (
                                        <Button
                                            key={task}
                                            onClick={() => switchTask(task)}
                                            variant={currentTask === task ? 'default' : 'outline'}
                                            className={`capitalize ${currentTask === task
                                                ? 'bg-emerald-500 text-white'
                                                : 'border-gray-300 text-gray-600'
                                                }`}
                                        >
                                            {task}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Detection Status */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 shadow-sm">
                            <h4 className="text-lg font-bold text-gray-800 mb-4">Detection Status</h4>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600">Rubbing Test</span>
                                    <span className={`font-bold ${rubbingCompleted ? 'text-green-500' : 'text-amber-500'}`}>
                                        {rubbingCompleted ? '✅ Detected' : '⏳ Pending'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600">Acid Test</span>
                                    <span className={`font-bold ${acidCompleted ? 'text-green-500' : 'text-amber-500'}`}>
                                        {acidCompleted ? '✅ Detected' : '⏳ Pending'}
                                    </span>
                                </div>

                                {sessionStatus?.detection_status?.gold_purity && (
                                    <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                                        <span className="text-amber-700">Gold Purity</span>
                                        <span className="font-bold text-amber-600">
                                            {sessionStatus.detection_status.gold_purity}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Session Info */}
                        {connectionMode === 'webrtc' && isConnected && (
                            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200 text-sm shadow-sm">
                                <div className="text-blue-700 font-medium mb-1">🎥 WebRTC Mode</div>
                                <div className="text-blue-600 text-xs">
                                    Watch the video stream for task status. Auto-switches: Rubbing → Acid → Done
                                </div>
                            </div>
                        )}
                        
                        {sessionStatus && (
                            <div className="bg-white/60 rounded-xl p-3 border border-gray-200 text-sm shadow-sm">
                                <div className="text-gray-500 space-y-1">
                                    <div>Session: <span className="text-gray-700">{sessionStatus.session_id}</span></div>
                                    <div>Task: <span className="text-emerald-600">{sessionStatus.current_task}</span></div>
                                    <div>State: <span className="text-gray-700">{sessionStatus.connection_state}</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between mt-8">
                    <Button onClick={() => navigate('/rbi-compliance')} variant="outline" className="border-gray-300 text-gray-600">
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
