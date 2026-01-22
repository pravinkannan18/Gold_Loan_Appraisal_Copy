import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ImageIcon, ArrowLeft, ArrowRight, UserCircle, Shield, AlertCircle, Loader2, CheckCircle, Building, Mail, MapPin, Phone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { ModernDashboardLayout } from '@/components/layouts/ModernDashboardLayout';
import { cn } from '@/lib/utils';
import { StepIndicator } from '../components/journey/StepIndicator';
import { LiveCamera, LiveCameraHandle } from '../components/journey/LiveCamera';
import { apiService } from '../services/api';
import { generateAppraiserId, showToast } from '../lib/utils';
import { useCameraDetection } from '../hooks/useCameraDetection';

export function AppraiserDetails() {
  const navigate = useNavigate();
  const cameraRef = useRef<LiveCameraHandle>(null);
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [branch, setBranch] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photo, setPhoto] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

  const { getCameraForPage } = useCameraDetection();

  // Auto-load saved camera
  useEffect(() => {
    const savedCamera = getCameraForPage('appraiser-identification');
    if (savedCamera) {
      setSelectedCameraId(savedCamera.deviceId);
    }
  }, [getCameraForPage]);

  // Check for captured photo from facial recognition
  useEffect(() => {
    const savedPhoto = localStorage.getItem('newAppraiserPhoto');
    if (savedPhoto) {
      setPhoto(savedPhoto);
      // Clear the saved photo so it doesn't persist
      localStorage.removeItem('newAppraiserPhoto');
      showToast('Photo captured from facial recognition. Please provide your details.', 'info');
    }
  }, []);

  const handleOpenCamera = () => {
    setCameraError('');
    setIsCameraReady(false);
    cameraRef.current?.openCamera();
    setIsCameraOpen(true);
  };

  const handleCloseCamera = () => {
    cameraRef.current?.closeCamera();
    setIsCameraOpen(false);
    setIsCameraReady(false);
  };

  const handleCapture = () => {
    if (!isCameraReady) {
      showToast('Camera is still starting. Please wait until the preview is ready.', 'info');
      return;
    }
    const imageData = cameraRef.current?.captureImage();
    if (imageData && imageData !== 'data:,' && imageData.length > 100) {
      setPhoto(imageData);
      cameraRef.current?.closeCamera();
      setIsCameraOpen(false);
      showToast('Photo captured successfully!', 'success');
    } else {
      showToast('Failed to capture photo. Please wait for camera to fully load and try again.', 'error');
    }
  };

  const handleRetake = () => {
    setPhoto('');
    handleOpenCamera();
  };

  const handleNext = async () => {
    if (!name.trim()) {
      showToast('Please enter appraiser name', 'error');
      return;
    }

    if (!photo) {
      showToast('Please capture appraiser photo', 'error');
      return;
    }

    // Validate photo data
    if (photo === 'data:,' || photo.length < 100) {
      showToast('Invalid photo data. Please retake the photo.', 'error');
      setPhoto('');
      return;
    }

    setIsLoading(true);

    try {
      const appraiserId = generateAppraiserId();
      const timestamp = new Date().toISOString();

      console.log('=== SAVING APPRAISER ===');
      console.log('Name:', name.trim());
      console.log('Appraiser ID:', appraiserId);
      console.log('Photo length:', photo.length);
      console.log('Timestamp:', timestamp);

      // Call backend API to save appraiser
      const response = await apiService.saveAppraiser({
        name: name.trim(),
        id: appraiserId,
        image: photo,
        timestamp: timestamp,
        bank: bank.trim(),
        branch: branch.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      console.log('=== BACKEND RESPONSE ===');
      console.log('Response:', response);
      console.log('Database ID:', response.id);

      // Register face encoding for future recognition
      try {
        console.log('=== REGISTERING FACE ENCODING ===');
        const faceResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/face/register`, {
          method: 'POST',
          body: (() => {
            const formData = new FormData();
            formData.append('name', name.trim());
            formData.append('appraiser_id', appraiserId);
            formData.append('image', photo);
            return formData;
          })()
        });

        const faceData = await faceResponse.json();

        if (!faceResponse.ok) {
          console.warn('Face registration failed:', faceData.message || 'Unknown error');
          showToast(`Appraiser saved but facial recognition setup failed: ${faceData.message || 'Unknown error'}`, 'info');
        } else {
          console.log('Face encoding registered successfully:', faceData);
        }
      } catch (faceError) {
        console.warn('Face registration error:', faceError);
        showToast('Appraiser saved but facial recognition setup failed. Manual login will be required.', 'info');
      }

      // Create a new session for this appraisal workflow
      console.log('=== CREATING APPRAISAL SESSION ===');
      const sessionResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create appraisal session');
      }

      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.session_id;
      console.log('Session created:', sessionId);

      // Save appraiser data to session in database
      console.log('=== SAVING APPRAISER TO SESSION ===');
      const appraiserData = {
        name: name.trim(),
        id: appraiserId,
        image: photo,
        timestamp: timestamp,
        photo: photo,  // Include both for compatibility
        db_id: response.id,
        bank: bank.trim(),
        branch: branch.trim(),
        email: email.trim(),
        phone: phone.trim(),
      };

      const saveResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/session/${sessionId}/appraiser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appraiserData)
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save appraiser data to session');
      }

      console.log('Appraiser data saved to session');

      // Store ONLY the session_id in localStorage (tiny, no quota issues)
      localStorage.setItem('appraisal_session_id', sessionId);

      // Also store minimal appraiser info for quick access (no images)
      localStorage.setItem('currentAppraiser', JSON.stringify({
        id: response.id,
        appraiser_id: appraiserId,
        name: name.trim(),
        timestamp: timestamp,
        session_id: sessionId,
        bank: bank.trim(),
        branch: branch.trim(),
        email: email.trim(),
        phone: phone.trim()
      }));

      showToast('Appraiser details saved!', 'success');
      console.log('=== NAVIGATING TO CUSTOMER IMAGE ===');
      navigate('/customer-image');
    } catch (error: any) {
      console.error('=== ERROR SAVING APPRAISER ===');
      console.error('Error:', error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      const errorMessage = error?.message || 'Failed to save appraiser details';
      showToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModernDashboardLayout
      title="Appraiser Identification"
      showSidebar
      headerContent={<StepIndicator currentStep={1} />}
    >
      <div className="max-w-7xl mx-auto space-y-6 pb-20">

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column: Live Camera / Photo Panel */}
          <div className="space-y-6">
            <Card className="h-full border-2 overflow-hidden shadow-lg flex flex-col">
              <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <Camera className="w-5 h-5 text-primary" />
                  {photo ? 'Captured Photo' : 'Live Application Camera'}
                </div>
                {!photo && (
                  <StatusBadge variant={isCameraOpen ? (isCameraReady ? "success" : "warning") : "default"}>
                    {isCameraOpen ? "Live" : "Idle"}
                  </StatusBadge>
                )}
                {photo && (
                  <StatusBadge variant="success">
                    Captured
                  </StatusBadge>
                )}
              </div>
              <CardContent className="p-0 flex-1 flex flex-col">
                <div className="bg-black/5 min-h-[400px] relative flex flex-col flex-1">
                  {/* Captured Image View */}
                  {photo && (
                    <div className="absolute inset-0 z-20 bg-background flex items-center justify-center">
                      <img src={photo} alt="Appraiser" className="w-full h-full object-contain" />
                    </div>
                  )}

                  {/* Live Camera - Always mounted, hidden properly via CSS when photo exists or camera closed */}
                  <div className={cn("flex-1 flex flex-col", (photo || !isCameraOpen) && "hidden")}>
                    <LiveCamera
                      ref={cameraRef}
                      currentStepKey={1}
                      selectedDeviceId={selectedCameraId}
                      displayMode="inline"
                      className="flex-1"
                      onOpen={() => setIsCameraOpen(true)}
                      onClose={() => {
                        setIsCameraOpen(false);
                        setIsCameraReady(false);
                      }}
                      onReadyChange={setIsCameraReady}
                      onError={(message) => {
                        setCameraError(message);
                        showToast(message, 'error');
                      }}
                    />
                  </div>

                  {/* Empty State / Placeholder when camera is closed and no photo */}
                  {!isCameraOpen && !photo && (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 p-8">
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                        <UserCircle className="w-10 h-10 text-muted-foreground" />
                      </div>
                      <p className="font-semibold text-lg">Appraiser Verification</p>
                      <p className="text-sm mt-2 max-w-xs text-center">Please open the camera to capture your photo for verification.</p>
                    </div>
                  )}
                </div>

                {/* Camera Controls */}
                <div className="p-6 bg-background border-t mt-auto">
                  {cameraError && !photo && (
                    <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5" />
                      {cameraError}
                    </div>
                  )}

                  <div className="flex justify-center gap-4">
                    {photo ? (
                      <Button
                        onClick={handleRetake}
                        variant="outline"
                        size="lg"
                        className="min-w-[140px]"
                      >
                        <Camera className="w-4 h-4 mr-2" /> Retake Photo
                      </Button>
                    ) : (
                      <>
                        {isCameraOpen ? (
                          <>
                            <Button
                              onClick={handleCapture}
                              disabled={!isCameraReady}
                              className="min-w-[140px] shadow-lg shadow-primary/20"
                              size="lg"
                            >
                              <Camera className="w-4 h-4 mr-2" /> Capture
                            </Button>
                            <Button
                              variant="outline"
                              onClick={handleCloseCamera}
                              size="lg"
                            >
                              Close
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={handleOpenCamera}
                            size="lg"
                            className="min-w-[140px]"
                          >
                            <Camera className="w-4 h-4 mr-2" /> Open Camera
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Appraiser Details Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-primary" />
                  Appraiser Details
                </CardTitle>
                <CardDescription>Enter your details and capture a photo for verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    Full Name <span className="text-destructive">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Priya Sharma"
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                    {name && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <CheckCircle className="w-4 h-4 text-success" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1">
                      Bank Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={bank}
                        onChange={(e) => setBank(e.target.value)}
                        placeholder="e.g. HDFC Bank"
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      {bank && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Building className="w-4 h-4 text-muted-foreground" /></div>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1">
                      Branch
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        placeholder="e.g. Indiranagar"
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      {branch && <div className="absolute right-3 top-1/2 -translate-y-1/2"><MapPin className="w-4 h-4 text-muted-foreground" /></div>}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1">
                      Email ID
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. appraiser@example.com"
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      {email && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Mail className="w-4 h-4 text-muted-foreground" /></div>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                      {phone && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Phone className="w-4 h-4 text-muted-foreground" /></div>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center pt-4">
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                size="lg"
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={isLoading}
                size="lg"
                className="shadow-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 border-0 min-w-[150px]"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <>Next Step <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ModernDashboardLayout>
  );
}
