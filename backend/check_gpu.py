"""
GPU Check Script - Verify CUDA and GPU availability for YOLO
"""
import sys

print("=" * 70)
print("  GPU Availability Check")
print("=" * 70)

# Check PyTorch
try:
    import torch
    print(f"\n✓ PyTorch version: {torch.__version__}")
    print(f"  CUDA available: {torch.cuda.is_available()}")
    
    if torch.cuda.is_available():
        print(f"  CUDA version: {torch.version.cuda}")
        print(f"  GPU count: {torch.cuda.device_count()}")
        for i in range(torch.cuda.device_count()):
            print(f"  GPU {i}: {torch.cuda.get_device_name(i)}")
            print(f"    - Memory: {torch.cuda.get_device_properties(i).total_memory / 1024**3:.2f} GB")
    else:
        print("  ⚠️ CUDA not available - using CPU")
        print("\n  To enable GPU:")
        print("    1. Ensure you have an NVIDIA GPU")
        print("    2. Install CUDA toolkit from https://developer.nvidia.com/cuda-downloads")
        print("    3. Install PyTorch with CUDA support:")
        print("       pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118")
except ImportError:
    print("✗ PyTorch not installed")
    sys.exit(1)

# Check Ultralytics YOLO
try:
    from ultralytics import YOLO
    print(f"\n✓ Ultralytics YOLO installed")
    
    # Check default device
    import ultralytics
    print(f"  Ultralytics version: {ultralytics.__version__}")
except ImportError:
    print("✗ Ultralytics not installed")

# Check OpenCV
try:
    import cv2
    print(f"\n✓ OpenCV version: {cv2.__version__}")
    
    # Check CUDA support in OpenCV
    cuda_enabled = cv2.cuda.getCudaEnabledDeviceCount() if hasattr(cv2, 'cuda') else 0
    if cuda_enabled > 0:
        print(f"  OpenCV CUDA devices: {cuda_enabled}")
    else:
        print(f"  OpenCV CUDA: Not available (using CPU)")
except ImportError:
    print("✗ OpenCV not installed")

print("\n" + "=" * 70)
print("  Summary")
print("=" * 70)

if torch.cuda.is_available():
    print("✅ GPU acceleration is AVAILABLE and ready to use!")
    print("   YOLO will automatically use GPU for faster inference.")
else:
    print("⚠️ GPU acceleration is NOT available.")
    print("   YOLO is currently running on CPU.")
    print("\n📊 Expected Performance Impact:")
    print("   - CPU: ~150-300ms per frame (current)")
    print("   - GPU: ~10-30ms per frame (10-20x faster!)")

print("=" * 70)
