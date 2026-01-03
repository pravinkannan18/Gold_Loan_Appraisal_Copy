import { useMemo, useState, useRef } from "react";
import { useLocation,useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { HoverButton } from "@/components/ui/hover-button";
import { LogOut, Camera, FileText, X, CheckCircle, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AuroraLayout } from "@/components/layouts/AuroraLayout";
import { DicedHeroSection } from "@/components/ui/diced-hero-section";
import LiveCamera, { LiveCameraRef } from "@/components/LiveCamera";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import FacialRecognition from "@/components/FacialRecognition";

const stageToStepKey: Record<string, number> = {
  appraiser: 1,
  customer: 2,
  rbi: 3,
  purity: 4,
  summary: 5,
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName] = useState("Appraiser");
  const [showCameraTest, setShowCameraTest] = useState(false);
  const [showFacialRecognition, setShowFacialRecognition] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraTesting, setIsCameraTesting] = useState(false);
  const [cameraTestComplete, setCameraTestComplete] = useState(false);
  const cameraRef = useRef<LiveCameraRef>(null);
  const stage = useMemo(() => new URLSearchParams(location.search).get("stage") || "customer", [location.search]);
  const currentStepKey = stageToStepKey[stage] || 1;

  const handleCameraQualityCheck = async () => {
    try {
      setCameraError(null);
      setIsCameraTesting(true);
      
      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported on this browser/device");
      }
      
      // Check for HTTPS (required for camera access)
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        throw new Error("Camera access requires HTTPS connection");
      }
      
      // Request camera permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 } 
        });
        
        // Test if camera is actually working
        const track = stream.getVideoTracks()[0];
        if (!track) {
          throw new Error("No camera device found");
        }
        
        // Stop the test stream immediately
        stream.getTracks().forEach(track => track.stop());
        
        setShowCameraTest(true);
        toast({
          title: "Camera Test Started",
          description: "Camera access granted. Testing camera quality...",
        });
      } catch (permissionError: any) {
        let errorMessage = "Camera permission denied";
        
        if (permissionError.name === 'NotFoundError') {
          errorMessage = "No camera device found on this device";
        } else if (permissionError.name === 'NotAllowedError') {
          errorMessage = "Camera permission denied. Please enable camera access in your browser settings and try again";
        } else if (permissionError.name === 'NotReadableError') {
          errorMessage = "Camera is already in use by another application";
        } else if (permissionError.name === 'OverconstrainedError') {
          errorMessage = "Camera doesn't support the required resolution";
        }
        
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      setCameraError(error.message);
      toast({
        title: "Camera Test Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsCameraTesting(false);
    }
  };

  const handleCameraCapture = (imageData: string) => {
    setCameraTestComplete(true);
    toast({
      title: "Camera Test Successful",
      description: "Camera quality check completed successfully!",
    });
    
    // Auto-close after 2 seconds
    setTimeout(() => {
      setShowCameraTest(false);
      setCameraTestComplete(false);
    }, 2000);
  };

  const handleCloseCameraTest = () => {
    setShowCameraTest(false);
    setCameraTestComplete(false);
    setCameraError(null);
  };

  const handleSignOut = () => {
    toast({
      title: "Signed out",
      description: "You have been successfully signed out.",
    });
    navigate("/");
  };

  const handleStartAppraisal = () => {
    // Clear any existing appraiser data
    localStorage.removeItem("currentAppraiser");
    localStorage.removeItem("jewelleryItems");
    
    // Start facial recognition workflow
    setShowFacialRecognition(true);
  };

  const handleAppraiserIdentified = (appraiser: any) => {
    setShowFacialRecognition(false);
    toast({
      title: "Welcome Back!",
      description: `Starting new appraisal for ${appraiser.name}`,
    });
    // Navigate to customer image capture since appraiser is already identified
    navigate("/customer-image");
  };

  const handleNewAppraiserRequired = (capturedImage: string) => {
    setShowFacialRecognition(false);
    // Store the captured image for the new appraiser registration
    localStorage.setItem("newAppraiserPhoto", capturedImage);
    toast({
      title: "New Appraiser Registration",
      description: "Please provide your details to complete registration.",
    });
    // Navigate to appraiser details for new registration
    navigate("/appraiser-details");
  };

  const handleFacialRecognitionCancel = () => {
    setShowFacialRecognition(false);
  };

  const goldAppraisalSlides = [
    {
      title: "Gold Jewelry",
      image: "/bangle.png",
    },
    {
      title: "Gold Necklace",
      image: "/chain.png",
    },
    {
      title: "Gold Rings",
      image: "/ring.png",
    },
    {
      title: "Gold Bangles",
      image: "/neckless.png",
    },
  ];

  return (
    <AuroraLayout>
  <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_45%),_radial-gradient(circle_at_bottom,_rgba(14,165,233,0.18),_transparent_55%)]">
        {/* Header */}
        <header className="border-b border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md">
          <div className="px-4 py-4 flex items-center justify-end">
            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-700 dark:text-neutral-300">Welcome, {userName}</span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="px-4 py-1">
          {/* Logo Section - Above AI-Powered Gold Appraisals */}
          <div className="flex justify-start mb-0 mt-4">
            <img
              src="/Embsys%20Intelligence%20logo.png"
              alt="Embsys Intelligence logo"
              className="h-24 w-auto"
              style={{ transform: 'rotate(0deg)', imageOrientation: 'from-image' }}
            />
          </div>

          <div className="[&_[data-diced-top-text]]:font-semibold [&_[data-diced-main-text]]:font-bold [&_[data-diced-main-text]]:leading-tight [&_[data-diced-sub-text]]:leading-relaxed [&_[data-diced-sub-text]]:font-normal lobster-subtext -mt-20">
            <DicedHeroSection
              topText="AI-Powered Gold Appraisals"
              mainText="Gold Guardian Pro"
              subMainText="Fast, accurate gold jewelry appraisals powered by AI technology—optimized for banking workflows and compliance."
              buttonText="Start Appraisal"
              slides={goldAppraisalSlides}
              onMainButtonClick={handleStartAppraisal}
              onGridImageClick={(index) => {
                console.log(`Image ${index} clicked`);
              }}
              extraActions={
                <div className="hidden md:flex items-center gap-3">
                  <HoverButton
                    onClick={() => navigate("/records")}
                    className="min-w-[240px] flex items-center justify-center gap-2 text-base"
                  >
                    <FileText className="h-5 w-5" />
                    View All Records
                  </HoverButton>
                  <HoverButton
                    onClick={handleCameraQualityCheck}
                    disabled={isCameraTesting}
                    className="min-w-[240px] flex items-center justify-center gap-2 text-base"
                  >
                    <Camera className="h-5 w-5" />
                    {isCameraTesting ? "Testing Camera..." : "Camera Quality Check"}
                  </HoverButton>
                </div>
              }
              customMainButton={
                <HoverButton
                  onClick={handleStartAppraisal}
                  className="min-w-[240px] flex items-center justify-center gap-2 text-base"
                >
                  <User className="h-5 w-5" />
                  Start Appraisal
                </HoverButton>
              }
              topTextStyle={{
                color: "var(--diced-hero-section-top-text)",
                fontSize: "1.5rem"
              }}
              mainTextStyle={{
                fontSize: "clamp(3rem, 8vw, 4.5rem)",
                gradient: "linear-gradient(45deg, var(--diced-hero-section-main-gradient-from), var(--diced-hero-section-main-gradient-to))",
                fontFamily: "'Playfair Display', 'Cinzel', serif",
                fontStyle: "italic"
              }}
              subMainTextStyle={{ 
                color: "var(--diced-hero-section-sub-text)",
                fontSize: "1.25rem",
                fontFamily: "Playfair Display, serif",
                gradient: "linear-gradient(to right, hsl(30, 15%, 20%), hsl(45, 90%, 40%))"
              }}
              buttonStyle={{
                backgroundColor: "var(--diced-hero-section-button-bg)",
                color: "var(--diced-hero-section-button-fg)",
                borderRadius: "2rem",
                hoverColor: "var(--diced-hero-section-button-hover-bg)",
                hoverForeground: "var(--diced-hero-section-button-hover-fg)",
              }}
              separatorColor="var(--diced-hero-section-separator)"
              mobileBreakpoint={1000}
              fontFamily="inherit"
            />
          </div>
          
          {/* Quick Action Buttons Row is now integrated into hero via extraActions */}

          
        </main>
      </div>

      {/* Camera Quality Test Dialog */}
      <Dialog open={showCameraTest} onOpenChange={handleCloseCameraTest}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Camera Quality Check
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {cameraError ? (
              <div className="text-center p-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                  <X className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-red-700 mb-2">Camera Test Failed</h3>
                <p className="text-red-600 mb-4">{cameraError}</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleCloseCameraTest} variant="outline">
                    Close
                  </Button>
                  <Button onClick={handleCameraQualityCheck}>
                    Try Again
                  </Button>
                </div>
              </div>
            ) : cameraTestComplete ? (
              <div className="text-center p-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-green-700 mb-2">Camera Test Successful!</h3>
                <p className="text-green-600">Your camera is working properly and ready for use.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold mb-2">Testing Camera Quality</h3>
                  <p className="text-gray-600">
                    Please allow camera access and capture a test photo to verify camera functionality.
                  </p>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                  <LiveCamera
                    ref={cameraRef}
                    currentStepKey={currentStepKey}
                    onCapture={handleCameraCapture}
                    onClose={handleCloseCameraTest}
                  />
                </div>
                
                <div className="flex justify-between gap-3">
                  <Button onClick={handleCloseCameraTest} variant="outline">
                    Cancel Test
                  </Button>
                  <Button 
                    onClick={() => cameraRef.current?.capturePhoto()}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Test Capture
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Facial Recognition Dialog */}
      <Dialog open={showFacialRecognition} onOpenChange={handleFacialRecognitionCancel}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Appraiser Identification
            </DialogTitle>
          </DialogHeader>
          
          <FacialRecognition
            onAppraiserIdentified={handleAppraiserIdentified}
            onNewAppraiserRequired={handleNewAppraiserRequired}
            onCancel={handleFacialRecognitionCancel}
          />
        </DialogContent>
      </Dialog>
    </AuroraLayout>
  );
};

export default Dashboard;