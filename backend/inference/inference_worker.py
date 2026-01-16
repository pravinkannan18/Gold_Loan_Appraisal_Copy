"""
Inference Worker - Main inference pipeline for video frames
Handles gold detection, rubbing analysis, and acid testing
"""
import cv2
import numpy as np
import time
from typing import Dict, Tuple, Optional, Any
from collections import deque
import logging

from .model_manager import get_model_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class InferenceWorker:
    """
    Main inference pipeline for processing video frames.
    
    Features:
    - Gold detection with rubbing motion analysis
    - Stone detection
    - Acid test detection
    - Bounding box and label drawing
    - Motion tracking for rubbing confirmation
    """
    
    def __init__(self):
        self.model_manager = get_model_manager()
        
        # Rubbing motion tracking
        self.centroid_history = deque(maxlen=30)  # Track last 30 centroids
        self.rubbing_threshold = 15  # Minimum movement for rubbing detection
        self.rubbing_confirm_frames = 10  # Frames needed to confirm rubbing
        self.rubbing_frame_count = 0
        
        # Detection parameters
        self.conf_threshold = 0.5
        self.iou_threshold = 0.5
        
        logger.info("🔧 InferenceWorker initialized")
    
    def process_frame(self, frame: np.ndarray, current_task: str = "rubbing",
                      session_state: Dict = None) -> Tuple[np.ndarray, Dict]:
        """
        Process a single frame through the inference pipeline.
        
        Args:
            frame: Input frame (BGR numpy array)
            current_task: Current task (rubbing, acid, done)
            session_state: Session detection state dict
            
        Returns:
            Tuple of (annotated_frame, detection_result)
        """
        if session_state is None:
            session_state = {}
        
        annotated = frame.copy()
        detection_result = {
            "rubbing_detected": False,
            "acid_detected": False,
            "gold_purity": None,
            "detections": []
        }
        
        if current_task == "rubbing":
            annotated, detection_result = self._process_rubbing(frame, annotated, detection_result)
        elif current_task == "acid":
            annotated, detection_result = self._process_acid(frame, annotated, detection_result)
        elif current_task == "done":
            # Just return frame with "Done" overlay
            self._draw_done_overlay(annotated)
        
        return annotated, detection_result
    
    def _process_rubbing(self, frame: np.ndarray, annotated: np.ndarray, 
                         detection_result: Dict) -> Tuple[np.ndarray, Dict]:
        """Process frame for rubbing detection"""
        # Run gold detection
        gold_result = self.model_manager.predict("gold", frame, 
                                                  conf=self.conf_threshold, 
                                                  iou=self.iou_threshold)
        
        # Run stone detection
        stone_result = self.model_manager.predict("stone", frame,
                                                   conf=self.conf_threshold,
                                                   iou=self.iou_threshold)
        
        gold_bbox = None
        stone_bbox = None
        gold_mask = None
        
        # Process gold detection
        if gold_result is not None and gold_result.boxes is not None:
            for box in gold_result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                conf = float(box.conf[0])
                
                gold_bbox = (x1, y1, x2, y2)
                detection_result["detections"].append({
                    "type": "gold",
                    "bbox": gold_bbox,
                    "confidence": conf
                })
                
                # Draw gold bounding box (green)
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(annotated, f"Gold {conf:.2f}", (x1, y1 - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                
                # Save gold bbox for centroid tracking
                gold_bbox = (x1, y1, x2, y2)
        
        # Process stone detection
        if stone_result is not None and stone_result.boxes is not None:
            for box in stone_result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                conf = float(box.conf[0])
                
                stone_bbox = (x1, y1, x2, y2)
                detection_result["detections"].append({
                    "type": "stone",
                    "bbox": stone_bbox,
                    "confidence": conf
                })
                
                # Draw stone bounding box (blue)
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (255, 0, 0), 2)
                cv2.putText(annotated, f"Stone {conf:.2f}", (x1, y1 - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 0), 2)
                
        # Compute rubbing motion using bbox centroids (much faster than masks)
        if gold_bbox is not None and stone_bbox is not None:
            cx = (gold_bbox[0] + gold_bbox[2]) // 2
            cy = (gold_bbox[1] + gold_bbox[3]) // 2
            
            rubbing_detected = self._compute_rubbing_motion(cx, cy, stone_bbox, annotated)
            detection_result["rubbing_detected"] = rubbing_detected
        
        # Draw rubbing status
        self._draw_rubbing_status(annotated, detection_result["rubbing_detected"])
        
        return annotated, detection_result
    
    def _compute_rubbing_motion(self, cx: int, cy: int, stone_bbox: Tuple, 
                                 annotated: np.ndarray) -> bool:
        """
        Compute rubbing motion by tracking gold centroid movement.
        
        Rubbing is detected when the gold item moves back and forth
        over the stone surface.
        """
        # Draw centroid
        cv2.circle(annotated, (cx, cy), 5, (0, 255, 255), -1)
        
        # Add to history
        self.centroid_history.append((cx, cy))
        
        if len(self.centroid_history) < 2:
            return False
        
        # Calculate total movement
        total_movement = 0
        direction_changes = 0
        prev_dx = 0
        
        for i in range(1, len(self.centroid_history)):
            prev = self.centroid_history[i - 1]
            curr = self.centroid_history[i]
            dx = curr[0] - prev[0]
            dy = curr[1] - prev[1]
            movement = np.sqrt(dx**2 + dy**2)
            total_movement += movement
            
            # Check for direction changes (oscillation)
            if prev_dx != 0 and np.sign(dx) != np.sign(prev_dx):
                direction_changes += 1
            prev_dx = dx
        
        # Check if rubbing pattern detected
        # Requires significant movement with direction changes (oscillation)
        is_rubbing = total_movement > self.rubbing_threshold and direction_changes >= 2
        
        if is_rubbing:
            self.rubbing_frame_count += 1
        else:
            self.rubbing_frame_count = max(0, self.rubbing_frame_count - 1)
        
        # Confirm rubbing after consistent detection
        return self.rubbing_frame_count >= self.rubbing_confirm_frames
    
    def _process_acid(self, frame: np.ndarray, annotated: np.ndarray,
                      detection_result: Dict) -> Tuple[np.ndarray, Dict]:
        """Process frame for acid test detection"""
        # Run acid detection
        acid_result = self.model_manager.predict("acid", frame,
                                                  conf=self.conf_threshold,
                                                  iou=self.iou_threshold)
        
        if acid_result is not None and acid_result.boxes is not None:
            for box in acid_result.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                conf = float(box.conf[0])
                cls = int(box.cls[0]) if hasattr(box, 'cls') else 0
                
                # Get class name (may indicate purity level)
                class_name = acid_result.names.get(cls, "Acid")
                
                detection_result["detections"].append({
                    "type": "acid",
                    "class": class_name,
                    "bbox": (x1, y1, x2, y2),
                    "confidence": conf
                })
                
                # Draw acid detection (yellow/orange)
                color = (0, 165, 255)  # Orange
                cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
                cv2.putText(annotated, f"{class_name} {conf:.2f}", (x1, y1 - 10),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
                
                detection_result["acid_detected"] = True
                
                # Parse purity from class name if available
                if "22k" in class_name.lower():
                    detection_result["gold_purity"] = "22K"
                elif "18k" in class_name.lower():
                    detection_result["gold_purity"] = "18K"
                elif "24k" in class_name.lower():
                    detection_result["gold_purity"] = "24K"
        
        # Draw acid status
        self._draw_acid_status(annotated, detection_result)
        
        return annotated, detection_result
    
    def _draw_rubbing_status(self, frame: np.ndarray, rubbing_detected: bool):
        """Draw rubbing detection status on frame"""
        height, width = frame.shape[:2]
        
        if rubbing_detected:
            status_text = "RUBBING DETECTED ✓"
            color = (0, 255, 0)
        else:
            status_text = "Rubbing in progress..."
            color = (0, 255, 255)
        
        # Draw status at bottom center
        text_size = cv2.getTextSize(status_text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)[0]
        x = (width - text_size[0]) // 2
        y = height - 30
        
        # Background
        cv2.rectangle(frame, (x - 10, y - 30), (x + text_size[0] + 10, y + 10), (0, 0, 0), -1)
        cv2.putText(frame, status_text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
    
    def _draw_acid_status(self, frame: np.ndarray, detection_result: Dict):
        """Draw acid test status on frame"""
        height, width = frame.shape[:2]
        
        if detection_result.get("acid_detected"):
            purity = detection_result.get("gold_purity", "Unknown")
            status_text = f"ACID TEST: {purity}"
            color = (0, 255, 0)
        else:
            status_text = "Waiting for acid test..."
            color = (0, 255, 255)
        
        # Draw status at bottom center
        text_size = cv2.getTextSize(status_text, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 2)[0]
        x = (width - text_size[0]) // 2
        y = height - 30
        
        cv2.rectangle(frame, (x - 10, y - 30), (x + text_size[0] + 10, y + 10), (0, 0, 0), -1)
        cv2.putText(frame, status_text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
    
    def _draw_done_overlay(self, frame: np.ndarray):
        """Draw completion overlay"""
        height, width = frame.shape[:2]
        
        # Semi-transparent overlay
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (width, height), (0, 100, 0), -1)
        cv2.addWeighted(overlay, 0.3, frame, 0.7, 0, frame)
        
        # Draw checkmark and text
        text = "ANALYSIS COMPLETE"
        text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 1.2, 3)[0]
        x = (width - text_size[0]) // 2
        y = height // 2
        
        cv2.putText(frame, text, (x, y), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 3)
    
    def reset(self):
        """Reset internal state"""
        self.centroid_history.clear()
        self.rubbing_frame_count = 0
