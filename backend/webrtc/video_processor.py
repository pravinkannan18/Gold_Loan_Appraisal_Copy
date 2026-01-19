"""
WebRTC Video Processor using aiortc
Receives video frames, runs inference, returns annotated frames
"""
import asyncio
import cv2
import numpy as np
import time
from typing import Optional, Dict, Any
import logging

try:
    from aiortc import MediaStreamTrack
    from av import VideoFrame
    AIORTC_AVAILABLE = True
except ImportError:
    AIORTC_AVAILABLE = False
    # Create dummy classes for import
    class MediaStreamTrack:
        pass
    class VideoFrame:
        pass

# Import inference engine
from inference.inference_worker import InferenceWorker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VideoTransformTrack(MediaStreamTrack):
    """
    A video track that transforms frames through AI inference.
    
    Receives video frames from the client, runs YOLO detection,
    and returns annotated frames back to the client.
    """
    
    kind = "video"
    
    def __init__(self, track: MediaStreamTrack, session: Any):
        """
        Initialize the video transform track.
        
        Args:
            track: The incoming video track from client
            session: WebRTC session for state management
        """
        super().__init__()
        self.track = track
        self.session = session
        self.inference_worker = InferenceWorker()
        
        # Performance tracking
        self.frame_count = 0
        self.last_fps_time = time.time()
        self.fps = 0.0
        
        # State transition queue to prevent race conditions
        self._pending_task_switch = None
        
        logger.info("🎬 VideoTransformTrack initialized")
    
    async def recv(self) -> VideoFrame:
        """
        Receive a frame, process it through inference, and return annotated frame.
        
        This is called for each incoming frame from the WebRTC track.
        """
        try:
            # Receive frame from client (this is sequential)
            try:
                frame = await self.track.recv()
            except Exception as recv_error:
                # Handle MediaStreamError or track ending
                if "MediaStreamError" in str(type(recv_error).__name__):
                    logger.warning("⚠️ Media stream ended - track closed by client")
                    raise  # Re-raise to close connection cleanly
                else:
                    logger.error(f"❌ Error receiving frame: {recv_error}")
                    raise
                    
            self.frame_count += 1
            
            # Apply any pending task switches at a safe point (start of frame processing)
            if self._pending_task_switch:
                logger.info(f"🔄 Applying queued task switch: {self.session.current_task} → {self._pending_task_switch}")
                self.session.current_task = self._pending_task_switch
                self.session.detection_status["acid_detected"] = False
                self._pending_task_switch = None
                # Send status update via data channel
                self._send_status_update()
            
            # Simple frame skipping to reduce latency
            # Only process every 2nd frame for AI analysis to maintain 15fps inference on a 30fps stream
            # This drastically reduces the processing load and latency
            should_process = self.frame_count % 2 == 0
            
            if not should_process:
                # Still need to update FPS and draw overlay on skipped frames
                # but we'll use the last known detection result
                img = frame.to_ndarray(format="bgr24")
                self._update_fps()
                # We don't call process_frame here, just draw the last overlay/status
                self._draw_overlay(img, getattr(self, 'last_process_time', 0.0))
                
                new_frame = VideoFrame.from_ndarray(img, format="bgr24")
                new_frame.pts = frame.pts
                new_frame.time_base = frame.time_base
                return new_frame

            # Log periodically (every 60 frames)
            if self.frame_count % 60 == 0:
                logger.debug(f"🔄 Processing frame {self.frame_count}, size: {frame.width}x{frame.height}")
            
            # Convert to numpy array for processing
            img = frame.to_ndarray(format="bgr24")
            
            # Run inference
            start_time = time.time()
            annotated_img, detection_result = self.inference_worker.process_frame(
                img,
                current_task=self.session.current_task,
                session_state=self.session.detection_status
            )
            self.last_process_time = (time.time() - start_time) * 1000  # ms
            
            # Update session state based on detection
            self._update_session_state(detection_result)
            
            # Periodically send status updates (every 30 frames / ~2 seconds)
            if self.frame_count % 30 == 0:
                self._send_status_update()
            
            # Add FPS and process time overlay
            self._update_fps()
            self._draw_overlay(annotated_img, self.last_process_time)
            
            # Convert back to VideoFrame
            new_frame = VideoFrame.from_ndarray(annotated_img, format="bgr24")
            new_frame.pts = frame.pts
            new_frame.time_base = frame.time_base
            
            return new_frame
            
        except Exception as e:
            import traceback
            logger.error(f"❌ Error processing frame: {e}")
            logger.error(f"❌ Error type: {type(e).__name__}")
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            logger.error(f"❌ Current task: {self.session.current_task}")
            logger.error(f"❌ Frame count: {self.frame_count}")
            # Return original frame on error
            try:
                img = frame.to_ndarray(format="bgr24")
                new_frame = VideoFrame.from_ndarray(img, format="bgr24")
                new_frame.pts = frame.pts
                new_frame.time_base = frame.time_base
                return new_frame
            except:
                # If even that fails, try to get next frame
                return await self.track.recv()
    
    def _update_session_state(self, detection_result: Dict):
        """Update session state based on detection results"""
        if not detection_result:
            return
            
        state_changed = False
            
        # Update detection status - only update for current task
        if detection_result.get("rubbing_detected") and self.session.current_task == "rubbing":
            if not self.session.detection_status["rubbing_detected"]:
                state_changed = True
            self.session.detection_status["rubbing_detected"] = True
            
        # Only update acid_detected when we're actually in acid task
        if detection_result.get("acid_detected") and self.session.current_task == "acid":
            if not self.session.detection_status["acid_detected"]:
                state_changed = True
            self.session.detection_status["acid_detected"] = True
            
        if detection_result.get("gold_purity"):
            self.session.detection_status["gold_purity"] = detection_result["gold_purity"]
        
        # Auto-transition: rubbing -> acid when rubbing detected
        if self.session.current_task == "rubbing" and self.session.detection_status["rubbing_detected"]:
            # Queue the task switch instead of applying immediately
            if self._pending_task_switch is None:
                self._pending_task_switch = "acid"
                logger.info("✅ Rubbing confirmed! Queuing switch to acid task")
                state_changed = True
            
        # Auto-transition: acid -> done when acid detected
        if self.session.current_task == "acid" and self.session.detection_status["acid_detected"]:
            if self._pending_task_switch is None:
                self._pending_task_switch = "done"
                logger.info("✅ Acid test complete! Queuing switch to done")
                state_changed = True
        
        # Send status update whenever state changes
        if state_changed:
            self._send_status_update()
    
    def _update_fps(self):
        """Calculate and update FPS based on received frames"""
        current_time = time.time()
        elapsed = current_time - self.last_fps_time
        
        if elapsed >= 1.0:
            self.fps = self.frame_count / elapsed
            self.frame_count = 0
            self.last_fps_time = current_time
    
    def _draw_overlay(self, img: np.ndarray, process_time: float):
        """Draw FPS and status overlay on frame"""
        height, width = img.shape[:2]
        
        # Draw semi-transparent background for stats
        overlay = img.copy()
        cv2.rectangle(overlay, (10, 10), (250, 100), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.6, img, 0.4, 0, img)
        
        # Draw text
        font = cv2.FONT_HERSHEY_SIMPLEX
        cv2.putText(img, f"FPS: {self.fps:.1f}", (20, 35), font, 0.6, (0, 255, 0), 2)
        cv2.putText(img, f"Process: {process_time:.1f}ms", (20, 60), font, 0.6, (0, 255, 0), 2)
        cv2.putText(img, f"Task: {self.session.current_task}", (20, 85), font, 0.6, (0, 255, 255), 2)
        
        # Draw detection status
        status = self.session.detection_status
        status_y = height - 60
        
        if status.get("rubbing_detected"):
            cv2.putText(img, "✓ Rubbing OK", (20, status_y), font, 0.6, (0, 255, 0), 2)
        else:
            cv2.putText(img, "○ Rubbing...", (20, status_y), font, 0.6, (255, 255, 0), 2)
        
        if status.get("acid_detected"):
            cv2.putText(img, "✓ Acid OK", (20, status_y + 25), font, 0.6, (0, 255, 0), 2)
    
    def _send_status_update(self):
        """Send status update via data channel"""
        if hasattr(self.session, 'status_channel') and self.session.status_channel:
            try:
                # Check if data channel is open
                if self.session.status_channel.readyState != 'open':
                    logger.debug(f"⏳ Data channel not open yet (state: {self.session.status_channel.readyState})")
                    return
                    
                import json
                status_data = json.dumps({
                    "type": "status",
                    "current_task": self.session.current_task,
                    "rubbing_detected": self.session.detection_status["rubbing_detected"],
                    "acid_detected": self.session.detection_status["acid_detected"],
                    "gold_purity": self.session.detection_status.get("gold_purity")
                })
                self.session.status_channel.send(status_data)
                logger.info(f"📡 Sent status update: task={self.session.current_task}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to send status via data channel: {e}")
