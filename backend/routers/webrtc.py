"""
WebRTC Signaling API Router
Handles SDP offer/answer exchange, ICE candidates, session management,
and WebSocket fallback for environments without aiortc.
"""
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json
import base64
import asyncio

router = APIRouter(prefix="/api/webrtc", tags=["webrtc"])


# Request models
class SDPOffer(BaseModel):
    """SDP offer from frontend"""
    sdp: str
    type: str = "offer"


class ICECandidate(BaseModel):
    """ICE candidate from frontend"""
    session_id: str
    candidate: str
    sdpMid: Optional[str] = None
    sdpMLineIndex: Optional[int] = None


class TaskUpdate(BaseModel):
    """Update current task for a session"""
    task: str  # rubbing, acid, done


# ============================================================================
# Signaling Endpoints
# ============================================================================

@router.post("/offer")
async def create_offer(offer: SDPOffer):
    """
    Process SDP offer from frontend and return answer.
    If aiortc is not available, returns WebSocket mode info.
    """
    from webrtc.signaling import webrtc_manager
    
    if not webrtc_manager.is_available():
        webrtc_manager.initialize()
    
    result = await webrtc_manager.create_session(offer.sdp, offer.type)
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to create session"))
    
    return result


@router.post("/session/create")
async def create_session():
    """Create a new session (for WebSocket mode)"""
    from webrtc.signaling import webrtc_manager
    
    if not webrtc_manager.is_available():
        webrtc_manager.initialize()
    
    result = await webrtc_manager.create_session()
    return result


