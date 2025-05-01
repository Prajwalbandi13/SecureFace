from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import cv2
import numpy as np
from PIL import Image
import io
import torch
import torch.nn as nn
from torchvision import models
from torchvision.models import MobileNet_V2_Weights
from pathlib import Path
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    try:
        response = await call_next(request)
        logger.info(f"Response: {response.status_code}")
        return response
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise

class SpoofDetector(nn.Module):
    def __init__(self, pretrained=True):
        super().__init__()
        weights = MobileNet_V2_Weights.IMAGENET1K_V1 if pretrained else None
        backbone = models.mobilenet_v2(weights=weights)
        self.features = backbone.features
        self.avgpool = nn.AdaptiveAvgPool2d((1, 1))
        self.classifier = nn.Sequential(
            nn.Dropout(0.2),
            nn.Linear(1280, 1)
        )
    
    def forward(self, x):
        x = self.features(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.classifier(x)
        return x

def initialize_model():
    model = SpoofDetector(pretrained=True)  # Changed to True for better initial weights
    Path('weights').mkdir(exist_ok=True)
    torch.save(model.state_dict(), 'weights/spoof_model.pth')
    return model

def load_model():
    try:
        model = SpoofDetector(pretrained=True)  # Changed to True
        if Path('weights/spoof_model.pth').exists():
            model.load_state_dict(torch.load('weights/spoof_model.pth'))
        else:
            model = initialize_model()
        model.eval()
        return model
    except Exception as e:
        logger.error(f"Error loading model: {e}")
        return initialize_model()

model = load_model()

def preprocess_image(image_bytes):
    try:
        image = Image.open(io.BytesIO(image_bytes))
        image = np.array(image)
        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Try with different scale factors
        for scale in [1.1, 1.2, 1.3]:
            faces = face_cascade.detectMultiScale(gray, scaleFactor=scale, minNeighbors=5)
            if len(faces) > 0:
                break
        
        if len(faces) == 0:
            raise HTTPException(status_code=400, detail="No face detected")
        
        x, y, w, h = faces[0]
        face = image[y:y+h, x:x+w]
        face = cv2.resize(face, (224, 224))
        face = face.astype('float32') / 255.0
        face = np.transpose(face, (2, 0, 1))
        return torch.from_numpy(face).unsqueeze(0).float()

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Image processing error: {str(e)}")

@app.post("/api/verify")
async def verify_face(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        input_tensor = preprocess_image(image_bytes)
        
        with torch.no_grad():
            output = model(input_tensor)
            is_real = torch.sigmoid(output).item() > 0.5
        
        return {
            "is_real": bool(is_real),
            "confidence": float(torch.sigmoid(output).item()),
            "status": "success",
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Verification error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/verify-challenge")
async def verify_challenge(files: List[UploadFile] = File(...)):
    try:
        logger.info(f"Challenge started with {len(files)} frames")

        if len(files) < 3:
            raise HTTPException(status_code=400, detail="At least 3 frames required")
            
        frames = []
        for file in files:
            try:
                image_bytes = await file.read()
                input_tensor = preprocess_image(image_bytes)
                frames.append(input_tensor)
            except HTTPException as he:
                logger.warning(f"Skipping frame: {he.detail}")
                continue
        
        if len(frames) < 3:
            raise HTTPException(
                status_code=400, 
                detail=f"Only {len(frames)} valid frames (need 3)"
            )
        
        # Process each frame individually
        predictions = []
        for frame in frames:
            with torch.no_grad():
                output = model(frame)
                pred = torch.sigmoid(output).item()
                predictions.append(pred)
        
        # Calculate motion between consecutive frames
        diff_scores = []
        for i in range(1, len(frames)):
            # Extract the image data from the tensor and calculate difference
            frame1 = frames[i-1].squeeze().numpy()
            frame2 = frames[i].squeeze().numpy()
            diff = np.mean(np.abs(frame2 - frame1))
            diff_scores.append(float(diff))
        
        avg_diff = sum(diff_scores) / len(diff_scores) if diff_scores else 0
        motion_threshold = 0.025  # Adjusted threshold
        has_motion = avg_diff > motion_threshold
        
        # Average the predictions
        avg_prediction = sum(predictions) / len(predictions)
        is_real = has_motion and (avg_prediction > 0.5)
        
        logger.info(f"Motion analysis - Avg: {avg_diff:.4f}, Threshold: {motion_threshold}")
        
        return {
            "is_real": bool(is_real),
            "confidence": float(avg_prediction),
            "motion_detected": bool(has_motion),
            "frames_processed": len(frames),
            "avg_motion": float(avg_diff),
            "status": "success",
            "message": "Challenge completed successfully" if is_real else "Insufficient motion detected",
            "timestamp": datetime.now().isoformat(),
            "debug": {
                "motion_scores": diff_scores,
                "threshold": motion_threshold,
                "predictions": predictions
            }
        }
    except HTTPException as he:
        logger.error(f"Challenge error: {he.detail}")
        raise he
    except Exception as e:
        logger.error(f"Challenge error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Challenge failed: {str(e)}")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": Path('weights/spoof_model.pth').exists(),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")