"""
TextHash value object for VeritasAI.
Represents a SHA-256 hash of normalized text content.
"""

import hashlib
import re
from typing import Any
from pydantic import BaseModel, Field, field_validator


class TextHash(BaseModel):
    """
    Value object representing a SHA-256 hash of normalized text.
    
    This hash is used to uniquely identify text content for caching
    and similarity comparison purposes.
    """
    
    value: str = Field(
        ...,
        description="SHA-256 hash string (64 hex characters)",
        min_length=64,
        max_length=64,
        pattern=r"^[a-f0-9]{64}$"
    )
    
    @field_validator('value')
    @classmethod
    def validate_hash_format(cls, v: str) -> str:
        """Validate that the hash is a valid SHA-256 hex string."""
        if not re.match(r"^[a-f0-9]{64}$", v.lower()):
            raise ValueError("Hash must be a 64-character hexadecimal string")
        return v.lower()
    
    @classmethod
    def from_text(cls, text: str) -> "TextHash":
        """
        Create a TextHash from normalized text content.
        
        Args:
            text: The normalized text to hash
            
        Returns:
            TextHash instance with the computed hash
        """
        if not text or not isinstance(text, str):
            raise ValueError("Text must be a non-empty string")
        
        # Normalize text for consistent hashing
        normalized_text = cls._normalize_text(text)
        
        # Generate SHA-256 hash
        hash_value = hashlib.sha256(normalized_text.encode('utf-8')).hexdigest()
        
        return cls(value=hash_value)
    
    @staticmethod
    def _normalize_text(text: str) -> str:
        """
        Normalize text for consistent hashing.
        
        Args:
            text: Raw text to normalize
            
        Returns:
            Normalized text string
        """
        # Remove extra whitespace and normalize Unicode
        normalized = re.sub(r'\s+', ' ', text.strip())
        
        # Convert to lowercase for case-insensitive comparison
        normalized = normalized.lower()
        
        # Normalize Unicode to NFC form
        import unicodedata
        normalized = unicodedata.normalize('NFC', normalized)
        
        return normalized
    
    def __str__(self) -> str:
        """Return the hash value as string."""
        return self.value
    
    def __eq__(self, other: Any) -> bool:
        """Compare TextHash instances."""
        if isinstance(other, TextHash):
            return self.value == other.value
        if isinstance(other, str):
            return self.value == other
        return False
    
    def __hash__(self) -> int:
        """Make TextHash hashable."""
        return hash(self.value)
    
    class Config:
        """Pydantic configuration."""
        frozen = True  # Make immutable
        str_strip_whitespace = True
