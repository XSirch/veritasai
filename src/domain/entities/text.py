"""
Text entity for VeritasAI.
Represents text content to be analyzed for fact-checking.
"""

import re
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator

from src.domain.value_objects.text_hash import TextHash


class Text(BaseModel):
    """
    Entity representing text content for analysis.
    
    Contains the original text, normalized version, hash, and metadata
    for fact-checking and similarity analysis.
    """
    
    original_content: str = Field(
        ...,
        description="Original text content as provided by user",
        min_length=10,
        max_length=2000
    )
    
    normalized_content: str = Field(
        ...,
        description="Normalized version of the text for processing"
    )
    
    text_hash: TextHash = Field(
        ...,
        description="SHA-256 hash of the normalized text"
    )
    
    language: Optional[str] = Field(
        default="pt",
        description="Detected or specified language code (ISO 639-1)",
        min_length=2,
        max_length=5
    )
    
    word_count: int = Field(
        ...,
        description="Number of words in the text",
        ge=1
    )
    
    character_count: int = Field(
        ...,
        description="Number of characters in the original text",
        ge=10,
        le=2000
    )
    
    keywords: List[str] = Field(
        default_factory=list,
        description="Extracted keywords for fact-checking",
        max_items=20
    )
    
    source_url: Optional[str] = Field(
        default=None,
        description="URL where the text was found",
        max_length=500
    )
    
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When this text entity was created"
    )
    
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata about the text"
    )
    
    @field_validator('original_content')
    @classmethod
    def validate_content_length(cls, v: str) -> str:
        """Validate text content length and format."""
        if not v or not v.strip():
            raise ValueError("Text content cannot be empty")
        
        stripped = v.strip()
        if len(stripped) < 10:
            raise ValueError("Text must be at least 10 characters long")
        
        if len(stripped) > 2000:
            raise ValueError("Text cannot exceed 2000 characters")
        
        return stripped
    
    @field_validator('language')
    @classmethod
    def validate_language_code(cls, v: Optional[str]) -> Optional[str]:
        """Validate language code format."""
        if v is None:
            return "pt"  # Default to Portuguese
        
        # Basic validation for ISO 639-1 codes
        if not re.match(r'^[a-z]{2}(-[A-Z]{2})?$', v):
            return "pt"  # Fallback to Portuguese if invalid
        
        return v.lower()
    
    @field_validator('keywords')
    @classmethod
    def validate_keywords(cls, v: List[str]) -> List[str]:
        """Validate and clean keywords."""
        if not v:
            return []
        
        # Clean and deduplicate keywords
        cleaned = []
        seen = set()
        
        for keyword in v:
            if isinstance(keyword, str):
                clean_keyword = keyword.strip().lower()
                if clean_keyword and len(clean_keyword) >= 2 and clean_keyword not in seen:
                    cleaned.append(clean_keyword)
                    seen.add(clean_keyword)
        
        return cleaned[:20]  # Limit to 20 keywords
    
    @classmethod
    def create(
        cls,
        content: str,
        source_url: Optional[str] = None,
        language: Optional[str] = None,
        keywords: Optional[List[str]] = None
    ) -> "Text":
        """
        Create a Text entity from raw content.
        
        Args:
            content: Raw text content
            source_url: Optional URL where text was found
            language: Optional language code
            keywords: Optional list of keywords
            
        Returns:
            Text entity with computed fields
        """
        # Validate and clean content
        if not content or not content.strip():
            raise ValueError("Content cannot be empty")
        
        original_content = content.strip()
        
        # Normalize content
        normalized_content = cls._normalize_content(original_content)
        
        # Generate hash
        text_hash = TextHash.from_text(normalized_content)
        
        # Count words and characters
        word_count = len(normalized_content.split())
        character_count = len(original_content)
        
        return cls(
            original_content=original_content,
            normalized_content=normalized_content,
            text_hash=text_hash,
            language=language or "pt",
            word_count=word_count,
            character_count=character_count,
            keywords=keywords or [],
            source_url=source_url
        )
    
    @staticmethod
    def _normalize_content(content: str) -> str:
        """
        Normalize text content for processing.
        
        Args:
            content: Raw text content
            
        Returns:
            Normalized text content
        """
        # Remove extra whitespace
        normalized = re.sub(r'\s+', ' ', content.strip())
        
        # Normalize Unicode
        import unicodedata
        normalized = unicodedata.normalize('NFC', normalized)
        
        # Remove control characters but keep basic punctuation
        normalized = ''.join(char for char in normalized 
                           if unicodedata.category(char)[0] != 'C' or char in '\n\r\t')
        
        return normalized
    
    def extract_sentences(self) -> List[str]:
        """
        Extract sentences from the normalized content.
        
        Returns:
            List of sentences
        """
        # Simple sentence splitting (can be improved with NLP libraries)
        sentences = re.split(r'[.!?]+', self.normalized_content)
        
        # Clean and filter sentences
        cleaned_sentences = []
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) >= 10:  # Minimum sentence length
                cleaned_sentences.append(sentence)
        
        return cleaned_sentences
    
    def get_preview(self, max_length: int = 100) -> str:
        """
        Get a preview of the text content.
        
        Args:
            max_length: Maximum length of preview
            
        Returns:
            Truncated text with ellipsis if needed
        """
        if len(self.original_content) <= max_length:
            return self.original_content
        
        # Find a good breaking point
        truncated = self.original_content[:max_length]
        last_space = truncated.rfind(' ')
        
        if last_space > max_length * 0.8:  # If space is reasonably close to end
            truncated = truncated[:last_space]
        
        return truncated + "..."
    
    def is_similar_to(self, other: "Text", threshold: float = 0.8) -> bool:
        """
        Check if this text is similar to another text.
        
        Args:
            other: Another Text entity
            threshold: Similarity threshold (0.0 to 1.0)
            
        Returns:
            True if texts are similar above threshold
        """
        if self.text_hash == other.text_hash:
            return True
        
        # Simple similarity based on common words
        words1 = set(self.normalized_content.lower().split())
        words2 = set(other.normalized_content.lower().split())
        
        if not words1 or not words2:
            return False
        
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        similarity = intersection / union if union > 0 else 0.0
        return similarity >= threshold
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "original_content": self.original_content,
            "normalized_content": self.normalized_content,
            "text_hash": str(self.text_hash),
            "language": self.language,
            "word_count": self.word_count,
            "character_count": self.character_count,
            "keywords": self.keywords,
            "source_url": self.source_url,
            "created_at": self.created_at.isoformat(),
            "preview": self.get_preview(),
            "metadata": self.metadata
        }
    
    def __str__(self) -> str:
        """String representation."""
        return f"Text({self.get_preview(50)})"
    
    def __eq__(self, other: Any) -> bool:
        """Compare Text entities by hash."""
        if isinstance(other, Text):
            return self.text_hash == other.text_hash
        return False
    
    def __hash__(self) -> int:
        """Make Text hashable using text_hash."""
        return hash(self.text_hash.value)
