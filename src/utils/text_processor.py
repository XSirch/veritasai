"""
TextProcessor utility for VeritasAI.
Provides text normalization, validation, and processing functionality.
"""

import hashlib
import re
import unicodedata
from typing import List, Optional, Tuple, Dict, Any


class TextProcessor:
    """
    Utility class for text processing and normalization.
    
    Provides methods for normalizing text content, generating consistent hashes,
    validating text length, and extracting sentences for fact-checking analysis.
    """
    
    # Constants for text validation
    MIN_TEXT_LENGTH = 10
    MAX_TEXT_LENGTH = 2000
    MIN_SENTENCE_LENGTH = 10
    
    # Regex patterns for text processing
    CONTROL_CHARS_PATTERN = re.compile(r'[\u0000-\u001F\u007F-\u009F]')
    WHITESPACE_PATTERN = re.compile(r'\s+')
    PUNCTUATION_CLEANUP_PATTERN = re.compile(r'[.,;:!?]{2,}')
    QUOTE_NORMALIZATION_PATTERNS = [
        (re.compile(r'["""]'), '"'),
        (re.compile(r"[''']"), "'")
    ]
    SENTENCE_SPLIT_PATTERN = re.compile(r'[.!?]+')
    
    @classmethod
    def normalize(cls, text: str, for_hashing: bool = False) -> str:
        """
        Normalize text content for consistent processing.
        
        Args:
            text: Raw text content to normalize
            for_hashing: If True, applies additional normalization for hash generation
            
        Returns:
            Normalized text string
            
        Raises:
            ValueError: If text is empty or None
        """
        if not text or not isinstance(text, str):
            raise ValueError("Text must be a non-empty string")
        
        # Step 1: Remove control characters but preserve basic whitespace
        # Convert tabs and newlines to spaces first
        normalized = text.replace('\t', ' ').replace('\n', ' ').replace('\r', ' ')
        # Then remove other control characters
        normalized = cls.CONTROL_CHARS_PATTERN.sub('', normalized)
        
        # Step 2: Normalize whitespace (multiple spaces -> single space)
        normalized = cls.WHITESPACE_PATTERN.sub(' ', normalized)
        
        # Step 3: Normalize Unicode (NFD -> NFC)
        normalized = unicodedata.normalize('NFC', normalized)
        
        # Step 4: Trim leading/trailing whitespace
        normalized = normalized.strip()
        
        # Step 5: Additional normalization for hashing
        if for_hashing:
            # Convert to lowercase for case-insensitive comparison
            normalized = normalized.lower()
            
            # Clean up redundant punctuation
            normalized = cls.PUNCTUATION_CLEANUP_PATTERN.sub(
                lambda match: match.group(0)[0], normalized
            )
            
            # Normalize quotes
            for pattern, replacement in cls.QUOTE_NORMALIZATION_PATTERNS:
                normalized = pattern.sub(replacement, normalized)
        
        return normalized
    
    @classmethod
    def generate_hash(cls, text: str) -> str:
        """
        Generate SHA-256 hash for normalized text.
        
        Args:
            text: Text content to hash
            
        Returns:
            64-character hexadecimal hash string
            
        Raises:
            ValueError: If text is empty or None
        """
        if not text or not isinstance(text, str):
            raise ValueError("Text must be a non-empty string")
        
        # Normalize text for consistent hashing
        normalized = cls.normalize(text, for_hashing=True)
        
        # Generate SHA-256 hash
        hash_bytes = hashlib.sha256(normalized.encode('utf-8'))
        return hash_bytes.hexdigest()
    
    @classmethod
    def is_valid_length(cls, text: str) -> bool:
        """
        Check if text length is within valid range.
        
        Args:
            text: Text to validate
            
        Returns:
            True if text length is valid (10-2000 characters)
        """
        if not text or not isinstance(text, str):
            return False
        
        cleaned = text.strip()
        return cls.MIN_TEXT_LENGTH <= len(cleaned) <= cls.MAX_TEXT_LENGTH
    
    @classmethod
    def validate_text(cls, text: str) -> Tuple[bool, Optional[str]]:
        """
        Validate text content and return validation result.
        
        Args:
            text: Text to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        if not text or not isinstance(text, str):
            return False, "Text must be a non-empty string"
        
        cleaned = text.strip()
        
        if len(cleaned) < cls.MIN_TEXT_LENGTH:
            return False, f"Text must be at least {cls.MIN_TEXT_LENGTH} characters long"
        
        if len(cleaned) > cls.MAX_TEXT_LENGTH:
            return False, f"Text cannot exceed {cls.MAX_TEXT_LENGTH} characters"
        
        # Check for meaningful content (not just whitespace/punctuation)
        content_chars = re.sub(r'[\s\W]', '', cleaned)
        if len(content_chars) < 5:
            return False, "Text must contain meaningful content"
        
        return True, None
    
    @classmethod
    def extract_sentences(cls, text: str, min_length: Optional[int] = None) -> List[str]:
        """
        Extract sentences from text content.
        
        Args:
            text: Text to extract sentences from
            min_length: Minimum sentence length (default: MIN_SENTENCE_LENGTH)
            
        Returns:
            List of extracted sentences
        """
        if not text or not isinstance(text, str):
            return []
        
        if min_length is None:
            min_length = cls.MIN_SENTENCE_LENGTH
        
        # Normalize text first
        normalized = cls.normalize(text)
        
        # Split into sentences using punctuation
        sentences = cls.SENTENCE_SPLIT_PATTERN.split(normalized)
        
        # Clean and filter sentences
        cleaned_sentences = []
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) >= min_length:
                cleaned_sentences.append(sentence)
        
        return cleaned_sentences
    
    @classmethod
    def get_text_stats(cls, text: str) -> Dict[str, Any]:
        """
        Get comprehensive statistics about text content.
        
        Args:
            text: Text to analyze
            
        Returns:
            Dictionary with text statistics
        """
        if not text or not isinstance(text, str):
            return {
                "character_count": 0,
                "word_count": 0,
                "sentence_count": 0,
                "is_valid_length": False,
                "normalized_length": 0,
                "hash": None
            }
        
        normalized = cls.normalize(text)
        sentences = cls.extract_sentences(text)
        
        return {
            "character_count": len(text),
            "word_count": len(normalized.split()) if normalized else 0,
            "sentence_count": len(sentences),
            "is_valid_length": cls.is_valid_length(text),
            "normalized_length": len(normalized),
            "hash": cls.generate_hash(text) if text.strip() else None,
            "has_meaningful_content": bool(re.sub(r'[\s\W]', '', text.strip()))
        }
    
    @classmethod
    def clean_for_analysis(cls, text: str) -> str:
        """
        Clean text specifically for fact-checking analysis.
        
        This method applies more aggressive cleaning for analysis purposes
        while preserving the original meaning.
        
        Args:
            text: Text to clean
            
        Returns:
            Cleaned text ready for analysis
        """
        if not text or not isinstance(text, str):
            return ""
        
        # Start with basic normalization
        cleaned = cls.normalize(text)
        
        # Remove excessive punctuation but preserve sentence structure
        cleaned = re.sub(r'[^\w\s.,!?;:-]', '', cleaned)
        
        # Normalize multiple punctuation marks
        cleaned = re.sub(r'([.!?]){2,}', r'\1', cleaned)
        cleaned = re.sub(r'([,;:]){2,}', r'\1', cleaned)
        
        # Clean up spacing around punctuation
        cleaned = re.sub(r'\s+([.!?,:;])', r'\1', cleaned)
        cleaned = re.sub(r'([.!?])\s*([A-Z])', r'\1 \2', cleaned)
        
        # Final whitespace cleanup
        cleaned = cls.WHITESPACE_PATTERN.sub(' ', cleaned).strip()
        
        return cleaned
    
    @classmethod
    def extract_keywords_basic(cls, text: str, max_keywords: int = 20) -> List[str]:
        """
        Extract basic keywords from text (simple word frequency approach).
        
        Args:
            text: Text to extract keywords from
            max_keywords: Maximum number of keywords to return
            
        Returns:
            List of keywords sorted by relevance
        """
        if not text or not isinstance(text, str):
            return []
        
        # Clean text for keyword extraction
        cleaned = cls.clean_for_analysis(text)
        
        # Convert to lowercase and split into words
        words = cleaned.lower().split()
        
        # Filter out common stop words (basic list)
        stop_words = {
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
            'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
            'to', 'was', 'will', 'with', 'this', 'these', 'those', 'they',
            'o', 'a', 'e', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das',
            'em', 'no', 'na', 'nos', 'nas', 'para', 'por', 'com', 'sem', 'que',
            'se', 'não', 'mais', 'muito'
        }
        
        # Count word frequencies
        word_freq = {}
        for word in words:
            # Clean punctuation from word
            clean_word = re.sub(r'[^\w]', '', word)
            # Only consider words with 3+ characters
            if len(clean_word) >= 3 and clean_word not in stop_words:
                word_freq[clean_word] = word_freq.get(clean_word, 0) + 1
        
        # Sort by frequency and return top keywords
        sorted_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
        keywords = [word for word, freq in sorted_words[:max_keywords]]
        
        return keywords
    
    @classmethod
    def similarity_score(cls, text1: str, text2: str) -> float:
        """
        Calculate simple similarity score between two texts.
        
        Args:
            text1: First text
            text2: Second text
            
        Returns:
            Similarity score between 0.0 and 1.0
        """
        if not text1 or not text2:
            return 0.0
        
        # Normalize both texts
        norm1 = cls.normalize(text1, for_hashing=True)
        norm2 = cls.normalize(text2, for_hashing=True)
        
        # If texts are identical after normalization
        if norm1 == norm2:
            return 1.0
        
        # Simple word-based similarity (Jaccard similarity)
        words1 = set(norm1.split())
        words2 = set(norm2.split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = len(words1.intersection(words2))
        union = len(words1.union(words2))
        
        return intersection / union if union > 0 else 0.0
