# ML Models Directory

This folder contains machine learning models used by the Gold Loan Appraisal System.

## Models

### YOLO Models (Purity Testing)
- **best_rub2_1.pt** - YOLO model for acid testing detection
- **best_rub2_2.pt** - YOLO model for rubbing testing detection

### Neural Network Models
- **dbcnn.pth** - 1D CNN model for serial data classification

## Usage

These models are automatically loaded by the purity testing service:
```python
from services.purity_testing_service import PurityTestingService

service = PurityTestingService()
# Models are loaded from ml_models/ directory
```

## Model Details

### YOLO Models
- Format: PyTorch (.pt)
- Framework: Ultralytics YOLO
- Purpose: Object detection for gold purity testing tasks
- Input: Camera video frames
- Output: Detected objects with bounding boxes and confidence scores

### DBCNN Model
- Format: PyTorch (.pth)
- Architecture: 1D Convolutional Neural Network
- Purpose: Classification from serial sensor data
- Input: 1D time-series data
- Output: Classification probabilities

## Adding New Models

1. Place model file in this directory
2. Update service configuration to reference the new model
3. Document the model purpose and usage here

## Notes

- Models are loaded once during service initialization
- Large models may take time to load on startup
- Ensure sufficient memory for model inference
