"""
AnalysisResult entity for VeritasAI.
Represents the complete result of text analysis including classification and metadata.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator

from .text import Text
from .classification import Classification
from ..value_objects.confidence_score import ConfidenceScore


class AnalysisSource(str, Enum):
    """
    Enumeration of analysis sources.
    
    Indicates which service or method was used to generate the analysis.
    """
    
    FACT_CHECK = "fact_check"      # Google Fact Check API
    LLM = "llm"                    # Groq LLM API
    VECTOR_SEARCH = "vector_search" # Qdrant similarity search
    CACHE = "cache"                # Cached result
    HYBRID = "hybrid"              # Combination of multiple sources
    MANUAL = "manual"              # Manual classification
    
    def get_display_name(self) -> str:
        """Get human-readable display name."""
        display_names = {
            self.FACT_CHECK: "Fact Check API",
            self.LLM: "AI Language Model",
            self.VECTOR_SEARCH: "Similarity Search",
            self.CACHE: "Cached Result",
            self.HYBRID: "Hybrid Analysis",
            self.MANUAL: "Manual Review"
        }
        return display_names[self]
    
    def get_reliability_score(self) -> float:
        """Get reliability score for this source type."""
        reliability_scores = {
            self.FACT_CHECK: 0.95,
            self.VECTOR_SEARCH: 0.85,
            self.LLM: 0.75,
            self.HYBRID: 0.90,
            self.CACHE: 1.0,  # Assumes cached results were reliable
            self.MANUAL: 1.0
        }
        return reliability_scores[self]


class AnalysisResult(BaseModel):
    """
    Entity representing the complete result of text analysis.
    
    Contains the analyzed text, classification result, source information,
    and performance metrics.
    """
    
    text: Text = Field(
        ...,
        description="The text that was analyzed"
    )
    
    classification: Classification = Field(
        ...,
        description="The classification result"
    )
    
    source: AnalysisSource = Field(
        ...,
        description="Source of the analysis"
    )
    
    processing_time_ms: int = Field(
        ...,
        description="Time taken to process the analysis in milliseconds",
        ge=0
    )
    
    cost_cents: int = Field(
        default=0,
        description="Cost of the analysis in cents (USD)",
        ge=0
    )
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this analysis was performed"
    )
    
    expires_at: Optional[datetime] = Field(
        default=None,
        description="When this analysis result expires (for caching)"
    )
    
    fact_check_sources: List[str] = Field(
        default_factory=list,
        description="List of fact-checking sources consulted",
        max_items=10
    )
    
    similar_texts_found: int = Field(
        default=0,
        description="Number of similar texts found in vector search",
        ge=0
    )
    
    api_response_raw: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Raw API response for debugging (optional)"
    )
    
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata about the analysis"
    )
    
    @field_validator('processing_time_ms')
    @classmethod
    def validate_processing_time(cls, v: int) -> int:
        """Validate processing time is reasonable."""
        if v < 0:
            raise ValueError("Processing time cannot be negative")
        
        # Warn if processing time is unusually high (over 30 seconds)
        if v > 30000:
            # Log warning but don't fail validation
            pass
        
        return v
    
    @field_validator('cost_cents')
    @classmethod
    def validate_cost(cls, v: int) -> int:
        """Validate cost is reasonable."""
        if v < 0:
            raise ValueError("Cost cannot be negative")
        
        # Warn if cost is unusually high (over $1.00)
        if v > 100:
            # Log warning but don't fail validation
            pass
        
        return v
    
    @field_validator('fact_check_sources')
    @classmethod
    def validate_fact_check_sources(cls, v: List[str]) -> List[str]:
        """Validate and clean fact-check sources."""
        if not v:
            return []
        
        # Clean and deduplicate sources
        cleaned = []
        seen = set()
        
        for source in v:
            if isinstance(source, str):
                clean_source = source.strip()
                if clean_source and clean_source not in seen:
                    cleaned.append(clean_source)
                    seen.add(clean_source)
        
        return cleaned[:10]  # Limit to 10 sources
    
    @classmethod
    def create_from_fact_check(
        cls,
        text: Text,
        classification: Classification,
        processing_time_ms: int,
        fact_check_sources: List[str],
        cost_cents: int = 0,
        expires_at: Optional[datetime] = None
    ) -> "AnalysisResult":
        """Create result from fact-check analysis."""
        return cls(
            text=text,
            classification=classification,
            source=AnalysisSource.FACT_CHECK,
            processing_time_ms=processing_time_ms,
            cost_cents=cost_cents,
            fact_check_sources=fact_check_sources,
            expires_at=expires_at
        )
    
    @classmethod
    def create_from_llm(
        cls,
        text: Text,
        classification: Classification,
        processing_time_ms: int,
        cost_cents: int,
        api_response_raw: Optional[Dict[str, Any]] = None,
        expires_at: Optional[datetime] = None
    ) -> "AnalysisResult":
        """Create result from LLM analysis."""
        return cls(
            text=text,
            classification=classification,
            source=AnalysisSource.LLM,
            processing_time_ms=processing_time_ms,
            cost_cents=cost_cents,
            api_response_raw=api_response_raw,
            expires_at=expires_at
        )
    
    @classmethod
    def create_from_cache(
        cls,
        text: Text,
        classification: Classification,
        original_source: AnalysisSource,
        processing_time_ms: int = 1
    ) -> "AnalysisResult":
        """Create result from cached data."""
        return cls(
            text=text,
            classification=classification,
            source=AnalysisSource.CACHE,
            processing_time_ms=processing_time_ms,
            cost_cents=0,
            metadata={"original_source": original_source.value}
        )
    
    @classmethod
    def create_inconclusive(
        cls,
        text: Text,
        processing_time_ms: int,
        reason: str = "Unable to determine reliability"
    ) -> "AnalysisResult":
        """Create inconclusive result when analysis fails."""
        classification = Classification.create_inconclusive(
            confidence=ConfidenceScore(value=0.5),
            reasoning=reason
        )
        
        return cls(
            text=text,
            classification=classification,
            source=AnalysisSource.HYBRID,
            processing_time_ms=processing_time_ms,
            cost_cents=0
        )
    
    def is_cached(self) -> bool:
        """Check if this result came from cache."""
        return self.source == AnalysisSource.CACHE
    
    def is_expired(self) -> bool:
        """Check if this result has expired."""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at
    
    def is_high_confidence(self, threshold: float = 0.8) -> bool:
        """Check if result has high confidence."""
        return self.classification.confidence.is_high_confidence(threshold)
    
    def is_fast_response(self, threshold_ms: int = 2000) -> bool:
        """Check if analysis was completed quickly."""
        return self.processing_time_ms <= threshold_ms
    
    def is_cost_effective(self, threshold_cents: int = 10) -> bool:
        """Check if analysis was cost-effective."""
        return self.cost_cents <= threshold_cents
    
    def get_performance_score(self) -> float:
        """
        Calculate overall performance score (0.0 to 1.0).
        
        Considers confidence, speed, and cost.
        """
        # Confidence score (40% weight)
        confidence_score = float(self.classification.confidence) * 0.4
        
        # Speed score (30% weight) - faster is better
        speed_score = min(1.0, 5000 / max(self.processing_time_ms, 100)) * 0.3
        
        # Cost score (20% weight) - cheaper is better
        cost_score = min(1.0, 50 / max(self.cost_cents, 1)) * 0.2
        
        # Source reliability (10% weight)
        source_score = self.source.get_reliability_score() * 0.1
        
        return confidence_score + speed_score + cost_score + source_score
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "text": self.text.to_dict(),
            "classification": self.classification.to_dict(),
            "source": self.source.value,
            "source_display_name": self.source.get_display_name(),
            "processing_time_ms": self.processing_time_ms,
            "cost_cents": self.cost_cents,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "fact_check_sources": self.fact_check_sources,
            "similar_texts_found": self.similar_texts_found,
            "metadata": self.metadata,
            "is_cached": self.is_cached(),
            "is_expired": self.is_expired(),
            "is_high_confidence": self.is_high_confidence(),
            "is_fast_response": self.is_fast_response(),
            "is_cost_effective": self.is_cost_effective(),
            "performance_score": self.get_performance_score()
        }
    
    def __str__(self) -> str:
        """String representation."""
        return (f"AnalysisResult({self.classification.classification_type.value}, "
                f"{self.classification.confidence}, {self.source.value})")
    
    class Config:
        """Pydantic configuration."""
        use_enum_values = False
