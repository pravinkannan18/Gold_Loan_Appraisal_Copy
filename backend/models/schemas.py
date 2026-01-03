# model.py
import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import cv2
import time
import pandas as pd
from ultralytics import YOLO
import numpy as np
from pathlib import Path

# Suppress warnings
import warnings
warnings.filterwarnings("ignore")

# ==================== FastAPI App ====================
app = FastAPI(title="Gold Purity Testing Backend", version="1.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== Global State ====================
is_running = False
current_task = "rubbing"
detection_status = {"message": "Waiting to start..."}
detection_states = {}

# ==================== Load YOLO Models ====================
print("Loading YOLO models...")
model_rub = YOLO("best (rub2)(2).pt")
model_acid = YOLO("best (rub2)(1).pt")
print("Models loaded successfully.")

# ==================== Robust CSV Reader ====================
def safe_read_csv(csv_path: str) -> pd.DataFrame:
    """Read CSV with multiple encodings and BOM handling."""
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"CSV file not found: {csv_path}")

    encodings = ['utf-8', 'utf-8-sig', 'utf-16', 'latin1']
    for enc in encodings:
        try:
            df = pd.read_csv(path, encoding=enc)
            print(f"CSV '{csv_path}' loaded with encoding: {enc}")
            return df
        except UnicodeDecodeError:
            continue
        except Exception as e:
            print(f"Error with {enc}: {e}")
            continue
    raise UnicodeDecodeError(f"Failed to read {csv_path} with any encoding")

# Pre-load CSVs at startup
try:
    RUBBING_TASKS = safe_read_csv("task_sequence.csv")
    ACID_TASKS = safe_read_csv("task_sequence_main.csv")
    print("Both CSV files loaded successfully at startup.")
except Exception as e:
    print(f"CRITICAL: Failed to load CSV files: {e}")
    RUBBING_TASKS = pd.DataFrame()
    ACID_TASKS = pd.DataFrame()

# ==================== Camera Initialization ====================
def init_camera(index):
    cam = cv2.VideoCapture(index, cv2.CAP_DSHOW)
    for attempt in range(5):
        if cam.isOpened():
            cam.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cam.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cam.set(cv2.CAP_PROP_FPS, 30)
            print(f"Camera {index} initialized on attempt {attempt + 1}")
            return cam
        time.sleep(1)
        cam.release()
        cam = cv2.VideoCapture(index, cv2.CAP_DSHOW)
    print(f"FAILED to open camera {index}")
    return None

print("Initializing cameras...")
camera1 = init_camera(0)
camera2 = init_camera(1)

