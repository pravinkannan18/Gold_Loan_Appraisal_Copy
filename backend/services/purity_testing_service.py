"""
Purity Testing Service for Gold Loan Appraisal System
Backend-driven camera detection with MJPEG streaming
Based on rub.py logic
"""

import os
import cv2
import time
import warnings
import pandas as pd
import numpy as np
import base64
import torch
from typing import Optional, Dict, List, Any
from datetime import datetime
import threading
from collections import deque
from pathlib import Path
from fastapi.responses import StreamingResponse

# Suppress warnings
warnings.filterwarnings("ignore")
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

# Fix for PyTorch 2.6+ weights_only default change
# Monkeypatch torch.load to use weights_only=False for YOLO models
_original_torch_load = torch.load
def _patched_torch_load(*args, **kwargs):
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return _original_torch_load(*args, **kwargs)
torch.load = _patched_torch_load

# Try to import YOLO
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
    print("✓ YOLO libraries loaded successfully")
except ImportError as e:
    print(f"⚠️ YOLO libraries not available: {e}")
    YOLO_AVAILABLE = False


class PurityTestingService:
    """
    Purity testing service with backend-driven camera detection.
    - Opens cameras on the backend
    - Runs specific YOLO detection (Gold/Stone/Acid)
    - Streams annotated MJPEG to frontend
    """

    # ---- CONFIG ------------------------------------------------
    # Use absolute paths based on this file's location
    _BASE_DIR = Path(__file__).resolve().parent.parent
    _ML_MODELS_DIR = _BASE_DIR / "ml_models"
    
    MODEL_GOLD_PATH = _ML_MODELS_DIR / "best_top2.pt"
    MODEL_STONE_PATH = _ML_MODELS_DIR / "best_top_stone.pt"
    MODEL_ACID_PATH = _ML_MODELS_DIR / "best_aci_liq.pt"
    
    CAM_INDEX = 0
    CONF_THRESH = 0.35
    IMGSZ = 224
    
    # Device configuration (auto-detect GPU/CPU)
    # Set to 'cuda' to force GPU, 'cpu' to force CPU, or 'auto' for automatic
    DEVICE_MODE = 'auto'  # Options: 'auto', 'cuda', 'cpu'
    
    # Colors
    STONE_BOX_COLOR = (0, 0, 255)
    GOLD_OVERLAY_COLOR = (0, 215, 255)
    
    # Detection thresholds
    THRESHOLD_OF_FLUCTUATION = 2.0
    NO_OF_FLUCTUATIONS = 3
    WINDOW_SIZE = 10
    # ------------------------------------------------------------

    def __init__(self, database=None):
        self.db = database
        self.available = YOLO_AVAILABLE
        
        # Device configuration (GPU/CPU)
        self.device = self._detect_device()
        print(f"🔧 Device configured: {self.device}")

        # Detection status
        self.detection_status = {
            "message": "Waiting to start...",
            "rubbing_detected": False,
            "acid_detected": False,
            "current_task": "rubbing",
            "device": str(self.device)
        }
        self.rubbing_confirmed = False
        self.acid_detected = False

        # Cameras (lazy init on start)
        self.camera1 = None  # Top view / Rubbing
        self.camera2 = None  # Side view / Acid
        self.camera1_index = 0
        self.camera2_index = 1

        # Service state
        self.is_running = False
        self.current_task = "rubbing"  # "rubbing" -> "acid" -> "done"

        # Rubbing verification state
        self.recent_distances = deque(maxlen=self.WINDOW_SIZE)
        self.prev_centroid = None

        # Load YOLO models
        self.model_gold = None
        self.model_stone = None
        self.model_acid = None
        
        if YOLO_AVAILABLE:
            self._load_models()
    
    # ------------------------------------------------------------------ DEVICE DETECTION
    def _detect_device(self):
        """Auto-detect or configure device (GPU/CPU)"""
        if self.DEVICE_MODE == 'cpu':
            return 'cpu'
        
        if self.DEVICE_MODE == 'cuda':
            if torch.cuda.is_available():
                return 'cuda'
            else:
                print("⚠️ CUDA requested but not available. Falling back to CPU.")
                return 'cpu'
        
        # Auto mode - use GPU if available
        if torch.cuda.is_available():
            device = 'cuda'
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
            print(f"✓ GPU detected: {gpu_name} ({gpu_memory:.1f}GB)")
            return device
        else:
            print("ℹ️ No GPU detected. Using CPU.")
            return 'cpu'

    # ------------------------------------------------------------------ MODELS
    def _load_models(self):
        """Load YOLO models and move to configured device"""
        print(f"\n🔄 Loading YOLO models on device: {self.device.upper()}...")
        
        # Show GPU info if using CUDA
        if self.device == 'cuda' and torch.cuda.is_available():
            print(f"  GPU: {torch.cuda.get_device_name(0)}")
            print(f"  VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f}GB")
        
        try:
            if self.MODEL_GOLD_PATH.exists():
                self.model_gold = YOLO(str(self.MODEL_GOLD_PATH))
                self.model_gold.to(self.device)  # Move to GPU/CPU
                print(f"  ✓ Gold model loaded on {self.device.upper()}: {self.MODEL_GOLD_PATH.name}")
            else:
                print(f"  ⚠️ Gold model not found: {self.MODEL_GOLD_PATH}")

            if self.MODEL_STONE_PATH.exists():
                self.model_stone = YOLO(str(self.MODEL_STONE_PATH))
                self.model_stone.to(self.device)  # Move to GPU/CPU
                print(f"  ✓ Stone model loaded on {self.device.upper()}: {self.MODEL_STONE_PATH.name}")
            else:
                print(f"  ⚠️ Stone model not found: {self.MODEL_STONE_PATH}")
                
            if self.MODEL_ACID_PATH.exists():
                self.model_acid = YOLO(str(self.MODEL_ACID_PATH))
                self.model_acid.to(self.device)  # Move to GPU/CPU
                print(f"  ✓ Acid model loaded on {self.device.upper()}: {self.MODEL_ACID_PATH.name}")
            else:
                print(f"  ⚠️ Acid model not found: {self.MODEL_ACID_PATH}")
                
        except Exception as e:
            print(f"  ❌ Error loading models: {e}")

        self.available = (self.model_gold is not None and 
                          self.model_stone is not None and 
                          self.model_acid is not None)
                          
        print(f"  Models available: {self.available}")

    # ------------------------------------------------------------------ REFLECTION LOGIC (Ported)
    def _process_rubbing_frame(self, frame):
        H, W = frame.shape[:2]
        annotated = frame.copy()
        gold_clipped_full = np.zeros((H, W), dtype=np.uint8)
        gold_mask_pct = 0.0
        stone_bbox = None

        largest_box_full = None
        try:
            # Predict Stone
            if self.model_stone:
                res_s = next(self.model_stone.predict(frame, imgsz=self.IMGSZ, conf=self.CONF_THRESH, iou=0.45, stream=True, verbose=False))
                rs = res_s[0] if len(res_s) > 0 else None
                if rs and rs.boxes is not None:
                    xyxy = rs.boxes.xyxy.cpu().numpy()
                    largest_area = 0
                    for b in xyxy:
                        x1, y1, x2, y2 = map(int, b[:4])
                        area = (x2 - x1) * (y2 - y1)
                        if area > largest_area:
                            largest_area = area
                            largest_box_full = (x1, y1, x2, y2)
            
            if largest_box_full:
                x1, y1, x2, y2 = largest_box_full
                cv2.rectangle(annotated, (x1, y1), (x2, y2), self.STONE_BOX_COLOR, 2)
        except Exception as e:
            print(f"Stone error: {e}")

        if largest_box_full:
            sx1, sy1, sx2, sy2 = largest_box_full
            try:
                # Predict Gold
                if self.model_gold:
                    res_g = next(self.model_gold.predict(frame, imgsz=self.IMGSZ, conf=self.CONF_THRESH, iou=0.45, stream=True, verbose=False))
                    rg = res_g[0] if len(res_g) > 0 else None
                    if rg and rg.masks is not None:
                        mask = rg.masks.data[0].cpu().numpy()
                        if mask.ndim == 3:
                            mask = mask[0]
                        
                        # Resize mask to fit frame
                        gold_mask_full = (mask > 0.5).astype(np.uint8) * 255
                        gold_mask_resized = cv2.resize(gold_mask_full, (W, H), interpolation=cv2.INTER_NEAREST)
                        
                        stone_mask = np.zeros((H, W), dtype=np.uint8)
                        cv2.rectangle(stone_mask, (sx1, sy1), (sx2, sy2), 255, -1)
                        
                        gold_clipped_full = cv2.bitwise_and(gold_mask_resized, stone_mask)
                        annotated[gold_clipped_full > 0] = self.GOLD_OVERLAY_COLOR

                        stone_area = max(1, (sx2-sx1)*(sy2-sy1))
                        gold_mask_pct = (gold_clipped_full > 0).sum() / stone_area * 100
                        stone_bbox = (sx1, sy1, sx2, sy2)
            except Exception as e:
                print(f"Gold error: {e}")

        return annotated, {
            'mask': gold_clipped_full,
            'mask_pct': gold_mask_pct,
            'stone_bbox': stone_bbox
        }

    def _compute_rubbing(self, annotated, gold_info):
        if not gold_info or gold_info['stone_bbox'] is None:
            return annotated, None, False

        mask = gold_info['mask']
        stone_bbox = gold_info['stone_bbox']
        
        if (mask > 0).sum() == 0:
            return annotated, None, False

        M = cv2.moments(mask)
        if M['m00'] == 0:
            return annotated, None, False

        cx = int(M['m10'] / M['m00'])
        cy = int(M['m01'] / M['m00'])
        cv2.circle(annotated, (cx, cy), 5, (0,0,255), -1)

        sx1, sy1, sx2, sy2 = stone_bbox
        scx = (sx1 + sx2) / 2
        scy = (sy1 + sy2) / 2
        dist = np.hypot(cx - scx, cy - scy)
        
        self.recent_distances.append(dist)

        visual_ok = False
        if len(self.recent_distances) >= 3:
            diffs = np.diff(self.recent_distances)
            meaningful = np.abs(diffs) >= self.THRESHOLD_OF_FLUCTUATION
            signs = np.sign(diffs)
            sign_changes = 0
            if len(signs) > 0:
                prev_sign = signs[0]
                for i in range(1, len(signs)):
                    s = signs[i]
                    if meaningful[i] and meaningful[i-1] and s != 0 and prev_sign != 0 and s != prev_sign:
                        sign_changes += 1
                    prev_sign = s if s != 0 else prev_sign
            visual_ok = sign_changes >= self.NO_OF_FLUCTUATIONS

        return annotated, (cx, cy), visual_ok

    def _process_acid_frame(self, frame):
        annotated = frame.copy()
        acid_found = False
        
        if self.model_acid:
            try:
                results = self.model_acid(frame, imgsz=self.IMGSZ, conf=0.8, verbose=False)[0]
                if results.boxes is not None:
                    for box in results.boxes:
                        cls = int(box.cls[0].item())
                        conf = box.conf[0].item()
                        if conf > 0.4:
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            cv2.rectangle(annotated, (x1,y1), (x2,y2), (0,255,255), 3)
                            cv2.putText(annotated, f"Acid {conf:.2f}", (x1, y1-10),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0,255,255), 2)
                            acid_found = True
            except Exception as e:
                print(f"Acid detection error: {e}")

        return annotated, acid_found

    # ------------------------------------------------------------------ CAMERAS
    def _init_camera(self, index: int) -> Optional[cv2.VideoCapture]:
        """Initialize camera with retries and multiple backend fallbacks"""
        backends = [
            (cv2.CAP_DSHOW, "DSHOW"),
            (cv2.CAP_MSMF, "MSMF"),
            (cv2.CAP_ANY, "ANY"),
        ]
        
        for backend, backend_name in backends:
            for attempt in range(2):
                try:
                    cam = cv2.VideoCapture(index, backend)
                    if cam.isOpened():
                        ret, _ = cam.read()
                        if ret:
                            cam.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                            cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                            print(f"  ✓ Camera {index} opened ({backend_name})")
                            return cam
                        cam.release()
                except Exception:
                    pass
                time.sleep(0.5)
        
        print(f"  ❌ Camera {index} failed")
        return None

    def _release_cameras(self):
        """Release all cameras"""
        for cam, name in ((self.camera1, "cam1"), (self.camera2, "cam2")):
            if cam and cam.isOpened():
                cam.release()
        self.camera1 = None
        self.camera2 = None

    # ------------------------------------------------------------------ START/STOP
    def start(self, camera1_index: int = None, camera2_index: int = None):
        """Start purity testing with cameras"""
        print("\n🚀 Starting Purity Testing Service...")

        if camera1_index is not None: self.camera1_index = camera1_index
        if camera2_index is not None: self.camera2_index = camera2_index

        self._release_cameras()
        time.sleep(0.5)

        self.camera1 = self._init_camera(self.camera1_index)
        self.camera2 = self._init_camera(self.camera2_index)

        cam1_ok = self.camera1 is not None and self.camera1.isOpened()
        cam2_ok = self.camera2 is not None and self.camera2.isOpened()
        
        if not cam1_ok and not cam2_ok:
            raise RuntimeError("No cameras could be opened.")

        # Reset state
        self.is_running = True
        self.current_task = "rubbing"
        self.rubbing_confirmed = False
        self.acid_detected = False
        self.recent_distances.clear()
        
        self.detection_status = {
            "message": "Detection started – waiting for Rubbing...",
            "rubbing_detected": False,
            "acid_detected": False,
            "current_task": "rubbing",
            "camera1_active": cam1_ok,
            "camera2_active": cam2_ok
        }

        print("✓ Purity Testing Service STARTED")
        return self.detection_status

    def stop(self):
        """Stop purity testing"""
        print("\n🛑 Stopping Purity Testing Service...")
        self.is_running = False
        self._release_cameras()
        self.detection_status["message"] = "Detection stopped."
        self.detection_status["current_task"] = "stopped"
        return self.detection_status

    # ------------------------------------------------------------------ MJPEG STREAMING
    def _generate_frames(self, cam_getter, cam_id: int):
        """Generate MJPEG frames with specific logic overlay"""
        while True:
            cam = cam_getter()
            if cam is None or not cam.isOpened():
                placeholder = np.zeros((480, 640, 3), np.uint8)
                cv2.putText(placeholder, f"Cam {cam_id} OFFLINE", (80, 240),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
                _, buf = cv2.imencode('.jpg', placeholder)
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buf.tobytes() + b'\r\n')
                time.sleep(1.0)
                continue

            ret, frame = cam.read()
            if not ret:
                time.sleep(0.01)
                continue

            frame = cv2.resize(frame, (640, 480))
            
            # Logic Processing
            if self.is_running:
                # Camera 1: Rubbing
                if cam_id == 1:
                    cv2.putText(frame, "STAGE 1: GOLD RUBBING", (10, 40), cv2.FONT_HERSHEY_DUPLEX, 0.8, (255,255,255), 2)
                    
                    if self.current_task == "rubbing":
                        frame, info = self._process_rubbing_frame(frame)
                        frame, centroid, visual_ok = self._compute_rubbing(frame, info)
                        
                        cv2.putText(frame, f"Visual: {'OK' if visual_ok else 'NOT OK'}", (10, 80),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0) if visual_ok else (0,0,255), 2)
                        
                        if visual_ok:
                            self.rubbing_confirmed = True
                            self.detection_status["rubbing_detected"] = True
                            self.detection_status["message"] = "Rubbing Confirmed! Switch to Acid."
                            self.current_task = "acid"
                            
                    elif self.current_task == "acid" or self.current_task == "done":
                        cv2.putText(frame, "RUBBING COMPLETE", (10, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,0), 2)

                # Camera 2: Acid
                elif cam_id == 2:
                    cv2.putText(frame, "STAGE 2: ACID DETECTION", (10, 40), cv2.FONT_HERSHEY_DUPLEX, 0.8, (255,255,255), 2)
                    
                    if self.current_task == "acid":
                        frame, acid_found = self._process_acid_frame(frame)
                        
                        status = "ACID DETECTED!" if acid_found else "No Acid Yet"
                        color = (0,255,0) if acid_found else (0,0,255)
                        cv2.putText(frame, status, (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 3)
                        
                        if acid_found:
                            self.acid_detected = True
                            self.detection_status["acid_detected"] = True
                            self.detection_status["message"] = "Acid Detected! Test Complete."
                            self.current_task = "done"

                    elif self.current_task == "rubbing":
                        cv2.putText(frame, "WAITING FOR RUBBING...", (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0,255,255), 2)
                    
                    elif self.current_task == "done":
                        cv2.putText(frame, "TEST COMPLETE", (10, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0,255,0), 3)

            # Encode and yield frame
            _, buf = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
            if _:
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buf.tobytes() + b'\r\n')
            time.sleep(0.01)

    def video_feed1(self):
        """MJPEG stream from camera 1 (Top View / Rubbing)"""
        return StreamingResponse(
            self._generate_frames(lambda: self.camera1, 1),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )

    def video_feed2(self):
        """MJPEG stream from camera 2 (Side View / Acid)"""
        return StreamingResponse(
            self._generate_frames(lambda: self.camera2, 2),
            media_type="multipart/x-mixed-replace; boundary=frame"
        )

    # ------------------------------------------------------------------ ANALYZE FRAMES (for frontend-sent frames)
    async def analyze_frames(self, frame1_b64: Optional[str] = None, frame2_b64: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyze frames for gold rubbing and acid testing.
        Supports sequential mode: Rubbing first, then Acid on the same or a different stream.
        """
        if not self.available:
            return {"error": "YOLO models not loaded", "rubbing_detected": False, "acid_detected": False}

        results = {
            "rubbing_detected": False,
            "acid_detected": False,
            "annotated_frame1": None,
            "annotated_frame2": None,
            "model1_status": "ready" if (self.model_gold and self.model_stone) else "ready",
            "model2_status": "ready" if self.model_acid else "ready",
            "message": self.detection_status["message"]
        }

        try:
            # Stage 1: Rubbing Analysis (Primary stream)
            if frame1_b64:
                try:
                    img1_bytes = base64.b64decode(frame1_b64.split(",")[1])
                    nparr1 = np.frombuffer(img1_bytes, np.uint8)
                    frame1 = cv2.imdecode(nparr1, cv2.IMREAD_COLOR)

                    if frame1 is not None:
                        # 1. Rubbing Process
                        annotated1, info = self._process_rubbing_frame(frame1)
                        annotated1, centroid, rubbing_ok = self._compute_rubbing(annotated1, info)
                        
                        if rubbing_ok and not self.rubbing_confirmed:
                            self.rubbing_confirmed = True
                            self.detection_status["rubbing_detected"] = True
                            self.detection_status["message"] = "Rubbing Confirmed! Waiting for Acid Test..."
                            self.detection_status["current_task"] = "acid"
                            print("✅ Rubbing confirmed in backend")

                        # 2. Acid Process (Sequential Mode)
                        # If frame2 is not provided, we can look for acid on frame1 if rubbing is confirmed
                        acid_found_on_frame1 = False
                        if self.rubbing_confirmed:
                            annotated1, acid_found_on_frame1 = self._process_acid_frame(annotated1)
                            if acid_found_on_frame1:
                                if not self.acid_detected:
                                    self.acid_detected = True
                                    self.detection_status["acid_detected"] = True
                                    self.detection_status["message"] = "Acid Detected! Test Complete."
                                    print("✅ Acid detected in backend (on frame 1)")

                        # Add status indicators to annotated frame
                        status_text = "RUBBING" if not self.rubbing_confirmed else "ACID TEST"
                        cv2.putText(annotated1, f"STATUS: {status_text}", (10, 30),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                        
                        # Show live rubbing movement detection
                        if not self.rubbing_confirmed:
                           cv2.putText(annotated1, f"Visual: {'OK' if rubbing_ok else 'NOT OK'}", (10, 60),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0) if rubbing_ok else (0, 0, 255), 2)
                        
                        if self.rubbing_confirmed:
                           cv2.putText(annotated1, "✓ RUBBING OK", (10, 60),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                        if self.acid_detected:
                           cv2.putText(annotated1, "✓ ACID OK", (10, 90),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

                        _, buf1 = cv2.imencode('.jpg', annotated1, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                        results["annotated_frame1"] = f"data:image/jpeg;base64,{base64.b64encode(buf1).decode()}"
                except Exception as e:
                    print(f"Frame 1 processing error: {e}")

            # Stage 2: Secondary stream for Acid (Optional)
            if frame2_b64:
                try:
                    img2_bytes = base64.b64decode(frame2_b64.split(",")[1])
                    nparr2 = np.frombuffer(img2_bytes, np.uint8)
                    frame2 = cv2.imdecode(nparr2, cv2.IMREAD_COLOR)

                    if frame2 is not None:
                        annotated2, acid_found = self._process_acid_frame(frame2)
                        
                        if acid_found:
                            if not self.acid_detected:
                                self.acid_detected = True
                                self.detection_status["acid_detected"] = True
                                self.detection_status["message"] = "Acid Detected! Test Complete."
                                print("✅ Acid detected in backend (on frame 2 stream)")
                        
                        # Add Visual Status
                        status = "ACID DETECTED!" if acid_found else "No Acid"
                        color = (0, 255, 0) if acid_found else (0, 0, 255)
                        cv2.putText(annotated2, status, (10, 30),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                        
                        _, buf2 = cv2.imencode('.jpg', annotated2, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                        results["annotated_frame2"] = f"data:image/jpeg;base64,{base64.b64encode(buf2).decode()}"
                except Exception as e:
                    print(f"Frame 2 processing error: {e}")

            # Sync flags
            results["rubbing_detected"] = self.rubbing_confirmed
            results["acid_detected"] = self.acid_detected
            results["detection_status"] = self.get_detection_status()

        except Exception as e:
            print(f"Error in analyze_frames: {e}")
            import traceback
            traceback.print_exc()
            results["error"] = str(e)

        return results

    # ------------------------------------------------------------------ PUBLIC API
    def is_available(self) -> bool:
        return self.available

    def get_available_cameras(self) -> List[Dict[str, Any]]:
        cams = []
        for i in range(3):
            try:
                cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
                if cap.isOpened():
                    cams.append({"index": i, "resolution": "640x480"})
                    cap.release()
            except: pass
        return cams

    def get_detection_status(self) -> Dict[str, Any]:
        return self.detection_status.copy()

    def reset_detection_status(self):
        self.stop()

    def validate_csv_files(self):
        # Legacy stub
        return {"valid": True, "rubbing_tasks": 0, "acid_tasks": 0}

    def create_sample_csv_files(self):
        # Legacy stub
        return {"success": True, "message": "Not needed for new visual logic"}

    def cleanup(self):
        self.stop()
        cv2.destroyAllWindows()
