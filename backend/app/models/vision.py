from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
from enum import Enum


class OutputTarget(str, Enum):
    """Target platform for the generated prompt."""
    VERCEL_V0 = "vercel_v0"
    CLAUDE_CODE = "claude_code"
    CURSOR = "cursor"
    GENERIC = "generic"


class DesignAnalysis(BaseModel):
    """Detailed analysis of a design's visual elements."""

    # Layout Analysis
    layout_type: str = Field(description="Type of layout (grid, flex, single-column, etc.)")
    container_specs: str = Field(description="Container specifications (max-width, padding, etc.)")
    grid_config: Optional[str] = Field(default=None, description="Grid configuration if applicable")
    spacing_system: str = Field(description="Spacing values and patterns used")

    # Typography Analysis
    typography: Dict[str, Any] = Field(
        description="Typography breakdown including headings, body, etc."
    )

    # Color Palette
    colors: Dict[str, str] = Field(
        description="Color palette with hex values"
    )

    # Components Detected
    components: List[str] = Field(
        description="List of UI components identified"
    )

    # Design Patterns
    design_patterns: List[str] = Field(
        description="Design patterns detected (glassmorphism, neumorphism, etc.)"
    )

    # Interactions (implied)
    interactions: List[str] = Field(
        default_factory=list,
        description="Implied interactions and animations"
    )


class PromptPackage(BaseModel):
    """The complete prompt package for recreating a design."""

    # Recommended Setup
    recommended_platform: OutputTarget
    recommended_model: str
    temperature: float = Field(default=0.3)
    max_tokens: int = Field(default=4096)

    # Multi-step Prompts
    foundation_prompt: str = Field(
        description="Primary prompt for initial generation"
    )
    refinement_prompt: Optional[str] = Field(
        default=None,
        description="Follow-up prompt for adjustments"
    )
    interaction_prompt: Optional[str] = Field(
        default=None,
        description="Prompt for adding animations/interactions"
    )

    # Context Documentation
    design_pattern_name: str = Field(
        description="Name of the design pattern"
    )
    similar_examples: List[str] = Field(
        default_factory=list,
        description="Links or references to similar designs"
    )
    common_pitfalls: List[str] = Field(
        default_factory=list,
        description="Common AI mistakes to avoid"
    )
    framework_notes: str = Field(
        default="",
        description="Framework-specific notes and compatibility"
    )


class ImageToPromptRequest(BaseModel):
    """Request for translating an image to a prompt."""

    image_base64: str = Field(
        description="Base64 encoded image data (with or without data URI prefix)"
    )
    image_type: Literal["png", "jpg", "jpeg", "webp", "gif"] = Field(
        default="png",
        description="Image format type"
    )
    target_platform: OutputTarget = Field(
        default=OutputTarget.GENERIC,
        description="Target platform for generated prompt"
    )
    framework: Literal["react", "vue", "svelte", "html"] = Field(
        default="react",
        description="Target framework for code generation"
    )
    styling: Literal["tailwind", "css", "styled-components", "scss"] = Field(
        default="tailwind",
        description="Styling approach for generated code"
    )
    include_interactions: bool = Field(
        default=True,
        description="Whether to include interaction/animation prompts"
    )
    detail_level: Literal["basic", "detailed", "comprehensive"] = Field(
        default="detailed",
        description="Level of detail in the analysis"
    )


class ImageToPromptResponse(BaseModel):
    """Response containing the translated prompt package."""

    success: bool
    analysis: DesignAnalysis = Field(
        description="Detailed visual analysis of the design"
    )
    prompt_package: PromptPackage = Field(
        description="Complete prompt package for recreation"
    )
    raw_markdown: str = Field(
        description="Full prompt package as copyable markdown"
    )
    usage: Dict[str, int] = Field(
        description="Token usage information"
    )


class AnalyzeDesignRequest(BaseModel):
    """Request for just analyzing a design without prompt generation."""

    image_base64: str = Field(
        description="Base64 encoded image data"
    )
    image_type: Literal["png", "jpg", "jpeg", "webp", "gif"] = Field(
        default="png"
    )


class AnalyzeDesignResponse(BaseModel):
    """Response containing only the design analysis."""

    success: bool
    analysis: DesignAnalysis
    usage: Dict[str, int]


class SavedDesign(BaseModel):
    """A saved design reference in the inspiration library."""

    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    thumbnail_url: str
    analysis: DesignAnalysis
    prompt_package: Optional[PromptPackage] = None
    tags: List[str] = Field(default_factory=list)
    source_url: Optional[str] = None
    created_at: str
    updated_at: str


class SaveDesignRequest(BaseModel):
    """Request to save a design to the inspiration library."""

    name: str
    description: Optional[str] = None
    image_base64: str
    image_type: Literal["png", "jpg", "jpeg", "webp", "gif"] = "png"
    tags: List[str] = Field(default_factory=list)
    source_url: Optional[str] = None
    auto_analyze: bool = Field(
        default=True,
        description="Automatically analyze the design on save"
    )
