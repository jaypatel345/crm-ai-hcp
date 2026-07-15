from langchain_core.tools import tool
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
from datetime import datetime
import json

from ..database.db import SessionLocal
from ..database.models import HCP, Interaction
from ..services.hcp import HCPService
from ..services.interaction import InteractionService


def get_db_session() -> Session:
    return SessionLocal()


@tool
def log_interaction(
    hcp_name: Optional[str] = None,
    interaction_type: Optional[str] = None,
    date: Optional[str] = None,
    time: Optional[str] = None,
    topics_discussed: Optional[str] = None,
    summary: Optional[str] = None,
    attendees: Optional[str] = None,
    materials_shared: Optional[str] = None,
    samples_distributed: Optional[str] = None,
    sentiment: Optional[str] = None,
    outcomes: Optional[str] = None,
    follow_up_actions: Optional[str] = None,
    prefill_only: Optional[bool] = True
) -> str:
    """
    Log a new interaction with an HCP. This tool captures interaction data with AI-generated summary and entity extraction.
    
    Args:
        hcp_name: Name of the Healthcare Professional
        interaction_type: Type of interaction (visit, call, email, etc.)
        date: Date of the interaction (YYYY-MM-DD format)
        time: Time of the interaction (HH:MM format)
        topics_discussed: Topics discussed during the interaction
        summary: AI-generated summary of the interaction
        attendees: Optional comma-separated list of attendees
        materials_shared: Optional comma-separated list of materials shared
        samples_distributed: Optional comma-separated list of samples distributed
        sentiment: Optional sentiment (positive, neutral, negative)
        outcomes: Optional outcomes of the interaction
        follow_up_actions: Optional follow-up actions
        prefill_only: If True, return prefill data without saving to database (default: True)
    
    Returns:
        JSON string with action type and prefill data for form
    """
    db = get_db_session()
    try:
        # Find or create HCP
        hcp_service = HCPService(db)
        hcps = []
        hcp_details = None
        if hcp_name:
            hcps = hcp_service.get_all(search=hcp_name, limit=1)
        
        hcp_id = None
        if hcps:
            hcp = hcps[0]
            hcp_id = hcp.id
            # Include HCP details in response
            hcp_details = {
                "id": hcp.id,
                "name": hcp.name,
                "specialty": hcp.specialty,
                "hospital": hcp.hospital,
                "city": hcp.city,
                "phone": hcp.phone,
                "email": hcp.email
            }
        elif hcp_name:
            # Auto-create HCP if not found
            from ..schemas.hcp import HCPCreate
            hcp_data = HCPCreate(name=hcp_name)
            hcp = hcp_service.create(hcp_data)
            hcp_id = hcp.id
            # Include created HCP details in response
            hcp_details = {
                "id": hcp.id,
                "name": hcp.name,
                "specialty": hcp.specialty,
                "hospital": hcp.hospital,
                "city": hcp.city,
                "phone": hcp.phone,
                "email": hcp.email
            }
        
        if not hcp_id:
            return json.dumps({
                "action": "log_interaction",
                "prefill": {"error": "HCP name is required to log interaction"}
            })
        
        # Parse date
        date_str = date
        if date:
            try:
                interaction_date = datetime.strptime(date, "%Y-%m-%d")
                date_str = interaction_date.strftime("%Y-%m-%d")
            except:
                date_str = date
        else:
            date_str = datetime.now().strftime("%Y-%m-%d")
        
        # If prefill_only mode, return prefill data without saving
        if prefill_only:
            prefill_data = {
                "hcp_id": hcp_id,
                "hcp_name": hcp_name,
                "hcp_details": hcp_details,
                "interaction_type": interaction_type,
                "date": date_str,
                "time": time,
                "topics_discussed": topics_discussed,
                "voice_note_summary": summary,
                "attendees": attendees,
                "materials_shared": materials_shared,
                "samples_distributed": samples_distributed,
                "sentiment": sentiment,
                "outcomes": outcomes,
                "follow_up_actions": follow_up_actions,
                "prefill_only": True
            }
            
            result = {
                "action": "log_interaction",
                "prefill": prefill_data
            }
            
            return json.dumps(result)
        
        # Otherwise, save to database
        interaction_service = InteractionService(db)
        from ..schemas.interaction import InteractionCreate
        
        try:
            interaction_date = datetime.strptime(date_str, "%Y-%m-%d")
        except:
            interaction_date = datetime.now()
        
        interaction_data = InteractionCreate(
            hcp_id=hcp_id,
            interaction_type=interaction_type or "visit",
            date=interaction_date,
            time=time,
            attendees=attendees,
            topics_discussed=topics_discussed,
            voice_note_summary=summary or topics_discussed,  # Use topics as summary if not provided
            materials_shared=materials_shared,
            samples_distributed=samples_distributed,
            sentiment=sentiment,
            outcomes=outcomes,
            follow_up_actions=follow_up_actions
        )
        
        interaction = interaction_service.create(interaction_data)
        
        # Return success with interaction details
        result = {
            "action": "log_interaction",
            "prefill": {
                "success": True,
                "interaction_id": interaction.id,
                "hcp_id": hcp_id,
                "hcp_name": hcp_name,
                "message": f"Interaction logged successfully with ID: {interaction.id} for HCP: {hcp_name}"
            }
        }
        
        return json.dumps(result)
    finally:
        db.close()


