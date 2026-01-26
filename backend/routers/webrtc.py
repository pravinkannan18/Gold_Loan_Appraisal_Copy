"""
WebRTC Signaling API Router
Handles SDP offer/answer exchange, ICE candidates, and session management.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

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
    """Create a new WebRTC session"""
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
    # TODO: Re-enable when inference module is properly set up
    # from inference.model_manager import get_model_manager
    
    if not webrtc_manager.initialized:
        webrtc_manager.initialize()
    
    webrtc_status = webrtc_manager.get_status()
    # model_status = get_model_manager().get_status()
    
    return {
        "webrtc": webrtc_status,
        "inference": {
            "available": False,
            "message": "Inference module not configured"
        }
    }
