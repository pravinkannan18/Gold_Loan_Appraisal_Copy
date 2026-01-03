import cv2
import base64
import numpy as np
from typing import Optional
import platform

class CameraService:
    """Service for camera operations"""
    
    def __init__(self, camera_index: int = 0):
        """Initialize camera service"""
        self.camera_index = camera_index
        self.camera = None
    
    def check_camera_available(self) -> bool:
        """Check if camera is available"""
        try:
            cap = cv2.VideoCapture(self.camera_index)
            if cap is None or not cap.isOpened():
                cap.release()
                return False
            
            ret, frame = cap.read()
            cap.release()
            return ret
        except Exception as e:
            print(f"Camera check error: {e}")
            return False
    
    def open_camera(self) -> bool:
        """Open camera connection"""
        try:
            if self.camera is not None:
                self.close_camera()
            
            self.camera = cv2.VideoCapture(self.camera_index)
            
            # Set camera properties for better quality
            self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
            self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
            self.camera.set(cv2.CAP_PROP_FPS, 30)
            
            if not self.camera.isOpened():
                return False
            
            return True
        except Exception as e:
            print(f"Error opening camera: {e}")
            return False
    
    def show_camera_preview(self, window_name: str = "Camera Preview") -> Optional[str]:
        """
        Show live camera preview window and capture image on keypress
        Press 'c' or SPACE to capture
        Press 'q' or ESC to quit without capturing
        Returns: Base64 encoded image or None
        """
        try:
            if not self.open_camera():
                raise Exception("Failed to open camera")
            
            print(f"\n{'='*50}")
            print(f"Camera Preview Window: '{window_name}'")
            print(f"{'='*50}")
            print("Controls:")
            print("  - Press 'c' or SPACE to capture image")
            print("  - Press 'q' or ESC to quit")
            print(f"{'='*50}\n")
            
            captured_image = None
            
            while True:
                ret, frame = self.camera.read()
                
                if not ret:
                    print("Failed to read frame")
                    break
                
                # Add text overlay with instructions
                display_frame = frame.copy()
                cv2.putText(display_frame, "Press 'c' or SPACE to capture", 
                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                cv2.putText(display_frame, "Press 'q' or ESC to quit", 
                           (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                
                # Show the frame
                cv2.imshow(window_name, display_frame)
                
                # Wait for key press (1ms delay)
                key = cv2.waitKey(1) & 0xFF
                
                # Capture image: 'c' or SPACE (32)
                if key == ord('c') or key == 32:
                    print("✓ Image captured!")
                    
                    # Encode frame as JPEG
                    ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    if ret:
                        img_base64 = base64.b64encode(buffer).decode('utf-8')
                        captured_image = f"data:image/jpeg;base64,{img_base64}"
                        print(f"✓ Image encoded (size: {len(img_base64)} bytes)")
                    break
                
                # Quit: 'q' or ESC (27)
                elif key == ord('q') or key == 27:
                    print("✗ Cancelled - No image captured")
                    break
            
            # Cleanup
            self.close_camera()
            cv2.destroyAllWindows()
            
            return captured_image
            
        except Exception as e:
            print(f"Error in camera preview: {e}")
            self.close_camera()
            cv2.destroyAllWindows()
            return None
    
    def show_camera_live(self, duration_seconds: int = 10, window_name: str = "Live Camera Feed"):
        """
        Show live camera feed for a specified duration
        Args:
            duration_seconds: How long to show the feed (0 = infinite, press 'q' to quit)
            window_name: Name of the preview window
        """
        try:
            if not self.open_camera():
                raise Exception("Failed to open camera")
            
            print(f"\n{'='*50}")
            print(f"Live Camera Feed: '{window_name}'")
            print(f"{'='*50}")
            if duration_seconds > 0:
                print(f"Duration: {duration_seconds} seconds")
            else:
                print("Duration: Infinite (press 'q' to quit)")
            print(f"{'='*50}\n")
            
            frame_count = 0
            fps = int(self.camera.get(cv2.CAP_PROP_FPS)) or 30
            total_frames = duration_seconds * fps if duration_seconds > 0 else float('inf')
            
            while frame_count < total_frames:
                ret, frame = self.camera.read()
                
                if not ret:
                    print("Failed to read frame")
                    break
                
                # Add FPS counter and frame info
                display_frame = frame.copy()
                cv2.putText(display_frame, f"Frame: {frame_count}", 
                           (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                cv2.putText(display_frame, f"Resolution: {frame.shape[1]}x{frame.shape[0]}", 
                           (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                cv2.putText(display_frame, "Press 'q' to quit", 
                           (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                
                # Show the frame
                cv2.imshow(window_name, display_frame)
                
                # Wait for key press (1ms delay)
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q') or key == 27:
                    print("\n✓ Live feed stopped by user")
                    break
                
                frame_count += 1
            
            print(f"\n✓ Live feed ended (showed {frame_count} frames)")
            
            # Cleanup
            self.close_camera()
            cv2.destroyAllWindows()
            
        except Exception as e:
            print(f"Error in live feed: {e}")
            self.close_camera()
            cv2.destroyAllWindows()
    
    def close_camera(self):
        """Close camera connection"""
        if self.camera is not None:
            self.camera.release()
            self.camera = None
    
    def capture_image(self) -> Optional[str]:
        """
        Capture image from camera and return as base64 encoded string
        Returns: Base64 encoded JPEG image string or None
        """
        try:
            # Open camera if not already open
            if self.camera is None or not self.camera.isOpened():
                if not self.open_camera():
                    raise Exception("Failed to open camera")
            
            # Capture frame
            ret, frame = self.camera.read()
            
            if not ret or frame is None:
                raise Exception("Failed to capture frame")
            
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            
            if not ret:
                raise Exception("Failed to encode image")
            
            # Convert to base64
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Add data URI prefix
            img_data_uri = f"data:image/jpeg;base64,{img_base64}"
            
            # Close camera after capture
            self.close_camera()
            
            return img_data_uri
            
        except Exception as e:
            print(f"Error capturing image: {e}")
            self.close_camera()
            return None
    
    def capture_multiple_images(self, count: int = 3, delay_ms: int = 500) -> list:
        """
        Capture multiple images with delay
        Args:
            count: Number of images to capture
            delay_ms: Delay between captures in milliseconds
        Returns: List of base64 encoded images
        """
        images = []
        
        try:
            if not self.open_camera():
                raise Exception("Failed to open camera")
            
            for i in range(count):
                ret, frame = self.camera.read()
                
                if ret and frame is not None:
                    # Encode frame
                    ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                    if ret:
                        img_base64 = base64.b64encode(buffer).decode('utf-8')
                        img_data_uri = f"data:image/jpeg;base64,{img_base64}"
                        images.append(img_data_uri)
                
                # Wait between captures
                if i < count - 1:
                    cv2.waitKey(delay_ms)
            
            self.close_camera()
            
        except Exception as e:
            print(f"Error capturing multiple images: {e}")
            self.close_camera()
        
        return images
    
    def get_camera_info(self) -> dict:
        """Get camera information"""
        info = {
            "available": False,
            "index": self.camera_index,
            "platform": platform.system(),
            "resolution": None,
            "fps": None
        }
        
        try:
            if self.open_camera():
                info["available"] = True
                info["resolution"] = {
                    "width": int(self.camera.get(cv2.CAP_PROP_FRAME_WIDTH)),
                    "height": int(self.camera.get(cv2.CAP_PROP_FRAME_HEIGHT))
                }
                info["fps"] = int(self.camera.get(cv2.CAP_PROP_FPS))
                self.close_camera()
        except Exception as e:
            print(f"Error getting camera info: {e}")
        
        return info
    
    def __del__(self):
        """Cleanup when object is destroyed"""
        self.close_camera()
