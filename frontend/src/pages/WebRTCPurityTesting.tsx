import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Gem, Play, Square, AlertCircle, ScanLine, RefreshCw, Wifi, WifiOff, Video, VideoOff, Loader2, CheckCircle } from 'lucide-react';
import { StepIndicator } from '../components/journey/StepIndicator';
import { showToast } from '../lib/utils';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { StatusBadge } from '../components/ui/status-badge';
import { ModernDashboardLayout } from '../components/layouts/ModernDashboardLayout';
import { cn } from '../lib/utils';
import { PageCameraSelector } from '../components/ui/page-camera-selector';
import { useCameraDetection } from '../hooks/useCameraDetection';
import { webrtcService, type SessionStatus } from '../services/webrtc';

/**
 * Interface for tracking test results per jewelry item
 */
interface ItemTestResult {
    itemNumber: number;
    rubbingCompleted: boolean;
    acidCompleted: boolean;
    timestamp: string;
}

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

    // Multi-item state
    const [totalItemCount, setTotalItemCount] = useState(0);
    const [currentItemIndex, setCurrentItemIndex] = useState(0); // 0-based index
    const [itemTestResults, setItemTestResults] = useState<ItemTestResult[]>([]);

    // Analysis state (for current item)
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

    // Load jewelry items from session API on mount
    useEffect(() => {
        const loadJewelleryItems = async () => {
            try {
                const sessionId = localStorage.getItem('appraisal_session_id');

                if (!sessionId) {
                    console.warn('No session ID found');
                    showToast('No session found. Please start from the beginning.', 'error');
                    return;
                }

                console.log('📦 Loading jewelry items from session:', sessionId);
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/session/${sessionId}/jewellery-items`);

                if (!response.ok) {
                    throw new Error('Failed to load jewelry items');
                }

                const data = await response.json();
                const count = data.total_items || 0;
                setTotalItemCount(count);
                console.log(`📦 Loaded ${count} jewelry items for purity testing`);

                // Initialize test results array
                const initialResults: ItemTestResult[] = Array.from({ length: count }, (_, i) => ({
                    itemNumber: i + 1,
                    rubbingCompleted: false,
                    acidCompleted: false,
                    timestamp: ''
                }));
                setItemTestResults(initialResults);
            } catch (error) {
                console.error('Failed to load jewelry items:', error);

                // Fallback to localStorage for backward compatibility
                const totalItemsStr = localStorage.getItem('totalItems');
                if (totalItemsStr) {
                    const count = parseInt(totalItemsStr, 10) || 0;
                    setTotalItemCount(count);
                    const initialResults: ItemTestResult[] = Array.from({ length: count }, (_, i) => ({
                        itemNumber: i + 1,
                        rubbingCompleted: false,
                        acidCompleted: false,
                        timestamp: ''
                    }));
                    setItemTestResults(initialResults);
                    console.log(`📦 Loaded ${count} items from localStorage fallback`);
                } else {
                    showToast('Failed to load jewelry items', 'error');
                }
            }
        };

        loadJewelleryItems();
    }, []);

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

            // Acid detected - ONLY accept if rubbing is already complete
            // This prevents skipping rubbing test
            if (status.detection_status.acid_detected) {
                setRubbingCompleted((prevRubbing) => {
                    // Only mark acid complete if rubbing was already done
                    if (prevRubbing) {
                        setAcidCompleted(true);
                    } else {
                        console.warn('⚠️ Acid detected but rubbing not complete - ignoring');
                    }
                    return prevRubbing;
                });
            }
        }

        // Update current task from backend (backend handles auto-switching)
        // But only accept 'acid' or 'done' task if rubbing is complete
        console.log('📋 Task update:', status.current_task);
        setRubbingCompleted((prevRubbing) => {
            if (status.current_task === 'acid' || status.current_task === 'done') {
                if (!prevRubbing) {
                    console.warn('⚠️ Task trying to advance but rubbing not complete - staying on rubbing');
                    setCurrentTask('rubbing');
                } else {
                    setCurrentTask(status.current_task);
                }
            } else {
                setCurrentTask(status.current_task);
            }
            return prevRubbing;
        });
    }, []); // No dependencies - uses setters which are stable

    // Track if we've already handled completion for the current item
    const completionHandledRef = useRef<number | null>(null);

    // Auto-navigate or advance to next item when both tests complete
    useEffect(() => {
        // Only proceed if we haven't handled this item yet
        if (rubbingCompleted && acidCompleted && currentTask === 'done' && completionHandledRef.current !== currentItemIndex) {
            console.log(`🎉 Item ${currentItemIndex + 1} tests complete!`);

            // Mark this item as handled to prevent loops
            completionHandledRef.current = currentItemIndex;

            // Save current item results
            setItemTestResults(prevResults => {
                const updatedResults = [...prevResults];
                if (updatedResults[currentItemIndex]) {
                    updatedResults[currentItemIndex] = {
                        itemNumber: currentItemIndex + 1,
                        rubbingCompleted: true,
                        acidCompleted: true,
                        timestamp: new Date().toISOString()
                    };
                }

                // Perform navigation logic with the UPDATED results
                // We do this inside the setter to ensure we have latest state, 
                // OR we can just use the local 'updatedResults' variable since we are in the effect scope

                // NOTE: We need to handle the side effects (API calls, navigation) 
                // outside the state setter usually, but here we need the updated data.
                // Better approach: Calculate updated results, set state, THEN use the calculated results for API/Nav.

                return updatedResults;
            });

            // Re-calculate updated results locally for API/Navigation usage
            // (Since state update is async, we can't read 'itemTestResults' immediately after set)
            const updatedResultsSnapshot = [...itemTestResults];
            if (updatedResultsSnapshot[currentItemIndex]) {
                updatedResultsSnapshot[currentItemIndex] = {
                    itemNumber: currentItemIndex + 1,
                    rubbingCompleted: true,
                    acidCompleted: true,
                    timestamp: new Date().toISOString()
                };
            }

            // Check if this is the last item
            if (currentItemIndex + 1 >= totalItemCount) {
                console.log('🎊 All items complete! Saving and navigating to summary...');
                showToast('🎊 All purity testing complete! Saving data...', 'success');

                // Save all results to localStorage (backup)
                localStorage.setItem('purityTestResults', JSON.stringify(updatedResultsSnapshot));

                // Save to API
                const saveToApi = async () => {
                    try {
                        const sessionId = localStorage.getItem('appraisal_session_id');
                        if (sessionId) {
                            const testResults = {
                                items: updatedResultsSnapshot.map(item => ({
                                    itemNumber: item.itemNumber,
                                    rubbingCompleted: item.rubbingCompleted,
                                    acidCompleted: item.acidCompleted,
                                    timestamp: item.timestamp
                                })),
                                total_items: totalItemCount,
                                completed_at: new Date().toISOString()
                            };

                            await fetch(`${import.meta.env.VITE_API_URL}/api/session/${sessionId}/purity-test`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(testResults)
                            });
                            console.log('✅ Purity results saved to API');
                        }
                    } catch (error) {
                        console.error('Failed to save purity results to API:', error);
                        // We still navigate since we have local storage backup
                    }

                    // Disconnect WebRTC and navigate
                    webrtcService.disconnect();
                    navigate('/appraisal-summary');
                };

                // Execute save and navigate
                saveToApi();

            } else {
                // Move to next item
                const nextItemIndex = currentItemIndex + 1;
                console.log(`➡️ Advancing to item ${nextItemIndex + 1} of ${totalItemCount}`);
                showToast(`✅ Item ${currentItemIndex + 1} complete! Starting Item ${nextItemIndex + 1}...`, 'success');

                // Reset session for next item after a short delay
                setTimeout(async () => {
                    const resetSuccess = await webrtcService.reset();
                    if (resetSuccess) {
                        setCurrentItemIndex(nextItemIndex);
                        setRubbingCompleted(false);
                        setAcidCompleted(false);
                        setCurrentTask('rubbing');
                        setRubbingToastShown(false);
                        setAcidToastShown(false);
                        // Reset handled ref effectively by changing index
                    } else {
                        showToast('Failed to reset session. Please disconnect and reconnect.', 'error');
                    }
                }, 1500);
            }
        }
    }, [rubbingCompleted, acidCompleted, currentTask, currentItemIndex, totalItemCount, itemTestResults, navigate]);

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
    const handleNext = async () => {
        // Check if ALL items have completed their tests
        const allComplete = totalItemCount > 0 && itemTestResults.every(i => i.rubbingCompleted && i.acidCompleted);

        if (!allComplete) {
            const incompleteCount = itemTestResults.filter(i => !i.rubbingCompleted || !i.acidCompleted).length;
            showToast(`Please complete all purity tests. ${incompleteCount} item(s) remaining.`, 'error');
            return;
        }

        try {
            // Save to session API
            const sessionId = localStorage.getItem('appraisal_session_id');
            if (sessionId) {
                const testResults = {
                    items: itemTestResults.map(item => ({
                        itemNumber: item.itemNumber,
                        rubbingCompleted: item.rubbingCompleted,
                        acidCompleted: item.acidCompleted,
                        timestamp: item.timestamp
                    })),
                    total_items: totalItemCount,
                    completed_at: new Date().toISOString()
                };

                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/session/${sessionId}/purity-test`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(testResults)
                });

                if (!response.ok) {
                    console.error('Failed to save purity results to session');
                }
            }
        } catch (error) {
            console.error('Error saving purity results:', error);
        }

        // Disconnect and navigate
        disconnectWebRTC();
        showToast('🎉 All purity tests completed! Proceeding to summary...', 'success');
        navigate('/appraisal-summary');
    };

    return (
        <ModernDashboardLayout
            title="Purity Testing"
            showSidebar
            headerContent={<StepIndicator currentStep={4} />}
        >
            <div className="max-w-7xl mx-auto space-y-6 pb-20">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold font-poppins flex items-center gap-2 text-primary">
                            <Gem className="w-6 h-6 text-secondary" />
                            AI-Powered Analysis
                        </h2>
                        <p className="text-muted-foreground">Real-time gold purity verification using computer vision</p>
                    </div>

                    {totalItemCount > 0 && (
                        <StatusBadge variant="default" className="text-sm px-4 py-2 bg-card border shadow-sm">
                            <span className="font-bold text-primary mr-1">
                                Item {currentItemIndex + 1}
                            </span>
                            of {totalItemCount}
                        </StatusBadge>
                    )}
                </div>

                {/* Camera Selection */}
                {showCameraSelection && (
                    <Card className="border-warning/50 bg-warning/5">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="flex items-center gap-2 text-warning-foreground">
                                <ScanLine className="w-5 h-5" />
                                <CardTitle className="text-lg">Camera Setup</CardTitle>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={enumerateDevices} disabled={cameraLoading} variant="outline" size="sm">
                                    {cameraLoading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                    Refresh
                                </Button>
                                <Button onClick={() => setShowCameraSelection(false)} variant="ghost" size="sm">
                                    ✕ Close
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {permission.status === 'denied' && (
                                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-2 text-destructive">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className="font-semibold">Camera permission denied</span>
                                </div>
                            )}
                            <div className="flex justify-center">
                                <PageCameraSelector
                                    context="purity-testing"
                                    label="Select Analysis Camera"
                                    onCameraSelected={(camera) => setSelectedCameraId(camera?.deviceId || '')}
                                    className="w-full max-w-md"
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* LEFT COLUMN: Video Streams (2/3 width) */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="overflow-hidden border-2 border-primary/20 shadow-lg">
                            <CardHeader className="py-3 bg-muted/40 border-b flex flex-row items-center justify-between">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Video className="w-4 h-4 text-primary" />
                                    Live Analysis Stream
                                </CardTitle>
                                <StatusBadge variant={isConnected ? "live" : "default"}>
                                    {isConnected ? "LIVE" : "OFFLINE"}
                                </StatusBadge>
                            </CardHeader>
                            <div className="relative aspect-video bg-black/90">
                                {/* Remote Stream */}
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={cn("w-full h-full object-contain", connectionMode !== 'webrtc' && "hidden")}
                                />
                                {/* WebSocket Frame */}
                                {connectionMode === 'websocket' && annotatedFrame && (
                                    <img src={annotatedFrame} alt="Analysis" className="w-full h-full object-contain" />
                                )}
                                {/* Loading/Empty States */}
                                {connectionMode === 'websocket' && !annotatedFrame && isConnected && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-secondary">
                                        <Loader2 className="w-12 h-12 animate-spin mb-2" />
                                        <p>Processing...</p>
                                    </div>
                                )}
                                {!isConnected && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground/50">
                                        <VideoOff className="w-16 h-16 mb-4" />
                                        <p>Connect to start analysis</p>
                                    </div>
                                )}
                                {/* Mode Indicator */}
                                {isConnected && connectionMode && (
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 rounded text-[10px] text-white font-mono uppercase border border-white/10">
                                        {connectionMode}
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Local Preview (Small) */}
                        <Card className="w-full max-w-[240px]">
                            <CardHeader className="py-2 px-3 border-b">
                                <CardTitle className="text-xs text-muted-foreground">Local Preview</CardTitle>
                            </CardHeader>
                            <div className="aspect-video bg-black/10">
                                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                            </div>
                        </Card>
                    </div>

                    {/* RIGHT COLUMN: Controls & Status (1/3 width) */}
                    <div className="space-y-6">

                        {/* Connection Card */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Control Panel</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button
                                    onClick={toggleConnection}
                                    disabled={!selectedCameraId || isConnecting}
                                    size="lg"
                                    className={cn(
                                        "w-full font-bold shadow-md transition-all",
                                        isConnected ? "bg-destructive hover:bg-destructive/90" : "bg-success hover:bg-success/90 text-white"
                                    )}
                                >
                                    {isConnecting ? (
                                        <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Connecting...</>
                                    ) : isConnected ? (
                                        <><Square className="w-4 h-4 mr-2" /> Disconnect Analysis</>
                                    ) : (
                                        <><Play className="w-4 h-4 mr-2" /> Start Analysis</>
                                    )}
                                </Button>

                                {isConnected && (
                                    <Button variant="outline" onClick={resetSession} className="w-full">
                                        <RefreshCw className="w-4 h-4 mr-2" /> Reset Session
                                    </Button>
                                )}
                            </CardContent>
                        </Card>

                        {/* Current Item Status */}
                        <Card className="border-primary/20 shadow-md">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-lg flex items-center justify-between">
                                    <span>Detection Status</span>
                                    {sessionStatus?.detection_status?.gold_purity && (
                                        <span className="text-sm px-2 py-1 rounded bg-secondary text-secondary-foreground font-bold">
                                            {sessionStatus.detection_status.gold_purity}
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Rubbing Status */}
                                <div className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border transition-all",
                                    rubbingCompleted ? "bg-success/10 border-success/30" :
                                        (currentTask === 'rubbing') ? "bg-secondary/10 border-secondary animate-pulse-glow" : "bg-muted border-transparent"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                            rubbingCompleted ? "bg-success text-white" : "bg-muted-foreground/30 text-muted-foreground"
                                        )}>
                                            {rubbingCompleted ? "✓" : "1"}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">Rubbing Test</p>
                                            <p className="text-xs text-muted-foreground">Gold streak verification</p>
                                        </div>
                                    </div>
                                    <StatusBadge variant={rubbingCompleted ? "success" : "default"} size="sm">
                                        {rubbingCompleted ? "Verified" : "Pending"}
                                    </StatusBadge>
                                </div>

                                {/* Acid Status */}
                                <div className={cn(
                                    "flex items-center justify-between p-3 rounded-xl border transition-all",
                                    acidCompleted ? "bg-success/10 border-success/30" :
                                        (currentTask === 'acid') ? "bg-secondary/10 border-secondary animate-pulse-glow" : "bg-muted border-transparent"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                            acidCompleted ? "bg-success text-white" : "bg-muted-foreground/30 text-muted-foreground"
                                        )}>
                                            {acidCompleted ? "✓" : "2"}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm">Acid Test</p>
                                            <p className="text-xs text-muted-foreground">Purity confirmation</p>
                                        </div>
                                    </div>
                                    <StatusBadge variant={acidCompleted ? "success" : "default"} size="sm">
                                        {acidCompleted ? "Verified" : "Pending"}
                                    </StatusBadge>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Multi-Item Progress */}
                        {totalItemCount > 0 && (
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-muted-foreground uppercase tracking-wider">Overall Progress</CardTitle>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-2xl font-bold font-poppins text-primary">
                                            {itemTestResults.filter(i => i.rubbingCompleted && i.acidCompleted).length}
                                            <span className="text-base text-muted-foreground font-normal ml-1">/ {totalItemCount} Items</span>
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="max-h-[300px] overflow-y-auto pr-1 space-y-2">
                                    {itemTestResults.map((item, index) => {
                                        const isComplete = item.rubbingCompleted && item.acidCompleted;
                                        const isActive = index === currentItemIndex;
                                        return (
                                            <div key={item.itemNumber} className={cn(
                                                "flex items-center justify-between p-2 rounded-lg border text-sm",
                                                isActive ? "border-primary/50 bg-primary/5 shadow-sm" :
                                                    isComplete ? "border-success/30 bg-success/5" : "border-border bg-muted/20"
                                            )}>
                                                <span className={cn("font-medium", isActive && "text-primary")}>Item {item.itemNumber}</span>
                                                {isComplete ? (
                                                    <CheckCircle className="w-4 h-4 text-success" />
                                                ) : isActive ? (
                                                    <div className="h-2 w-2 rounded-full bg-secondary animate-pulse" />
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">To Do</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        )}

                    </div>
                </div>

                {/* Footer Navigation */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t z-40">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <Button variant="ghost" onClick={() => navigate('/rbi-compliance')}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back
                        </Button>

                        {(() => {
                            const allComplete = totalItemCount > 0 && itemTestResults.every(i => i.rubbingCompleted && i.acidCompleted);
                            return (
                                <Button
                                    size="lg"
                                    onClick={handleNext}
                                    disabled={!allComplete}
                                    className={cn("min-w-[200px]", allComplete && "animate-pulse shadow-lg shadow-success/20 bg-success text-white hover:bg-success/90")}
                                >
                                    {allComplete ? (
                                        <>Complete & Continue <ArrowRight className="w-4 h-4 ml-2" /></>
                                    ) : (
                                        <>{itemTestResults.filter(i => i.rubbingCompleted && i.acidCompleted).length} / {totalItemCount} Completed</>
                                    )}
                                </Button>
                            );
                        })()}
                    </div>
                </div>

            </div>
        </ModernDashboardLayout>
    );
}

export default WebRTCPurityTesting;