@router.post("/ice")
async def add_ice_candidate(candidate: ICECandidate):
    """Add ICE candidate to an existing session."""
    from webrtc.signaling import webrtc_manager
    
    result = await webrtc_manager.add_ice_candidate(
        candidate.session_id,
        {
            "candidate": candidate.candidate,
            "sdpMid": candidate.sdpMid,
            "sdpMLineIndex": candidate.sdpMLineIndex
        }
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error"))
    
    return result


# ============================================================================
# WebSocket Fallback (when aiortc not available)
# ============================================================================

@router.websocket("/ws/{session_id}")
async def websocket_stream(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for frame streaming (fallback mode).
    
    Use this when aiortc is not available.
    
    Flow:
    1. Frontend captures camera frame
    2. Frontend sends frame as base64 via WebSocket
    3. Backend runs YOLO inference
    4. Backend sends annotated frame back
    
    Messages FROM client:
    { "action": "frame", "data": "<base64 JPEG>" }
    { "action": "reset" }
    { "action": "set_task", "task": "rubbing|acid|done" }
    
    Messages TO client:
    { "type": "frame", "frame": "<base64 annotated JPEG>", "status": {...} }
    { "type": "status", "status": {...} }
    """
    from webrtc.signaling import webrtc_manager
    from inference.inference_worker import InferenceWorker
    import cv2
    import numpy as np
    import time
    
    await websocket.accept()
    print(f"🔌 WebSocket connected: {session_id}")
    
    # Get or create session
    session = webrtc_manager.get_session(session_id)
    if not session:
        result = await webrtc_manager.create_session()
        session_id = result.get("session_id", session_id)
        session = webrtc_manager.get_session(session_id)
    
    if not session:
        await websocket.send_json({"type": "error", "message": "Failed to create session"})
        await websocket.close()
        return
    
    # Create inference worker
    inference_worker = InferenceWorker()
    
    try:
        while True:
            data = await websocket.receive_text()
            
            try:
                msg = json.loads(data)
                action = msg.get("action")
                
                if action == "frame":
                    # Process frame
                    frame_b64 = msg.get("data", "")
                    
                    start_time = time.time()
                    
                    # Decode frame
                    try:
                        # Handle data URL format
                        if "," in frame_b64:
                            frame_b64 = frame_b64.split(",")[1]
                        
                        img_bytes = base64.b64decode(frame_b64)
                        nparr = np.frombuffer(img_bytes, np.uint8)
                        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
                        
                        if frame is None:
                            await websocket.send_json({"type": "error", "message": "Invalid image"})
                            continue
                        
                        # Run inference
                        annotated_frame, detection_result = inference_worker.process_frame(
                            frame,
                            current_task=session.current_task,
                            session_state=session.detection_status
                        )
                        
                        # Update session state
                        if detection_result.get("rubbing_detected"):
                            session.detection_status["rubbing_detected"] = True
                            # Auto-switch to acid task when rubbing is detected
                            if session.current_task == "rubbing":
                                logger.info("✅ Rubbing confirmed! Auto-switching to acid task")
                                session.current_task = "acid"
                                # Reset acid detection for fresh start
                                # Don't clear inference worker state to avoid race conditions
                                session.detection_status["acid_detected"] = False
                        if detection_result.get("acid_detected") and session.current_task == "acid":
                            # Only mark acid detected if we're in acid task
                            session.detection_status["acid_detected"] = True
                            # Auto-switch to done when acid is detected
                            session.current_task = "done"
                        if detection_result.get("gold_purity"):
                            session.detection_status["gold_purity"] = detection_result["gold_purity"]
                        
                        # Encode annotated frame
                        _, buffer = cv2.imencode('.jpg', annotated_frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
                        annotated_b64 = base64.b64encode(buffer).decode('utf-8')
                        
                        process_time = (time.time() - start_time) * 1000
                        
                        await websocket.send_json({
                            "type": "frame",
                            "frame": f"data:image/jpeg;base64,{annotated_b64}",
                            "status": {
                                "current_task": session.current_task,
                                "rubbing_detected": session.detection_status["rubbing_detected"],
                                "acid_detected": session.detection_status["acid_detected"],
                                "gold_purity": session.detection_status.get("gold_purity")
                            },
                            "process_ms": round(process_time, 1)
                        })
                        
                    except Exception as e:
                        await websocket.send_json({"type": "error", "message": f"Frame processing error: {e}"})
                
                elif action == "reset":
                    webrtc_manager.reset_session(session_id)
                    inference_worker.reset()
                    session.current_task = "rubbing"  # Also reset task to rubbing
                    await websocket.send_json({
                        "type": "control",
                        "message": "Session reset",
                        "status": webrtc_manager.get_session_status(session_id)
                    })
                
                elif action == "set_task":
                    task = msg.get("task", "rubbing")
                    if task in ("rubbing", "acid", "done"):
                        # Reset inference state when switching tasks
                        if task != session.current_task:
                            inference_worker.reset()
                            # Reset detection status for the new task
                            if task == "rubbing":
                                session.detection_status["rubbing_detected"] = False
                            elif task == "acid":
                                session.detection_status["acid_detected"] = False
                        session.current_task = task
                        await websocket.send_json({
                            "type": "control",
                            "message": f"Task set to {task}",
                            "current_task": task
                        })
                    else:
                        await websocket.send_json({"type": "error", "message": "Invalid task"})
                
                elif action == "ping":
                    await websocket.send_json({"type": "pong"})
                
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
    
    except WebSocketDisconnect:
        print(f"🔌 WebSocket disconnected: {session_id}")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
    finally:
        # Keep session for potential reconnection
        pass


# ============================================================================
# Session Management
# ============================================================================

@router.get("/session/{session_id}")
async def get_session_status(session_id: str):
    """Get session status"""
    from webrtc.signaling import webrtc_manager
    
    result = webrtc_manager.get_session_status(session_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/session/{session_id}/task")
async def update_session_task(session_id: str, update: TaskUpdate):
    """Update current task for a session"""
    from webrtc.signaling import webrtc_manager
    
    session = webrtc_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if update.task not in ["rubbing", "acid", "done"]:
        raise HTTPException(status_code=400, detail="Invalid task")
    
    session.current_task = update.task
    return {"success": True, "current_task": session.current_task}


@router.post("/session/{session_id}/reset")
async def reset_session(session_id: str):
    """Reset detection status"""
    from webrtc.signaling import webrtc_manager
    
    result = webrtc_manager.reset_session(session_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error"))
    return result


@router.delete("/session/{session_id}")
async def close_session(session_id: str):
    """Close and cleanup a session"""
    from webrtc.signaling import webrtc_manager
    
    result = await webrtc_manager.close_session(session_id)
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error"))
    return result


# ============================================================================
# Status Endpoints
# ============================================================================

@router.get("/status")
async def get_webrtc_status():
    """Get WebRTC/WebSocket service status"""
    from webrtc.signaling import webrtc_manager
    from inference.model_manager import get_model_manager
    
    if not webrtc_manager.initialized:
        webrtc_manager.initialize()
    
    webrtc_status = webrtc_manager.get_status()
    model_status = get_model_manager().get_status()
    
    return {
        "webrtc": webrtc_status,
        "inference": model_status
    }