@tool
def edit_interaction(
    interaction_id: int,
    interaction_type: Optional[str] = None,
    date: Optional[str] = None,
    topics_discussed: Optional[str] = None,
    summary: Optional[str] = None,
    attendees: Optional[str] = None,
    materials_shared: Optional[str] = None,
    samples_distributed: Optional[str] = None,
    sentiment: Optional[str] = None,
    outcomes: Optional[str] = None,
    follow_up_actions: Optional[str] = None
) -> str:
    """
    Edit an existing interaction record. This tool allows modification of logged interaction data.
    
    Args:
        interaction_id: ID of the interaction to edit
        interaction_type: Optional new interaction type
        date: Optional new date (YYYY-MM-DD format)
        topics_discussed: Optional new topics discussed
        summary: Optional new summary
        attendees: Optional new attendees
        materials_shared: Optional new materials shared
        samples_distributed: Optional new samples distributed
        sentiment: Optional new sentiment
        outcomes: Optional new outcomes
        follow_up_actions: Optional new follow-up actions
    
    Returns:
        JSON string with action type and prefill data for form
    """
    db = get_db_session()
    try:
        interaction_service = InteractionService(db)
        
        # Get existing interaction to prefill current values
        existing = interaction_service.get_by_id(interaction_id)
        if not existing:
            return json.dumps({
                "action": "edit_interaction",
                "prefill": {"error": f"Interaction {interaction_id} not found"}
            })
        
        # Build prefill data with existing values and updates
        prefill_data = {
            "interaction_id": interaction_id,
            "hcp_id": existing.hcp_id,
            "interaction_type": interaction_type if interaction_type else existing.interaction_type,
            "date": date if date else existing.date.strftime("%Y-%m-%d"),
            "topics_discussed": topics_discussed if topics_discussed else existing.topics_discussed,
            "voice_note_summary": summary if summary else existing.voice_note_summary,
            "attendees": attendees if attendees else existing.attendees,
            "materials_shared": materials_shared if materials_shared else existing.materials_shared,
            "samples_distributed": samples_distributed if samples_distributed else existing.samples_distributed,
            "sentiment": sentiment if sentiment else existing.sentiment,
            "outcomes": outcomes if outcomes else existing.outcomes,
            "follow_up_actions": follow_up_actions if follow_up_actions else existing.follow_up_actions,
        }
        
        result = {
            "action": "edit_interaction",
            "prefill": prefill_data
        }
        
        return json.dumps(result)
    finally:
        db.close()


