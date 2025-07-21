"""
User entity for VeritasAI.
Represents a user of the extension with their preferences and API keys.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator

from src.domain.value_objects.api_key import ApiKey


class AnalysisMode(str, Enum):
    """
    Enumeration of analysis modes.
    
    Controls how the extension analyzes text.
    """
    
    AUTOMATIC = "automatic"  # Use all available methods
    FACT_CHECK_ONLY = "fact_check_only"  # Only use fact-check APIs
    LLM_ONLY = "llm_only"  # Only use LLM analysis
    VECTOR_ONLY = "vector_only"  # Only use vector similarity
    OFFLINE = "offline"  # Only use cached results
    
    def get_display_name(self) -> str:
        """Get human-readable display name."""
        display_names = {
            self.AUTOMATIC: "Automatic (Recommended)",
            self.FACT_CHECK_ONLY: "Fact Check API Only",
            self.LLM_ONLY: "AI Language Model Only",
            self.VECTOR_ONLY: "Similarity Search Only",
            self.OFFLINE: "Offline Mode (Cache Only)"
        }
        return display_names[self]


class UITheme(str, Enum):
    """
    Enumeration of UI themes.
    
    Controls the appearance of the extension.
    """
    
    SYSTEM = "system"  # Follow system theme
    LIGHT = "light"  # Light theme
    DARK = "dark"  # Dark theme
    
    def get_display_name(self) -> str:
        """Get human-readable display name."""
        display_names = {
            self.SYSTEM: "System Default",
            self.LIGHT: "Light Mode",
            self.DARK: "Dark Mode"
        }
        return display_names[self]


class User(BaseModel):
    """
    Entity representing a user of the extension.
    
    Contains user preferences, API keys, and usage statistics.
    """
    
    user_id: str = Field(
        ...,
        description="Unique identifier for the user",
        min_length=8,
        max_length=64
    )
    
    analysis_mode: AnalysisMode = Field(
        default=AnalysisMode.AUTOMATIC,
        description="Preferred analysis mode"
    )
    
    ui_theme: UITheme = Field(
        default=UITheme.SYSTEM,
        description="Preferred UI theme"
    )
    
    api_keys: List[ApiKey] = Field(
        default_factory=list,
        description="User's API keys for external services"
    )
    
    auto_analyze: bool = Field(
        default=False,
        description="Whether to automatically analyze selected text"
    )
    
    cache_enabled: bool = Field(
        default=True,
        description="Whether to cache analysis results"
    )
    
    cache_duration_days: int = Field(
        default=30,
        description="How long to keep cached results (in days)",
        ge=1,
        le=365
    )
    
    language_preference: str = Field(
        default="pt",
        description="Preferred language for analysis (ISO 639-1 code)",
        min_length=2,
        max_length=5
    )
    
    confidence_threshold: float = Field(
        default=0.8,
        description="Minimum confidence threshold for reliable results",
        ge=0.0,
        le=1.0
    )
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this user was created"
    )
    
    last_active_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this user was last active"
    )
    
    total_analyses: int = Field(
        default=0,
        description="Total number of analyses performed",
        ge=0
    )
    
    total_cost_cents: int = Field(
        default=0,
        description="Total cost of analyses in cents (USD)",
        ge=0
    )
    
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata about the user"
    )
    
    @field_validator('user_id')
    @classmethod
    def validate_user_id(cls, v: str) -> str:
        """Validate user ID format."""
        if not v or not v.strip():
            raise ValueError("User ID cannot be empty")
        
        # Basic validation for user ID format
        if not v.isalnum() and not all(c.isalnum() or c in '-_' for c in v):
            raise ValueError("User ID can only contain alphanumeric characters, hyphens, and underscores")
        
        return v.strip()
    
    @field_validator('language_preference')
    @classmethod
    def validate_language_code(cls, v: str) -> str:
        """Validate language code format."""
        import re
        
        # Basic validation for ISO 639-1 codes
        if not re.match(r'^[a-z]{2}(-[A-Z]{2})?$', v):
            return "pt"  # Fallback to Portuguese if invalid
        
        return v.lower()
    
    @field_validator('api_keys')
    @classmethod
    def validate_api_keys(cls, v: List[ApiKey]) -> List[ApiKey]:
        """Validate API keys."""
        if not v:
            return []
        
        # Ensure no duplicate service keys
        seen_services = set()
        unique_keys = []
        
        for key in v:
            if key.service_name not in seen_services:
                unique_keys.append(key)
                seen_services.add(key.service_name)
        
        return unique_keys
    
    @classmethod
    def create_new(cls, user_id: str) -> "User":
        """
        Create a new user with default settings.
        
        Args:
            user_id: Unique identifier for the user
            
        Returns:
            User entity with default settings
        """
        import uuid
        
        # Generate a random user ID if not provided
        if not user_id or not user_id.strip():
            user_id = f"user_{uuid.uuid4().hex[:12]}"
        
        return cls(
            user_id=user_id,
            analysis_mode=AnalysisMode.AUTOMATIC,
            ui_theme=UITheme.SYSTEM,
            api_keys=[],
            auto_analyze=False,
            cache_enabled=True,
            cache_duration_days=30,
            language_preference="pt",
            confidence_threshold=0.8
        )
    
    def add_api_key(self, api_key: ApiKey) -> None:
        """
        Add or update an API key.
        
        Args:
            api_key: ApiKey to add or update
        """
        # Remove existing key for the same service
        self.api_keys = [key for key in self.api_keys 
                        if key.service_name != api_key.service_name]
        
        # Add the new key
        self.api_keys.append(api_key)
    
    def remove_api_key(self, service_name: str) -> bool:
        """
        Remove an API key.
        
        Args:
            service_name: Name of the service to remove key for
            
        Returns:
            True if key was removed, False if not found
        """
        original_count = len(self.api_keys)
        self.api_keys = [key for key in self.api_keys 
                        if key.service_name != service_name]
        
        return len(self.api_keys) < original_count
    
    def get_api_key(self, service_name: str) -> Optional[ApiKey]:
        """
        Get API key for a specific service.
        
        Args:
            service_name: Name of the service
            
        Returns:
            ApiKey if found, None otherwise
        """
        for key in self.api_keys:
            if key.service_name == service_name:
                return key
        return None
    
    def has_api_key(self, service_name: str) -> bool:
        """
        Check if user has API key for a service.
        
        Args:
            service_name: Name of the service
            
        Returns:
            True if user has API key for the service
        """
        return any(key.service_name == service_name for key in self.api_keys)
    
    def record_analysis(self, cost_cents: int = 0) -> None:
        """
        Record a completed analysis.
        
        Args:
            cost_cents: Cost of the analysis in cents
        """
        self.total_analyses += 1
        self.total_cost_cents += max(0, cost_cents)
        self.last_active_at = datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "user_id": self.user_id,
            "analysis_mode": self.analysis_mode.value,
            "ui_theme": self.ui_theme.value,
            "api_keys": [
                {
                    "service_name": key.service_name,
                    "is_default": key.is_default,
                    "masked_value": key.mask_for_display()
                }
                for key in self.api_keys
            ],
            "auto_analyze": self.auto_analyze,
            "cache_enabled": self.cache_enabled,
            "cache_duration_days": self.cache_duration_days,
            "language_preference": self.language_preference,
            "confidence_threshold": self.confidence_threshold,
            "created_at": self.created_at.isoformat(),
            "last_active_at": self.last_active_at.isoformat(),
            "total_analyses": self.total_analyses,
            "total_cost_cents": self.total_cost_cents,
            "metadata": self.metadata
        }
    
    def __str__(self) -> str:
        """String representation."""
        return f"User({self.user_id}, analyses={self.total_analyses})"
    
    class Config:
        """Pydantic configuration."""
        use_enum_values = True
