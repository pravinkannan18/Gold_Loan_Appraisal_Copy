"""
Unified Classification Service with ResNet50 and SAM3
Handles both simple classification and enhanced region detection
Based on DEMO/sam.py
"""
import os
import json
import base64
import io
import re
from pathlib import Path
from typing import Dict, List, Optional
from PIL import Image
import cv2
import numpy as np

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms

# Import SAM3 if available
try:
    from sam3.model_builder import build_sam3_image_model
    from sam3.model.sam3_image_processor import Sam3Processor
    SAM3_AVAILABLE = True
except ImportError:
    print("⚠️ SAM3 not available. Enhanced detection will be disabled.")
    SAM3_AVAILABLE = False


class ClassificationService:
    """Unified service for jewellery classification with optional SAM3 region detection"""
    
    # SAM prompts for jewellery component detection
    SAM_PROMPTS = [
        "pendant of the jewellery",
        "gold chain regions of the jewellery",
        "gold beads",
        "white crystals of the jewellery",
        "very small black beads in the jewellery",
        "rudraksha mala",
        "earring in gold color",
        "watch in gold color",
        "thin thread cord with tassel",
        "very small red diamonds of the jewellery",
        "emerald colored stones in the jewellery",
        "red colored stones in the jewellery",
        "very small silver diamonds of the jewellery",
    ]
    
    def __init__(self):
        """Initialize classification service with ResNet50 and SAM3"""
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = None
        self.class_names = []
        self.transform = None
        self.sam_model = None
        self.sam_processor = None
        self._load_models()
        
    def _load_models(self):
        """Load both ResNet50 and SAM3 models"""
        try:
            # Load ResNet50 classification model
            model_dir = Path(__file__).parent.parent / "ml_models" / "jewellery_classification"
            model_path = model_dir / "resnet50_local.pth"
            class_path = model_dir / "class_names.json"
            
            if class_path.exists():
                with open(class_path, "r") as f:
                    self.class_names = json.load(f)
            
            if not self.class_names:
                print("⚠️ No class names found. Skipping ResNet50 load.")
            else:
                self.model = models.resnet50(weights=None)
                self.model.fc = nn.Linear(self.model.fc.in_features, len(self.class_names))
                
                if model_path.exists():
                    state_dict = torch.load(model_path, map_location=self.device, weights_only=False)
                    self.model.load_state_dict(state_dict)
                    self.model = self.model.to(self.device)
                    self.model.eval()
                    
                    self.transform = transforms.Compose([
                        transforms.Resize((224, 224)),
                        transforms.ToTensor(),
                        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
                    ])
                else:
                    print(f"❌ Model not found at: {model_path}")
                    self.model = None
            
            # Load SAM3 model if available
            if SAM3_AVAILABLE:
                try:
                    sam_device = "cuda" if torch.cuda.is_available() else "cpu"
                    self.sam_model = build_sam3_image_model().to(sam_device).eval()
                    self.sam_processor = Sam3Processor(self.sam_model)
                except Exception as e:
                    print(f"⚠️ Failed to load SAM3: {e}")
                    self.sam_model = None
                    
        except Exception as e:
            print(f"❌ Failed to load models: {e}")
            import traceback
            traceback.print_exc()
    
    def is_available(self) -> bool:
        """Check if basic classification is available"""
        return self.model is not None
    
    def is_enhanced_available(self) -> bool:
        """Check if enhanced detection is available"""
        return self.model is not None and self.sam_model is not None
    
    def _base64_to_image(self, base64_str: str) -> Optional[Image.Image]:
        """Convert base64 string to PIL Image"""
        try:
            if "," in base64_str:
                base64_str = base64_str.split(",")[1]
            image_data = base64.b64decode(base64_str)
            image = Image.open(io.BytesIO(image_data)).convert("RGB")
            return image
        except Exception as e:
            print(f"Error converting base64 to image: {e}")
            return None
    
    def _image_to_base64(self, image: Image.Image) -> str:
        """Convert PIL Image to base64 string"""
        try:
            buffered = io.BytesIO()
            image.save(buffered, format="PNG")
            return base64.b64encode(buffered.getvalue()).decode()
        except Exception as e:
            print(f"Error converting image to base64: {e}")
            return ""
    
    def _get_risk_level(self, class_name: str) -> str:
        """Map classification to risk level based on jewellery type"""
        class_name_lower = class_name.lower()
        
        if any(keyword in class_name_lower for keyword in ["rudraksha"]):
            return "HIGH"
        
        if any(keyword in class_name_lower for keyword in ["beads", "mangalsutra", "pendant", "religious"]):
            return "MEDIUM"
        
        if any(keyword in class_name_lower for keyword in ["chain", "necklace"]):
            return "LOW"
        
        return "MEDIUM"
    
    def _classify_region(self, region_image: Image.Image) -> Dict:
        """Classify a single region image"""
        try:
            img_tensor = self.transform(region_image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                outputs = self.model(img_tensor)
                probs = F.softmax(outputs[0], dim=0)
                conf_val, idx = torch.max(probs, dim=0)
                conf = conf_val.item() * 100.0
                class_name = self.class_names[idx.item()] if self.class_names else str(idx.item())
            
            return {
                "class_name": class_name,
                "confidence": round(conf, 2)
            }
        except Exception as e:
            print(f"Classification error: {e}")
            return {"class_name": "unknown", "confidence": 0.0}
    
    def classify(self, image_base64: str) -> Dict:
        """
        Simple classification using ResNet50 only
        
        Args:
            image_base64: Base64 encoded image string
            
        Returns:
            Dictionary with classification results
        """
        if not self.is_available():
            return {
                "success": False,
                "error": "Classification model not available",
                "class_name": None,
                "confidence": 0.0,
                "risk": "UNKNOWN"
            }
        
        try:
            image = self._base64_to_image(image_base64)
            if image is None:
                return {
                    "success": False,
                    "error": "Failed to decode image",
                    "class_name": None,
                    "confidence": 0.0,
                    "risk": "UNKNOWN"
                }
            
            img_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                outputs = self.model(img_tensor)
                probs = F.softmax(outputs[0], dim=0)
                conf_val, idx = torch.max(probs, dim=0)
                conf = conf_val.item() * 100.0
                
                best_label = self.class_names[idx.item()] if self.class_names else str(idx.item())
                
                all_preds = []
                for i, prob in enumerate(probs):
                    all_preds.append({
                        "class_name": self.class_names[i],
                        "confidence": round(prob.item() * 100.0, 2)
                    })
                all_preds.sort(key=lambda x: x["confidence"], reverse=True)
            
            risk = self._get_risk_level(best_label)
            
            return {
                "success": True,
                "class_name": best_label,
                "confidence": round(conf, 2),
                "risk": risk,
                "all_predictions": all_preds[:3]
            }
            
        except Exception as e:
            print(f"Classification error: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "class_name": None,
                "confidence": 0.0,
                "risk": "UNKNOWN"
            }
    
    def detect_and_classify_regions(self, image_base64: str) -> Dict:
        """
        Enhanced classification with SAM3 region detection
        Detects individual components and classifies each
        
        Args:
            image_base64: Base64 encoded image string
            
        Returns:
            Dictionary with detected regions and their classifications
        """
        if not self.is_enhanced_available():
            return {
                "success": False,
                "error": "Enhanced classification not available (SAM3 or ResNet50 missing)",
                "regions": []
            }
        
        try:
            image_pil = self._base64_to_image(image_base64)
            if image_pil is None:
                return {"success": False, "error": "Failed to decode image", "regions": []}
            
            img_rgb = np.array(image_pil)
            
            # Encode image with SAM3
            with torch.inference_mode():
                state = self.sam_processor.set_image(image_pil)
            
            detected_regions = []
            SAM_MASK_THRESHOLD = 0.5
            SAM_SCORE_THRESHOLD = 0.05
            SAM_CROP_PAD = 8
            
            # Process each prompt
            for p_idx, prompt in enumerate(self.SAM_PROMPTS):
                with torch.inference_mode():
                    out = self.sam_processor.set_text_prompt(state=state, prompt=prompt)
                
                masks = out.get("masks")
                scores = out.get("scores")
                
                if masks is None:
                    continue
                
                masks = masks.squeeze(1)
                
                # Get best mask for this prompt
                best_score = -1
                best_mask_idx = None
                
                for m_idx in range(masks.shape[0]):
                    score_val = float(scores[m_idx]) if scores is not None else 1.0
                    if score_val < SAM_SCORE_THRESHOLD:
                        continue
                    if score_val > best_score:
                        best_score = score_val
                        best_mask_idx = m_idx
                
                if best_mask_idx is None:
                    continue
                
                # Process best mask
                mask = masks[best_mask_idx] > SAM_MASK_THRESHOLD
                if mask.sum() == 0:
                    continue
                
                mask_np = mask.cpu().numpy().astype(np.uint8)
                ys, xs = np.where(mask_np)
                if ys.size == 0 or xs.size == 0:
                    continue
                
                y1, y2 = ys.min(), ys.max()
                x1, x2 = xs.min(), xs.max()
                
                y1 = max(0, y1 - SAM_CROP_PAD)
                x1 = max(0, x1 - SAM_CROP_PAD)
                y2 = min(img_rgb.shape[0] - 1, y2 + SAM_CROP_PAD)
                x2 = min(img_rgb.shape[1] - 1, x2 + SAM_CROP_PAD)
                
                # Extract region as RGBA
                rgb_crop = image_pil.crop((x1, y1, x2 + 1, y2 + 1)).convert("RGBA")
                alpha = Image.fromarray(mask_np[y1:y2+1, x1:x2+1] * 255, mode="L")
                rgb_crop.putalpha(alpha)
                
                # Classify this region
                rgb_for_classification = rgb_crop.convert("RGB")
                classification = self._classify_region(rgb_for_classification)
                
                # Add to results
                detected_regions.append({
                    "region_name": prompt,
                    "class_name": classification["class_name"],
                    "confidence": classification["confidence"],
                    "sam_score": round(best_score, 4),
                    "image": "data:image/png;base64," + self._image_to_base64(rgb_crop)
                })
            
            return {
                "success": True,
                "regions": detected_regions,
                "total_detected": len(detected_regions)
            }
            
        except Exception as e:
            print(f"Enhanced classification error: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "regions": []
            }