@tool
def search_hcps(
    name: Optional[str] = None,
    specialty: Optional[str] = None,
    hospital: Optional[str] = None,
    city: Optional[str] = None
) -> str:
    """
    Search for HCPs by name, specialty, hospital, or city. This tool helps find Healthcare Professionals.
    
    Args:
        name: Optional name to search for
        specialty: Optional specialty to search for
        hospital: Optional hospital to search for
        city: Optional city to search for
    
    Returns:
        JSON string with list of matching HCPs
    """
    db = get_db_session()
    try:
        hcp_service = HCPService(db)
        
        # Build search query
        search_terms = []
        if name:
            search_terms.append(name)
        if specialty:
            search_terms.append(specialty)
        if hospital:
            search_terms.append(hospital)
        if city:
            search_terms.append(city)
        
        search_query = " ".join(search_terms) if search_terms else None
        hcps = hcp_service.get_all(search=search_query, limit=10)
        
        result = []
        for hcp in hcps:
            result.append({
                "id": hcp.id,
                "name": hcp.name,
                "specialty": hcp.specialty,
                "hospital": hcp.hospital,
                "city": hcp.city,
                "phone": hcp.phone,
                "email": hcp.email
            })
        
        return json.dumps(result, indent=2)
    finally:
        db.close()


@tool
def get_interaction_history(hcp_name: str) -> str:
    """
    Retrieve past interactions with an HCP. This tool shows the interaction history for a specific Healthcare Professional.
    
    Args:
        hcp_name: Name of the Healthcare Professional
    
    Returns:
        JSON string with chronological interaction history
    """
    db = get_db_session()
    try:
        hcp_service = HCPService(db)
        hcps = hcp_service.get_all(search=hcp_name, limit=1)
        
        if not hcps:
            return f"No HCP found with name: {hcp_name}"
        
        hcp = hcps[0]
        interaction_service = InteractionService(db)
        interactions = interaction_service.get_by_hcp_id(hcp.id, limit=20)
        
        result = {
            "hcp": {
                "id": hcp.id,
                "name": hcp.name,
                "specialty": hcp.specialty,
                "hospital": hcp.hospital
            },
            "interactions": []
        }
        
        for interaction in interactions:
            result["interactions"].append({
                "id": interaction.id,
                "type": interaction.interaction_type,
                "date": interaction.date.isoformat(),
                "topics_discussed": interaction.topics_discussed,
                "summary": interaction.voice_note_summary,
                "sentiment": interaction.sentiment,
                "outcomes": interaction.outcomes
            })
        
        return json.dumps(result, indent=2)
    finally:
        db.close()


@tool
def recommend_follow_up(hcp_name: str) -> str:
    """
    Recommend next follow-up actions based on interaction history. This tool analyzes past interactions and suggests follow-up activities.
    
    Args:
        hcp_name: Name of the Healthcare Professional
    
    Returns:
        JSON string with follow-up recommendations
    """
    db = get_db_session()
    try:
        hcp_service = HCPService(db)
        hcps = hcp_service.get_all(search=hcp_name, limit=1)
        
        if not hcps:
            return f"No HCP found with name: {hcp_name}"
        
        hcp = hcps[0]
        interaction_service = InteractionService(db)
        interactions = interaction_service.get_by_hcp_id(hcp.id, limit=5)
        
        if not interactions:
            return f"No interaction history found for {hcp_name}. Consider scheduling an initial visit."
        
        # Analyze recent interactions
        last_interaction = interactions[0]
        days_since = (datetime.now() - last_interaction.date).days
        
        recommendations = []
        
        # Based on sentiment
        if last_interaction.sentiment == "positive":
            recommendations.append("HCP showed positive engagement - good opportunity to discuss new products")
        elif last_interaction.sentiment == "negative":
            recommendations.append("Address concerns from last interaction before proposing new topics")
        
        # Based on time since last interaction
        if days_since > 30:
            recommendations.append(f"It has been {days_since} days since last contact - schedule a follow-up visit")
        elif days_since > 14:
            recommendations.append("Consider a phone call or email to check in")
        
        # Based on outcomes
        if last_interaction.outcomes:
            recommendations.append(f"Follow up on: {last_interaction.outcomes}")
        
        # Based on follow-up actions
        if last_interaction.follow_up_actions:
            recommendations.append(f"Pending actions: {last_interaction.follow_up_actions}")
        
        if not recommendations:
            recommendations.append("Maintain regular contact schedule")
        
        result = {
            "hcp": hcp.name,
            "last_interaction_date": last_interaction.date.isoformat(),
            "days_since_last_contact": days_since,
            "recommendations": recommendations
        }
        
        return json.dumps(result, indent=2)
    finally:
        db.close()
