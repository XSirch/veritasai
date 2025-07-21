"""
Classification entity for VeritasAI.
Represents the classification result of text analysis.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator

from src.domain.value_objects.confidence_score import ConfidenceScore


class ClassificationType(str, Enum):
    """
    Enumeration of possible classification types.
    
    Based on the VeritasAI classification system:
    - RELIABLE: Information is trustworthy (80-100% confidence)
    - INCONCLUSIVE: Cannot determine reliability (40-79% confidence)  
    - UNFOUNDED: Information lacks proper foundation (20-39% confidence)
    - FAKE: Information is demonstrably false (0-19% confidence)
    """
    
    RELIABLE = "RELIABLE"
    INCONCLUSIVE = "INCONCLUSIVE"
    UNFOUNDED = "UNFOUNDED"
    FAKE = "FAKE"
    
    @classmethod
    def from_confidence(cls, confidence: ConfidenceScore) -> "ClassificationType":
        """
        Determine classification type based on confidence score.
        
        Args:
            confidence: ConfidenceScore instance
            
        Returns:
            Appropriate ClassificationType
        """
        if confidence.value >= 0.8:
            return cls.RELIABLE
        elif confidence.value >= 0.4:
            return cls.INCONCLUSIVE
        elif confidence.value >= 0.2:
            return cls.UNFOUNDED
        else:
            return cls.FAKE
    
    def get_color_code(self) -> str:
        """Get color code for UI display."""
        color_map = {
            self.RELIABLE: "#22c55e",      # Green
            self.INCONCLUSIVE: "#eab308",  # Yellow
            self.UNFOUNDED: "#f97316",     # Orange
            self.FAKE: "#ef4444"           # Red
        }
        return color_map[self]
    
    def get_emoji(self) -> str:
        """Get emoji representation."""
        emoji_map = {
            self.RELIABLE: "🟢",
            self.INCONCLUSIVE: "🟡", 
            self.UNFOUNDED: "🟠",
            self.FAKE: "🔴"
        }
        return emoji_map[self]
    
    def get_description(self) -> str:
        """Get human-readable description."""
        descriptions = {
            self.RELIABLE: "Information appears to be trustworthy and well-founded",
            self.INCONCLUSIVE: "Cannot determine the reliability of this information",
            self.UNFOUNDED: "Information lacks proper foundation or evidence",
            self.FAKE: "Information appears to be false or misleading"
        }
        return descriptions[self]


class Classification(BaseModel):
    """
    Entity representing a classification result.
    
    Contains the classification type, confidence score, and supporting evidence.
    """
    
    classification_type: ClassificationType = Field(
        ...,
        description="The type of classification assigned"
    )
    
    confidence: ConfidenceScore = Field(
        ...,
        description="Confidence score for this classification"
    )
    
    reasoning: Optional[str] = Field(
        default=None,
        description="Human-readable explanation of the classification",
        max_length=1000
    )
    
    evidence_sources: List[str] = Field(
        default_factory=list,
        description="List of evidence sources that support this classification",
        max_items=10
    )
    
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata about the classification"
    )
    
    @field_validator('evidence_sources')
    @classmethod
    def validate_evidence_sources(cls, v: List[str]) -> List[str]:
        """Validate evidence sources."""
        # Remove empty strings and duplicates
        cleaned = list(dict.fromkeys([source.strip() for source in v if source.strip()]))
        return cleaned[:10]  # Limit to 10 sources
    
    @field_validator('reasoning')
    @classmethod
    def validate_reasoning(cls, v: Optional[str]) -> Optional[str]:
        """Validate reasoning text."""
        if v is None:
            return None
        
        cleaned = v.strip()
        if not cleaned:
            return None
            
        return cleaned
    
    @classmethod
    def create_reliable(
        cls,
        confidence: ConfidenceScore,
        reasoning: Optional[str] = None,
        evidence_sources: Optional[List[str]] = None
    ) -> "Classification":
        """Create a RELIABLE classification."""
        return cls(
            classification_type=ClassificationType.RELIABLE,
            confidence=confidence,
            reasoning=reasoning,
            evidence_sources=evidence_sources or []
        )
    
    @classmethod
    def create_fake(
        cls,
        confidence: ConfidenceScore,
        reasoning: Optional[str] = None,
        evidence_sources: Optional[List[str]] = None
    ) -> "Classification":
        """Create a FAKE classification."""
        return cls(
            classification_type=ClassificationType.FAKE,
            confidence=confidence,
            reasoning=reasoning,
            evidence_sources=evidence_sources or []
        )
    
    @classmethod
    def create_inconclusive(
        cls,
        confidence: ConfidenceScore,
        reasoning: Optional[str] = None
    ) -> "Classification":
        """Create an INCONCLUSIVE classification."""
        return cls(
            classification_type=ClassificationType.INCONCLUSIVE,
            confidence=confidence,
            reasoning=reasoning or "Insufficient evidence to determine reliability",
            evidence_sources=[]
        )
    
    @classmethod
    def from_confidence_auto(
        cls,
        confidence: ConfidenceScore,
        reasoning: Optional[str] = None,
        evidence_sources: Optional[List[str]] = None
    ) -> "Classification":
        """
        Create classification automatically based on confidence score.
        
        Args:
            confidence: ConfidenceScore instance
            reasoning: Optional reasoning text
            evidence_sources: Optional evidence sources
            
        Returns:
            Classification with appropriate type based on confidence
        """
        classification_type = ClassificationType.from_confidence(confidence)
        
        return cls(
            classification_type=classification_type,
            confidence=confidence,
            reasoning=reasoning,
            evidence_sources=evidence_sources or []
        )
    
    def is_trustworthy(self) -> bool:
        """Check if classification indicates trustworthy information."""
        return self.classification_type == ClassificationType.RELIABLE
    
    def is_problematic(self) -> bool:
        """Check if classification indicates problematic information."""
        return self.classification_type in [ClassificationType.UNFOUNDED, ClassificationType.FAKE]
    
    def get_display_text(self) -> str:
        """Get formatted display text for UI."""
        emoji = self.classification_type.get_emoji()
        name = self.classification_type.value
        confidence_pct = self.confidence.to_percentage()
        
        return f"{emoji} {name} ({confidence_pct:.1f}%)"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "classification_type": self.classification_type.value,
            "confidence": float(self.confidence),
            "confidence_percentage": self.confidence.to_percentage(),
            "reasoning": self.reasoning,
            "evidence_sources": self.evidence_sources,
            "metadata": self.metadata,
            "display_text": self.get_display_text(),
            "color_code": self.classification_type.get_color_code(),
            "is_trustworthy": self.is_trustworthy(),
            "is_problematic": self.is_problematic()
        }
    
    def __str__(self) -> str:
        """String representation."""
        return self.get_display_text()
    
    class Config:
        """Pydantic configuration."""
        use_enum_values = True
