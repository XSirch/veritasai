"""Domain entities for VeritasAI."""

from .text import Text
from .classification import Classification, ClassificationType
from .analysis_result import AnalysisResult, AnalysisSource
from .user import User, AnalysisMode, UITheme

__all__ = [
    "Text",
    "Classification",
    "ClassificationType",
    "AnalysisResult",
    "AnalysisSource",
    "User",
    "AnalysisMode",
    "UITheme"
]
