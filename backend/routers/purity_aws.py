"""
AWS-Compatible Purity Testing WebSocket Router - LOW LATENCY VERSION
Camera runs on browser, YOLO runs on AWS GPU
Supports both JSON and BINARY WebSocket modes
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
from typing import Optional
import asyncio
import json
import uuid
import struct

router = APIRouter(prefix="/api/purity/aws", tags=["purity-aws"])

# Service will be injected
aws_service = None

def set_service(service):
    global aws_service
    aws_service = service


# ============================================================================
# REST Endpoints
# ============================================================================

@router.get("/status")
async def get_status():
    """Get AWS purity service status"""
    return aws_service.get_status()


@router.post("/session/create")
async def create_session():
    """Create a new session for a user"""
    session_id = str(uuid.uuid4())[:8]
    result = aws_service.create_session(session_id)
    return result


@router.post("/session/{session_id}/reset")
async def reset_session(session_id: str):
    """Reset a session"""
    aws_service.reset_session(session_id)
    return {"success": True, "message": "Session reset"}


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session"""
    aws_service.delete_session(session_id)
    return {"success": True, "message": "Session deleted"}


@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get session status"""
    session = aws_service.get_session(session_id)
    if session:
        return {
            "session_id": session_id,
            "current_task": session['current_task'],
            "rubbing_confirmed": session['rubbing_confirmed'],
            "acid_detected": session['acid_detected']
        }
    raise HTTPException(status_code=404, detail="Session not found")


# ============================================================================
# BINARY WebSocket (LOW LATENCY MODE)
# ============================================================================

@router.websocket("/stream-binary/{session_id}")
async def websocket_stream_binary(websocket: WebSocket, session_id: str):
    """
    LOW LATENCY Binary WebSocket endpoint.
    
    Connect to: ws://your-server/api/purity/aws/stream-binary/{session_id}
    
    Flow:
    1. Browser sends raw JPEG bytes (no base64, no JSON!)
    2. AWS runs YOLO inference
    3. AWS sends: [4 bytes: metadata length][JSON metadata][JPEG bytes]
    
    This is 30-50% faster than JSON+base64!
    """
    await websocket.accept()
    print(f"🚀 LOW LATENCY Binary WebSocket connected: {session_id}")
    
    # Create session
    if not aws_service.get_session(session_id):
        aws_service.create_session(session_id)
    
    try:
        while True:
            # Receive binary frame (raw JPEG bytes)
            data = await websocket.receive_bytes()
            
            # Check for control messages (first byte = 0x00 means JSON control)
            if len(data) > 0 and data[0] == 0x00:
                try:
                    control_msg = json.loads(data[1:].decode('utf-8'))
                    action = control_msg.get("action")
                    
                    if action == "reset":
                        aws_service.reset_session(session_id)
                        # Send text response for control
                        await websocket.send_text(json.dumps({
                            "type": "control",
                            "message": "Session reset"
                        }))
                        continue
                        
                    elif action == "ping":
                        await websocket.send_text(json.dumps({"type": "pong"}))
                        continue
                        
                except json.JSONDecodeError:
                    pass
            
            # Process as JPEG frame
            jpeg_bytes, status = await aws_service.process_frame_binary(session_id, data)
            
            if jpeg_bytes and len(jpeg_bytes) > 0:
                # Create binary response packet
                response = aws_service.create_binary_response(jpeg_bytes, status)
                await websocket.send_bytes(response)
            else:
                # Error - send as text
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": status.get("error", "Processing failed")
                }))

    except WebSocketDisconnect:
        print(f"🔌 Binary WebSocket disconnected: {session_id}")
    except Exception as e:
        print(f"❌ Binary WebSocket error: {e}")


# ============================================================================
# JSON WebSocket (Fallback, slower but more compatible)
# ============================================================================

@router.websocket("/stream/{session_id}")
async def websocket_stream(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for AWS-compatible purity testing.
    
    Connect to: ws://your-aws-server/api/purity/aws/stream/{session_id}
    
    Flow:
    1. Browser captures camera frame
    2. Browser sends frame as base64 via WebSocket
    3. AWS runs YOLO inference
    4. AWS sends annotated frame back
    
    Messages FROM client:
    {
        "action": "frame",
        "data": "<base64 JPEG from browser camera>"
    }
    {
        "action": "reset"
    }
    
    Messages TO client:
    {
        "type": "frame",
        "frame": "<base64 annotated JPEG>",
        "status": {...},
        "fps": float,
        "process_ms": float
    }
    """
    await websocket.accept()
    
    # Create session if not exists
    if not aws_service.get_session(session_id):
        aws_service.create_session(session_id)
    
    try:
        while True:
            # Receive frame from browser
            data = await websocket.receive_text()
            
            try:
                msg = json.loads(data)
                action = msg.get("action")
                
                if action == "frame":
                    # Process frame through YOLO
                    frame_b64 = msg.get("data", "")
                    result = await aws_service.process_frame_b64(session_id, frame_b64)
                    
                    if "error" not in result:
                        await websocket.send_json({
                            "type": "frame",
                            **result
                        })
                    else:
                        await websocket.send_json({
                            "type": "error",
                            "message": result["error"]
                        })
                        
                elif action == "reset":
                    aws_service.reset_session(session_id)
                    await websocket.send_json({
                        "type": "control",
                        "message": "Session reset"
                    })
                    
                elif action == "ping":
                    await websocket.send_json({"type": "pong"})
                    
            except json.JSONDecodeError:
                # Assume raw base64 frame if not JSON
                result = await aws_service.process_frame_b64(session_id, data)
                if "error" not in result:
                    await websocket.send_json({
                        "type": "frame",
                        **result
                    })

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        # Keep session for potential reconnection
        pass


# ============================================================================
# HTTP Fallback (for environments without WebSocket)
# ============================================================================

class FrameRequest(BaseModel):
    session_id: str
    frame: str  # Base64 JPEG


@router.post("/process")
async def process_frame_http(request: FrameRequest):
    """
    HTTP endpoint for processing a single frame.
    Use this if WebSocket is not available.
    
    Note: Slower than WebSocket due to HTTP overhead.
    """
    result = await aws_service.process_frame_b64(request.session_id, request.frame)
    return result