# ==================== Detection Logic (Using Preloaded CSVs) ====================
def run_yolo_with_csv(frame, model, tasks_df, detection_states):
    completed_labels = []

    if tasks_df.empty:
        cv2.putText(frame, "CSV EMPTY", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        return frame, completed_labels

    results = model.predict(frame, imgsz=320, conf=0.3, verbose=False)
    detections = results[0]

    try:
        boxes = detections.boxes.xyxy.cpu().numpy()
        class_ids = detections.boxes.cls.cpu().numpy().astype(int)
        class_names = model.model.names
        class_labels = [class_names[i] for i in class_ids]
    except:
        boxes, class_labels = [], []

    for idx, row in tasks_df.iterrows():
        t1, t2 = str(row['target1']), str(row['target2'])
        label = str(row['label'])
        hold_seconds = float(row.get('hold_seconds', 5))
        min_fluctuations = int(row.get('min_fluctuations', 3))

        pairs = []
        idx1 = [i for i, c in enumerate(class_labels) if c == t1]
        idx2 = [i for i, c in enumerate(class_labels) if c == t2]
        for i in idx1:
            for j in idx2:
                x1, y1, x2, y2 = map(int, boxes[i])
                a1, b1, a2, b2 = map(int, boxes[j])
                iou_val = max(0, min(x2, a2) - max(x1, a1)) * max(0, min(y2, b2) - max(y1, b1))
                iou_val /= ((x2 - x1) * (y2 - y1) + (a2 - a1) * (b2 - b1) - iou_val + 1e-6)
                if iou_val > 0.05:
                    pairs.append((i, j))

        key = (id(tasks_df), label)
        state = detection_states.setdefault(key, {
            "detected_time": None,
            "last_detected": False,
            "fluctuation_count": 0
        })

        detected_now = bool(pairs)
        if detected_now and not state["last_detected"]:
            state["fluctuation_count"] += 1
        state["last_detected"] = detected_now

        if detected_now and state["detected_time"] is None:
            state["detected_time"] = time.time()

        if state["detected_time"]:
            elapsed = time.time() - state["detected_time"]
            cv2.putText(frame, f"{label}: {elapsed:.1f}s fluc:{state['fluctuation_count']}",
                        (10, 60 + idx * 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

            if elapsed > hold_seconds and state["fluctuation_count"] >= min_fluctuations:
                global detection_status, current_task, is_running
                detection_status["message"] = f"{label} detected"
                completed_labels.append(label)

                state["detected_time"] = None
                state["fluctuation_count"] = 0
                state["last_detected"] = False

                if "Rubbing" in label or "rub" in label.lower():
                    detection_status["message"] = "Rubbing completed to Starting Acid Testing..."
                    current_task = "acid"
                    time.sleep(1.5)
                elif "Acid" in label or "acid" in label.lower():
                    detection_status["message"] = "Acid Testing completed to Task Completed!"
                    current_task = "done"
                    is_running = False
                    time.sleep(1.5)

        for i, box in enumerate(boxes):
            x1, y1, x2, y2 = map(int, box)
            color = (0, 255, 0)
            if any(i in pair for pair in pairs):
                color = (0, 0, 255)
                cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, class_labels[i], (x1, y2 + 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)

    return frame, completed_labels

# ==================== MJPEG Stream Generator ====================
def generate_frames(cam, cam_id):
    global is_running, current_task, detection_status

    local_detection_states = {}

    while True:
        if cam is None or not cam.isOpened():
            placeholder = np.zeros((480, 640, 3), np.uint8)
            cv2.putText(placeholder, f"Camera {cam_id} OFFLINE", (80, 240),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 255), 3)
            cv2.putText(placeholder, "Check connection", (180, 280),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            ret, buffer = cv2.imencode('.jpg', placeholder)
            if ret:
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.1)
            continue

        success, frame = cam.read()
        if not success:
            cam.release()
            time.sleep(0.5)
            cam = cv2.VideoCapture(cam_id - 1, cv2.CAP_DSHOW)
            time.sleep(0.5)
            continue

        frame = cv2.resize(frame, (640, 480))

        cv2.putText(frame, f"Cam {cam_id} | {current_task.upper()}", (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
        cv2.putText(frame, detection_status["message"][:50], (10, 460),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)

        if is_running:
            if current_task == "rubbing" and cam_id == 1:
                frame, _ = run_yolo_with_csv(frame, model_rub, RUBBING_TASKS, local_detection_states)
            elif current_task == "acid" and cam_id == 2:
                frame, _ = run_yolo_with_csv(frame, model_acid, ACID_TASKS, local_detection_states)

        ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        if not ret:
            time.sleep(0.01)
            continue

        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')

# ==================== API Routes ====================
@app.get("/")
def root():
    return {"message": "Gold Purity Testing Backend Running", "time": time.strftime("%Y-%m-%d %H:%M:%S")}

@app.post("/start")
def start_detection():
    global is_running, current_task, detection_status, camera1, camera2
    if camera1 is None or not camera1.isOpened():
        camera1 = init_camera(0)
    if camera2 is None or not camera2.isOpened():
        camera2 = init_camera(1)

    if not camera1 or not camera1.isOpened():
        return JSONResponse({"error": "Analysis camera failed"}, status_code=500)
    if not camera2 or not camera2.isOpened():
        return JSONResponse({"error": "Monitor camera failed"}, status_code=500)

    is_running = True
    current_task = "rubbing"
    detection_status = {"message": "Detection started — Waiting for Rubbing..."}
    print("START: Detection started")
    return JSONResponse({"message": "Started", "task": current_task})

@app.post("/stop")
def stop_detection():
    global is_running, detection_status
    is_running = False
    detection_status = {"message": "Detection stopped."}
    print("STOP: Detection stopped")
    return JSONResponse({"message": "Stopped"})

@app.get("/status")
def get_status():
    return JSONResponse(detection_status)

@app.get("/video_feed1")
def video_feed1():
    return StreamingResponse(generate_frames(camera1, 1), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/video_feed2")
def video_feed2():
    return StreamingResponse(generate_frames(camera2, 2), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/cameras")
def list_cameras():
    cams = []
    for i in range(5):
        cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
        if cap.isOpened():
            w = int(cap.get(3))
            h = int(cap.get(4))
            cams.append({"index": i, "resolution": f"{w}x{h}"})
            cap.release()
    return {"available_cameras": cams}

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "cameras": [camera1.isOpened() if camera1 else False, camera2.isOpened() if camera2 else False],
        "running": is_running,
        "task": current_task
    }

# ==================== Run Server ====================
import uvicorn
if __name__ == "__main__":
    try:
        uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
    finally:
        print("Shutting down...")
        if camera1 and camera1.isOpened(): camera1.release()
        if camera2 and camera2.isOpened(): camera2.release()
        cv2.destroyAllWindows()