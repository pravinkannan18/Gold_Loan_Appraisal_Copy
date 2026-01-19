import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  Download,
  User,
  Camera,
  Shield,
  FlaskConical,
  CheckCircle,
  MapPin,
  Globe,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { StepIndicator } from '../components/journey/StepIndicator';
import { formatTimestamp, clearAppraisalData, showToast } from '../lib/utils';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

interface AppraiserData {
  id: string;
  appraiser_id: string;
  name: string;
  photo: string;
}

interface JewelleryItemData {
  itemNumber: number;
  image: string;
}

interface RBIData {
  overallImages: Array<{
    id: number;
    image: string;
    timestamp: string;
  }>;
  totalItems: number;
  capturedItems: Array<{
    itemNumber: number;
    image: string;
  }>;
  captureMethod: 'individual' | 'overall';
  timestamp: string;
}

interface PurityResult {
  rubbingCompleted: boolean;
  acidCompleted: boolean;
  detectedActivities: Array<{
    activity: 'rubbing' | 'acid_testing';
    confidence: number;
    timestamp: number;
  }>;
  timestamp: string;
}


export function AppraisalSummary() {
  const navigate = useNavigate();
  const [appraiser, setAppraiser] = useState<AppraiserData | null>(null);
  const [customerFront, setCustomerFront] = useState('');
  const [customerSide, setCustomerSide] = useState('');
  const [jewelleryItems, setJewelleryItems] = useState<JewelleryItemData[]>([]);
  const [rbiData, setRbiData] = useState<RBIData | null>(null);
  const [purityResults, setPurityResults] = useState<PurityResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [gpsData, setGpsData] = useState<{
    latitude: number;
    longitude: number;
    source: string;
    address: string;
    timestamp: string;
    map_image?: string;
  } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const fetchGPS = useCallback(async () => {
    setGpsLoading(true);
    setGpsError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/gps/location`, {
        credentials: 'include', // if you use auth
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGpsData(data);
    } catch (err: any) {
      console.error('GPS fetch error:', err);
      setGpsError(err.message || 'Failed to get location');
    } finally {
      setGpsLoading(false);
    }
  }, []);
  useEffect(() => {
    const loadData = () => {
      const appraiserStr = localStorage.getItem('currentAppraiser');
      const frontImage = localStorage.getItem('customerFrontImage');
      const sideImage = localStorage.getItem('customerSideImage');
      const itemsStr = localStorage.getItem('jewelleryItems');
      const rbiStr = localStorage.getItem('rbiCompliance');
      const purityStr = localStorage.getItem('purityResults'); // Changed from 'purityTest' to 'purityResults'

      console.log('AppraisalSummary - Loading data...');
      console.log('Appraiser:', appraiserStr ? 'exists' : 'missing');
      console.log('Front image:', frontImage ? 'exists' : 'missing');
      console.log('Side image:', sideImage ? 'exists' : 'missing');
      console.log('Items:', itemsStr ? 'exists' : 'missing');
      console.log('RBI:', rbiStr ? 'exists' : 'missing');
      console.log('Purity:', purityStr ? 'exists' : 'missing');

      if (!appraiserStr || !frontImage || !itemsStr || !rbiStr) {
        console.error('Missing required data for AppraisalSummary');
        console.error('Missing items:', {
          appraiser: !appraiserStr,
          frontImage: !frontImage,
          items: !itemsStr,
          rbi: !rbiStr,
          purity: !purityStr
        });
        showToast('Incomplete appraisal data', 'error');
        navigate('/appraiser-details');
        return;
      }

      // Purity data is optional if coming from RBI Compliance
      if (!purityStr) {
        console.warn('No purity data found - user may need to complete purity testing first');
        showToast('Please complete purity testing first', 'error');
        navigate('/purity-testing');
        return;
      }

      const parsedAppraiser = JSON.parse(appraiserStr);
      console.log('=== APPRAISER DATA DEBUG ===');
      console.log('Appraiser object keys:', Object.keys(parsedAppraiser));
      console.log('Has photo property:', 'photo' in parsedAppraiser);
      console.log('Photo value type:', typeof parsedAppraiser.photo);
      console.log('Photo value length:', parsedAppraiser.photo?.length);
      console.log('Photo starts with:', parsedAppraiser.photo?.substring(0, 100));
      console.log('Photo is truthy:', !!parsedAppraiser.photo);
      console.log('Photo is valid base64:', parsedAppraiser.photo?.startsWith('data:image'));
      console.log('=== END APPRAISER DEBUG ===');
      
      // Check if photo is missing or invalid
      if (!parsedAppraiser.photo || !parsedAppraiser.photo.startsWith('data:image')) {
        console.warn('⚠️ Appraiser photo missing or invalid');
        // Try to get from alternative storage
        const altPhoto = localStorage.getItem('newAppraiserPhoto') || localStorage.getItem('appraiserPhoto');
        if (altPhoto && altPhoto.startsWith('data:image')) {
          console.log('✅ Found photo in alternative storage');
          parsedAppraiser.photo = altPhoto;
        } else {
          console.warn('❌ No valid photo found in any storage location');
        }
      }
      
      setAppraiser(parsedAppraiser);
      setCustomerFront(frontImage);
      setCustomerSide(sideImage || '');

      // Debug jewellery items structure
      const parsedItems = JSON.parse(itemsStr);
      console.log('=== APPRAISAL SUMMARY DEBUG ===');
      console.log('Jewellery items count:', parsedItems.length);
      console.log('First item structure:', parsedItems[0]);
      console.log('First item keys:', Object.keys(parsedItems[0]));
      console.log('Has itemNumber property:', 'itemNumber' in parsedItems[0]);
      console.log('Has image property:', 'image' in parsedItems[0]);
      console.log('Image value type:', typeof parsedItems[0].image);
      console.log('Image value length:', parsedItems[0].image?.length);
      console.log('=== END DEBUG ===');

      setJewelleryItems(parsedItems);
      setRbiData(JSON.parse(rbiStr));
      const parsedPurityResults = JSON.parse(purityStr);
      console.log('Purity results:', parsedPurityResults);
      setPurityResults(parsedPurityResults);
      fetchGPS();
    };

    loadData();
  }, [navigate]);



  const handleExportPDF = async () => {
    try {
      console.log('=== EXPORTING PDF ===');

      if (!appraiser || !rbiData || !purityResults) {
        showToast('Missing appraisal data', 'error');
        return;
      }

      // Create appraisal summary for QR code
      const appraisalSummary = {
        appraisalId: appraiser.appraiser_id,
        appraiserName: appraiser.name,
        timestamp: new Date().toISOString(),
        totalItems: rbiData.totalItems,
        purityTestingCompleted: purityResults ? (purityResults.rubbingCompleted || purityResults.acidCompleted) : false,
        rubbingTest: purityResults?.rubbingCompleted ? 'Completed' : 'Not Completed',
        acidTest: purityResults?.acidCompleted ? 'Completed' : 'Not Completed',
      };

      // Generate QR code
      const qrDataString = JSON.stringify(appraisalSummary);
      const qrCodeDataUrl = await QRCode.toDataURL(qrDataString, {
        width: 300,
        margin: 2,
      });

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;

      // Title
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Gold Loan Appraisal Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Horizontal line
      pdf.setLineWidth(0.5);
      pdf.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 10;

      // Appraiser Information
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Appraiser Information', 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Name: ${appraiser.name}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`ID: ${appraiser.appraiser_id}`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Date: ${new Date().toLocaleString()}`, 20, yPosition);
      yPosition += 12;

      // Customer Information
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Customer Information', 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Front Image: Captured`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Side Image: Captured`, 20, yPosition);
      yPosition += 12;

      // Jewellery Items
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Jewellery Items', 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total Items: ${jewelleryItems.length}`, 20, yPosition);
      yPosition += 6;

      jewelleryItems.forEach((item, index) => {
        pdf.text(`  ${index + 1}. Item ${item.itemNumber}`, 25, yPosition);
        yPosition += 6;
      });
      yPosition += 6;

      // RBI Compliance
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('RBI Compliance Image', 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Overall Image: Captured`, 20, yPosition);
      yPosition += 6;
      pdf.text(`Compliance Date: ${new Date(rbiData.timestamp).toLocaleString()}`, 20, yPosition);
      yPosition += 12;

      // Purity Testing
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Purity Testing', 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      if (purityResults) {
        pdf.text(`Rubbing Test: ${purityResults.rubbingCompleted ? 'Completed' : 'Not Completed'}`, 20, yPosition);
        yPosition += 6;
        pdf.text(`Acid Test: ${purityResults.acidCompleted ? 'Completed' : 'Not Completed'}`, 20, yPosition);
        yPosition += 6;
        pdf.text(`Total Detections: ${purityResults.detectedActivities?.length || 0}`, 20, yPosition);
        yPosition += 6;
      } else {
        pdf.text(`No purity test results available`, 20, yPosition);
        yPosition += 6;
      }
      yPosition += 12;

      // QR Code Section
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Appraisal QR Code', 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Scan this QR code to view appraisal summary:', 20, yPosition);
      yPosition += 10;

      // Add QR code image
      const qrSize = 60;
      pdf.addImage(qrCodeDataUrl, 'PNG', 20, yPosition, qrSize, qrSize);
      yPosition += qrSize + 10;

      // Footer
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'italic');
      pdf.text('This is a computer-generated document.', pageWidth / 2, pageHeight - 15, { align: 'center' });
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Save PDF
      const fileName = `appraisal-${appraiser.appraiser_id}.pdf`;
      pdf.save(fileName);

      console.log('✓ PDF exported successfully');
      showToast('PDF exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      showToast('Failed to export PDF', 'error');
    }
  };

  const handleFinish = async () => {
    setIsLoading(true);

    try {
      // Save appraisal record before clearing data
      const appraisalRecord = {
        id: Date.now(),
        appraiser_name: appraiser.name,
        appraiser_id: appraiser.appraiser_id,
        total_items: jewelleryItems.length,
        purity_testing: purityResults ? `Rubbing: ${purityResults.rubbingCompleted ? 'Yes' : 'No'}, Acid: ${purityResults.acidCompleted ? 'Yes' : 'No'}` : 'Not completed',
        created_at: new Date().toISOString(),
        status: 'completed',
        jewellery_items: jewelleryItems,
        purity_results: purityResults,
        rbi_compliance: rbiData,
        customer_images: {
          front: customerFront,
          side: customerSide
        }
      };

      // Get existing records and add new one
      const existingRecords = JSON.parse(localStorage.getItem('appraisalRecords') || '[]');
      existingRecords.unshift(appraisalRecord); // Add to beginning

      // Keep only last 50 records to prevent storage overflow
      if (existingRecords.length > 50) {
        existingRecords.splice(50);
      }

      localStorage.setItem('appraisalRecords', JSON.stringify(existingRecords));

      showToast('Appraisal completed and saved successfully!', 'success');
      clearAppraisalData();
      navigate('/');
    } catch (error) {
      console.error('Error completing appraisal:', error);
      showToast('Failed to complete appraisal', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!appraiser || !rbiData || !purityResults) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(48,50%,99%)] via-[hsl(158,30%,97%)] to-[hsl(320,100%,98%)]">
      <StepIndicator currentStep={5} />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-[30px] shadow-2xl border border-[hsl(158,20%,88%)] overflow-hidden">
          <div className="bg-gradient-to-r from-[hsl(158,82%,18%)] via-[hsl(158,75%,22%)] to-[hsl(158,70%,25%)] p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-sm">
                  <CheckCircle className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-wide">Appraisal Summary</h1>
                  <p className="text-[hsl(158,60%,85%)] text-lg font-medium">Final Review - Step 5 of 5</p>
                </div>
              </div>
              <button
                onClick={handleExportPDF}
                className="px-8 py-4 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl backdrop-blur-sm"
              >
                <Download className="w-6 h-6" />
                Export PDF
              </button>
            </div>
          </div>

          <div className="p-10 space-y-10">
            <div className="bg-gradient-to-r from-[hsl(158,30%,95%)] to-[hsl(158,25%,92%)] rounded-[30px] p-8 border-2 border-[hsl(158,25%,85%)] shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <User className="w-8 h-8 text-[hsl(158,82%,18%)]" />
                <h2 className="text-2xl font-bold text-[hsl(158,82%,18%)] tracking-wide">Appraiser Information</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Name</p>
                  <p className="text-lg font-semibold text-gray-900">{appraiser.name}</p>
                  <p className="text-sm text-gray-600 mt-2 mb-1">ID</p>
                  <p className="text-sm font-mono text-gray-700">{appraiser.appraiser_id}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700 font-semibold mb-3">Photo</p>
                  {appraiser.photo ? (
                    <img
                      src={appraiser.photo}
                      alt="Appraiser"
                      className="w-36 h-36 object-cover rounded-2xl border-4 border-blue-400 shadow-lg"
                      onError={(e) => {
                        console.error('Failed to load appraiser photo');
                        console.error('Photo data length:', appraiser.photo?.length);
                        console.error('Photo data preview:', appraiser.photo?.substring(0, 100));
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement?.insertAdjacentHTML(
                          'beforeend',
                          '<div class="w-36 h-36 bg-gray-200 rounded-2xl border-4 border-blue-400 flex items-center justify-center text-gray-500 text-sm">Photo unavailable</div>'
                        );
                      }}
                      onLoad={() => {
                        console.log('Successfully loaded appraiser photo');
                      }}
                    />
                  ) : (
                    <div className="w-36 h-36 bg-gray-200 rounded-2xl border-4 border-blue-400 flex items-center justify-center text-gray-500 text-sm">
                      No photo
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[hsl(158,30%,95%)] to-[hsl(158,25%,92%)] rounded-[30px] p-8 border-2 border-[hsl(158,25%,85%)] shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <Camera className="w-8 h-8 text-[hsl(158,82%,18%)]" />
                <h2 className="text-2xl font-bold text-[hsl(158,82%,18%)] tracking-wide">Customer Images</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <p className="text-lg font-bold text-[hsl(158,82%,18%)] mb-4">Front View</p>
                  <img
                    src={customerFront}
                    alt="Customer Front"
                    className="w-full h-56 object-cover rounded-2xl border-4 border-[hsl(158,50%,75%)] shadow-lg"
                    onError={(e) => {
                      console.error('Failed to load customer front image:', customerFront?.substring(0, 50));
                      e.currentTarget.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log('Successfully loaded customer front image');
                    }}
                  />
                </div>
                {customerSide && (
                  <div>
                    <p className="text-lg font-bold text-[hsl(158,82%,18%)] mb-4">Side View</p>
                    <img
                      src={customerSide}
                      alt="Customer Side"
                      className="w-full h-56 object-cover rounded-2xl border-4 border-[hsl(158,50%,75%)] shadow-lg"
                      onError={(e) => {
                        console.error('Failed to load customer side image:', customerSide?.substring(0, 50));
                        e.currentTarget.style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log('Successfully loaded customer side image');
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-r from-[hsl(158,30%,95%)] to-[hsl(158,25%,92%)] rounded-[30px] p-8 border-2 border-[hsl(158,25%,85%)] shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <Shield className="w-8 h-8 text-[hsl(158,82%,18%)]" />
                <h2 className="text-2xl font-bold text-[hsl(158,82%,18%)] tracking-wide">RBI Compliance</h2>
              </div>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Items</p>
                  <p className="text-lg font-semibold text-gray-900">{rbiData.totalItems}</p>
                  <p className="text-sm text-gray-600 mt-2 mb-1">Compliance Timestamp</p>
                  <p className="text-sm text-gray-700">{formatTimestamp(new Date(rbiData.timestamp))}</p>
                </div>
                {/* Overall Jewellery Image - only show if available */}
                {rbiData.overallImages && rbiData.overallImages.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Overall Jewellery Image</p>
                    <img
                      src={rbiData.overallImages[0].image}
                      alt="Overall Jewellery"
                      className="w-full h-64 object-cover rounded-lg border-2 border-gray-300 shadow-md"
                      onError={(e) => {
                        console.error('Failed to load overall jewellery image:', rbiData.overallImages[0].image?.substring(0, 50));
                        e.currentTarget.style.display = 'none';
                      }}
                      onLoad={() => {
                        console.log('Successfully loaded overall jewellery image');
                      }}
                    />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Individual Items ({jewelleryItems.length})
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {jewelleryItems.map((item) => (
                      <div key={item.itemNumber} className="space-y-1">
                        <div className="aspect-square rounded-lg overflow-hidden border-2 border-gray-300 shadow-sm">
                          <img
                            src={item.image}
                            alt={`Item ${item.itemNumber}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error(`Failed to load image for item ${item.itemNumber}:`, item.image?.substring(0, 50));
                              e.currentTarget.style.display = 'none';
                            }}
                            onLoad={() => {
                              console.log(`Successfully loaded image for item ${item.itemNumber}`);
                            }}
                          />
                        </div>
                        <p className="text-xs font-semibold text-gray-700 text-center">
                          Item {item.itemNumber}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[hsl(158,30%,95%)] to-[hsl(158,25%,92%)] rounded-[30px] p-8 border-2 border-[hsl(158,25%,85%)] shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <FlaskConical className="w-8 h-8 text-[hsl(158,82%,18%)]" />
                <h2 className="text-2xl font-bold text-[hsl(158,82%,18%)] tracking-wide">Purity Testing</h2>
              </div>
              <div className="space-y-6">
                {purityResults ? (
                  <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl border-2 border-blue-200/50 shadow-md">
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                      <div className={`p-4 rounded-xl border-2 ${purityResults.rubbingCompleted
                        ? 'bg-emerald-50 border-emerald-400'
                        : 'bg-gray-50 border-gray-300'
                        }`}>
                        <p className="text-sm text-blue-600 font-semibold mb-2">Rubbing Test</p>
                        <p className={`text-lg font-bold ${purityResults.rubbingCompleted ? 'text-emerald-700' : 'text-gray-600'
                          }`}>
                          {purityResults.rubbingCompleted ? '✅ Completed' : '⏳ Not Completed'}
                        </p>
                      </div>
                      <div className={`p-4 rounded-xl border-2 ${purityResults.acidCompleted
                        ? 'bg-blue-50 border-blue-400'
                        : 'bg-gray-50 border-gray-300'
                        }`}>
                        <p className="text-sm text-blue-600 font-semibold mb-2">Acid Test</p>
                        <p className={`text-lg font-bold ${purityResults.acidCompleted ? 'text-blue-700' : 'text-gray-600'
                          }`}>
                          {purityResults.acidCompleted ? '✅ Completed' : '⏳ Not Completed'}
                        </p>
                      </div>
                    </div>
                    {purityResults.detectedActivities && purityResults.detectedActivities.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm text-blue-600 font-semibold mb-3">Detected Activities</p>
                        <div className="space-y-2">
                          {purityResults.detectedActivities.map((activity, index) => (
                            <div key={index} className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                              <span className="text-sm font-medium text-blue-900">
                                {activity.activity === 'rubbing' ? 'Rubbing Activity' : 'Acid Testing Activity'}
                              </span>
                              <span className="text-xs text-blue-600">
                                {new Date(activity.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-blue-700 font-medium">No purity test results available</p>
                )}
              </div>
            </div>
            {/* PASTE GPS SECTION HERE */}
            <div className="bg-gradient-to-r from-teal-50 to-cyan-100 rounded-2xl p-8 border-2 border-teal-200/60 shadow-lg">
              <div className="flex items-center gap-4 mb-6">
                <MapPin className="w-8 h-8 text-teal-600" />
                <h2 className="text-2xl font-bold text-teal-900 tracking-wide">GPS Location</h2>
              </div>

              {gpsLoading ? (
                <div className="flex items-center gap-2 text-teal-600">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="font-medium">Getting current location...</span>
                </div>
              ) : gpsError ? (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">{gpsError}</span>
                </div>
              ) : gpsData ? (
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  {/* Left: Map */}
                  <div className="flex justify-center">
                    {gpsData.map_image ? (
                      <img
                        src={gpsData.map_image}
                        alt="GPS Map"
                        className="w-48 h-48 rounded-2xl shadow-xl border-2 border-teal-200 object-cover"
                      />
                    ) : (
                      <div className="w-48 h-48 bg-gray-100 rounded-2xl border-2 border-teal-200 flex items-center justify-center">
                        <p className="text-gray-500 text-sm">Map not available</p>
                      </div>
                    )}
                  </div>

                  {/* Right: Details */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                      <MapPin className="h-5 w-5" />
                      <span>
                        {gpsData.latitude.toFixed(6)}, {gpsData.longitude.toFixed(6)}
                      </span>
                      <Globe className="h-4 w-4 text-cyan-600" />
                      <span className="text-xs uppercase tracking-wider">
                        {gpsData.source}
                      </span>
                    </div>

                    <p className="text-teal-700 font-medium">
                      {gpsData.address || 'Address not available'}
                    </p>

                    <p className="text-xs text-teal-600">
                      Captured: {formatTimestamp(new Date(gpsData.timestamp))}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-teal-700 font-medium">No location data available</p>
              )}
            </div>



            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-8 border-2 border-emerald-200/60 shadow-lg">
              <div className="flex items-center gap-4">
                <CheckCircle className="w-10 h-10 text-emerald-600" />
                <div>
                  <p className="text-2xl font-bold text-emerald-900 tracking-wide">
                    Appraisal Documentation Complete
                  </p>
                  <p className="text-lg text-emerald-700 font-medium">
                    All required steps have been completed successfully
                  </p>
                </div>
              </div>
            </div>
          </div>


          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 px-10 py-8 flex justify-between border-t border-blue-200/50">
            <button
              onClick={() => navigate('/purity-testing')}
              className="px-8 py-4 bg-white/80 hover:bg-white text-blue-700 rounded-2xl font-bold transition-all duration-300 flex items-center gap-3 shadow-lg hover:shadow-xl border border-blue-200"
            >
              <ArrowLeft className="w-6 h-6" />
              Back
            </button>
            <button
              onClick={handleFinish}
              disabled={isLoading}
              className="px-10 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-bold transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Home className="w-6 h-6" />
              {isLoading ? 'Finishing...' : 'Finish & Home'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
