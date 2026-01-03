"""
Camera Testing Script
Run this to diagnose camera issues before starting the backend
"""

import cv2
import platform
import sys

def test_cameras():
    print("=" * 60)
    print("🎥 CAMERA DIAGNOSTIC TOOL")
    print("=" * 60)
    print(f"\n💻 System: {platform.system()} {platform.release()}")
    print(f"🐍 Python: {sys.version.split()[0]}")
    print(f"📹 OpenCV: {cv2.__version__}")
    print()
    
    # Test different backends
    backends = [
        ("CAP_ANY (Auto-detect)", cv2.CAP_ANY),
        ("CAP_MSMF (Media Foundation)", cv2.CAP_MSMF),
        ("CAP_DSHOW (DirectShow)", cv2.CAP_DSHOW),
    ]
    
    found_cameras = {}
    
    for backend_name, backend in backends:
        print(f"\n{'='*60}")
        print(f"Testing: {backend_name}")
        print(f"{'='*60}")
        
        for camera_index in range(3):
            print(f"\n  Camera {camera_index}...")
            try:
                cap = cv2.VideoCapture(camera_index, backend)
                
                # Wait a moment for camera to initialize
                import time
                time.sleep(0.3)
                
                if cap.isOpened():
                    # Try to read a test frame
                    ret, frame = cap.read()
                    if ret:
                        height, width = frame.shape[:2]
                        fps = cap.get(cv2.CAP_PROP_FPS)
                        
                        print(f"    ✅ SUCCESS!")
                        print(f"       Resolution: {width}x{height}")
                        print(f"       FPS: {fps}")
                        
                        # Store successful configuration
                        if camera_index not in found_cameras:
                            found_cameras[camera_index] = {
                                'backend': backend_name,
                                'backend_code': backend,
                                'resolution': (width, height),
                                'fps': fps
                            }
                    else:
                        print(f"    ⚠️  Camera opened but can't read frames")
                    
                    cap.release()
                else:
                    print(f"    ❌ Failed to open")
                    
            except Exception as e:
                print(f"    ❌ Error: {e}")
    
    # Summary
    print(f"\n\n{'='*60}")
    print("📊 SUMMARY")
    print(f"{'='*60}")
    
    if found_cameras:
        print(f"\n✅ Found {len(found_cameras)} working camera(s):\n")
        for cam_idx, info in found_cameras.items():
            print(f"  Camera {cam_idx}:")
            print(f"    Backend: {info['backend']}")
            print(f"    Resolution: {info['resolution'][0]}x{info['resolution'][1]}")
            print(f"    FPS: {info['fps']}")
            print()
        
        print("🎯 RECOMMENDATION:")
        print(f"   Use Camera {list(found_cameras.keys())[0]} with {list(found_cameras.values())[0]['backend']}")
        print()
        
        # Generate code suggestion
        best_cam = list(found_cameras.keys())[0]
        best_backend = list(found_cameras.values())[0]['backend_code']
        print("💡 Code to use:")
        print(f"   cap = cv2.VideoCapture({best_cam}, {best_backend})")
        print()
        
    else:
        print("\n❌ NO WORKING CAMERAS FOUND!\n")
        print("Troubleshooting steps:")
        print("  1. Check if camera is connected (USB/built-in)")
        print("  2. Close other apps using camera:")
        print("     - Chrome/Edge browser tabs")
        print("     - Microsoft Teams, Zoom, Skype")
        print("     - Windows Camera app")
        print("  3. Check Windows Settings:")
        print("     Settings → Privacy → Camera")
        print("     Enable 'Let apps access your camera'")
        print("     Enable 'Let desktop apps access your camera'")
        print("  4. Update/reinstall OpenCV:")
        print("     pip uninstall opencv-python")
        print("     pip install opencv-python==4.8.1.78")
        print("  5. Try USB webcam if built-in camera doesn't work")
        print()
    
    return len(found_cameras) > 0

if __name__ == "__main__":
    success = test_cameras()
    
    if success:
        print("✅ Camera test PASSED - You can start the backend!")
        sys.exit(0)
    else:
        print("❌ Camera test FAILED - Fix issues before starting backend")
        sys.exit(1)
