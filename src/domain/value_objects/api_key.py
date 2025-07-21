"""
ApiKey value object for VeritasAI.
Represents encrypted API keys for external services.
"""

import base64
import secrets
from typing import Any, Optional
from pydantic import BaseModel, Field, field_validator


class ApiKey(BaseModel):
    """
    Value object representing an encrypted API key.
    
    Provides secure storage and handling of API keys for external services
    like Google Fact Check API and Groq LLM API.
    """
    
    encrypted_value: str = Field(
        ...,
        description="Base64-encoded encrypted API key",
        min_length=1
    )
    
    service_name: str = Field(
        ...,
        description="Name of the service this API key is for",
        min_length=1,
        max_length=50
    )
    
    is_default: bool = Field(
        default=False,
        description="Whether this is a default API key provided by the app"
    )
    
    @field_validator('service_name')
    @classmethod
    def validate_service_name(cls, v: str) -> str:
        """Validate service name format."""
        allowed_services = {
            "google_fact_check",
            "groq_llm", 
            "openrouter",
            "custom"
        }
        
        if v.lower() not in allowed_services:
            raise ValueError(f"Service name must be one of: {', '.join(allowed_services)}")
        
        return v.lower()
    
    @field_validator('encrypted_value')
    @classmethod
    def validate_encrypted_value(cls, v: str) -> str:
        """Validate that encrypted value is valid base64."""
        try:
            base64.b64decode(v)
        except Exception:
            raise ValueError("Encrypted value must be valid base64")
        return v
    
    @classmethod
    def create(
        cls,
        raw_key: str,
        service_name: str,
        is_default: bool = False,
        encryption_key: Optional[bytes] = None
    ) -> "ApiKey":
        """
        Create an ApiKey from a raw API key string.
        
        Args:
            raw_key: The raw API key string
            service_name: Name of the service
            is_default: Whether this is a default key
            encryption_key: Optional encryption key (generates one if not provided)
            
        Returns:
            ApiKey instance with encrypted value
        """
        if not raw_key or not isinstance(raw_key, str):
            raise ValueError("Raw key must be a non-empty string")
        
        if len(raw_key.strip()) < 8:
            raise ValueError("API key must be at least 8 characters long")
        
        # Simple encryption using XOR with a key (for demo purposes)
        # In production, use proper encryption like Fernet
        if encryption_key is None:
            encryption_key = secrets.token_bytes(32)
        
        encrypted_bytes = cls._simple_encrypt(raw_key.encode('utf-8'), encryption_key)
        encrypted_value = base64.b64encode(encrypted_bytes).decode('utf-8')
        
        return cls(
            encrypted_value=encrypted_value,
            service_name=service_name,
            is_default=is_default
        )
    
    @staticmethod
    def _simple_encrypt(data: bytes, key: bytes) -> bytes:
        """
        Simple XOR encryption (for demo purposes).
        In production, use proper encryption.
        """
        # Repeat key to match data length
        key_repeated = (key * ((len(data) // len(key)) + 1))[:len(data)]
        
        # XOR encryption
        encrypted = bytes(a ^ b for a, b in zip(data, key_repeated))
        
        # Prepend key for decryption (not secure, just for demo)
        return key + encrypted
    
    def decrypt(self) -> str:
        """
        Decrypt the API key (simplified for demo).
        
        Returns:
            Decrypted API key string
            
        Note:
            This is a simplified implementation for demonstration.
            In production, use proper encryption/decryption.
        """
        try:
            encrypted_bytes = base64.b64decode(self.encrypted_value)
            
            # Extract key and encrypted data
            key = encrypted_bytes[:32]
            encrypted_data = encrypted_bytes[32:]
            
            # Decrypt using XOR
            key_repeated = (key * ((len(encrypted_data) // len(key)) + 1))[:len(encrypted_data)]
            decrypted = bytes(a ^ b for a, b in zip(encrypted_data, key_repeated))
            
            return decrypted.decode('utf-8')
        except Exception as e:
            raise ValueError(f"Failed to decrypt API key: {e}")
    
    def is_valid_format(self) -> bool:
        """
        Check if the API key appears to be in a valid format.
        
        Returns:
            True if the key format appears valid
        """
        try:
            decrypted = self.decrypt()
            
            # Basic format validation based on service
            if self.service_name == "google_fact_check":
                return len(decrypted) >= 20 and decrypted.startswith(("AIza", "ya29"))
            elif self.service_name == "groq_llm":
                return len(decrypted) >= 30 and "gsk_" in decrypted
            elif self.service_name == "openrouter":
                return len(decrypted) >= 20
            else:
                return len(decrypted) >= 8
                
        except Exception:
            return False
    
    def mask_for_display(self) -> str:
        """
        Return a masked version of the API key for display purposes.
        
        Returns:
            Masked API key string
        """
        try:
            decrypted = self.decrypt()
            if len(decrypted) <= 8:
                return "*" * len(decrypted)
            else:
                return decrypted[:4] + "*" * (len(decrypted) - 8) + decrypted[-4:]
        except Exception:
            return "***INVALID***"
    
    def __str__(self) -> str:
        """Return masked API key for string representation."""
        return f"{self.service_name}: {self.mask_for_display()}"
    
    def __eq__(self, other: Any) -> bool:
        """Compare ApiKey instances."""
        if isinstance(other, ApiKey):
            return (
                self.encrypted_value == other.encrypted_value and
                self.service_name == other.service_name
            )
        return False
    
    class Config:
        """Pydantic configuration."""
        frozen = True  # Make immutable
