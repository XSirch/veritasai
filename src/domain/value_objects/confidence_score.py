"""
ConfidenceScore value object for VeritasAI.
Represents a confidence score between 0.0 and 1.0.
"""

from typing import Any, Union
from pydantic import BaseModel, Field, field_validator


class ConfidenceScore(BaseModel):
    """
    Value object representing a confidence score between 0.0 and 1.0.
    
    Used to indicate the reliability of classification results.
    Higher scores indicate higher confidence in the classification.
    """
    
    value: float = Field(
        ...,
        description="Confidence score between 0.0 and 1.0",
        ge=0.0,
        le=1.0
    )
    
    @field_validator('value')
    @classmethod
    def validate_range(cls, v: float) -> float:
        """Ensure confidence score is within valid range."""
        if not 0.0 <= v <= 1.0:
            raise ValueError("Confidence score must be between 0.0 and 1.0")
        return round(v, 4)  # Round to 4 decimal places for consistency
    
    @classmethod
    def from_percentage(cls, percentage: Union[int, float]) -> "ConfidenceScore":
        """
        Create ConfidenceScore from percentage value (0-100).
        
        Args:
            percentage: Percentage value between 0 and 100
            
        Returns:
            ConfidenceScore instance
        """
        if not 0 <= percentage <= 100:
            raise ValueError("Percentage must be between 0 and 100")
        
        return cls(value=percentage / 100.0)
    
    def to_percentage(self) -> float:
        """
        Convert confidence score to percentage.
        
        Returns:
            Percentage value (0-100)
        """
        return round(self.value * 100, 2)
    
    def is_high_confidence(self, threshold: float = 0.8) -> bool:
        """
        Check if confidence score is above threshold.
        
        Args:
            threshold: Minimum confidence threshold (default: 0.8)
            
        Returns:
            True if confidence is above threshold
        """
        return self.value >= threshold
    
    def is_low_confidence(self, threshold: float = 0.4) -> bool:
        """
        Check if confidence score is below threshold.
        
        Args:
            threshold: Maximum confidence threshold (default: 0.4)
            
        Returns:
            True if confidence is below threshold
        """
        return self.value < threshold
    
    def get_confidence_level(self) -> str:
        """
        Get human-readable confidence level.

        Returns:
            Confidence level string
        """
        if self.value >= 0.8:
            return "HIGH"
        elif self.value >= 0.6:
            return "MEDIUM"
        elif self.value >= 0.2:
            return "LOW"
        else:
            return "VERY_LOW"
    
    def __str__(self) -> str:
        """Return formatted confidence score."""
        return f"{self.to_percentage():.1f}%"
    
    def __float__(self) -> float:
        """Return the raw confidence value."""
        return self.value
    
    def __eq__(self, other: Any) -> bool:
        """Compare ConfidenceScore instances."""
        if isinstance(other, ConfidenceScore):
            return abs(self.value - other.value) < 1e-4
        if isinstance(other, (int, float)):
            return abs(self.value - other) < 1e-4
        return False
    
    def __lt__(self, other: Union["ConfidenceScore", float]) -> bool:
        """Less than comparison."""
        other_value = other.value if isinstance(other, ConfidenceScore) else other
        return self.value < other_value
    
    def __le__(self, other: Union["ConfidenceScore", float]) -> bool:
        """Less than or equal comparison."""
        other_value = other.value if isinstance(other, ConfidenceScore) else other
        return self.value <= other_value
    
    def __gt__(self, other: Union["ConfidenceScore", float]) -> bool:
        """Greater than comparison."""
        other_value = other.value if isinstance(other, ConfidenceScore) else other
        return self.value > other_value
    
    def __ge__(self, other: Union["ConfidenceScore", float]) -> bool:
        """Greater than or equal comparison."""
        other_value = other.value if isinstance(other, ConfidenceScore) else other
        return self.value >= other_value
    
    class Config:
        """Pydantic configuration."""
        frozen = True  # Make immutable
