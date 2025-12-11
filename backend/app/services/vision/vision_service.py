from abc import ABC, abstractmethod
import base64
import json
import re
from typing import Dict, Any, Optional
from functools import lru_cache

import anthropic
import openai
from pydantic import BaseModel

from app.core.config import settings
from app.models.vision import (
    DesignAnalysis,
    PromptPackage,
    OutputTarget,
    ImageToPromptRequest,
    ImageToPromptResponse,
)


class VisionResponse(BaseModel):
    """Response from vision analysis."""

    analysis: DesignAnalysis
    prompt_package: PromptPackage
    raw_markdown: str
    usage: Dict[str, int]


class VisionService(ABC):
    """Abstract base class for vision analysis services."""

    @abstractmethod
    async def analyze_and_translate(
        self, request: ImageToPromptRequest
    ) -> VisionResponse:
        """Analyze an image and generate a prompt package."""
        pass

    def _build_analysis_prompt(self, request: ImageToPromptRequest) -> str:
        """Build the system prompt for design analysis."""
        return f"""You are Designr Labs' Visual-to-Prompt Translation Engine - an expert at analyzing UI/UX designs and generating precise, actionable prompts for AI code generation tools.

Your task is to analyze the provided design image and output a comprehensive prompt package that another AI can use to recreate it exactly.

## Analysis Requirements

Analyze the design for:

1. **LAYOUT STRUCTURE**
   - Container type and max-width
   - Grid system (columns, gaps, responsive breakpoints)
   - Spacing patterns (padding, margins, vertical rhythm)
   - Hierarchy and visual flow

2. **TYPOGRAPHY**
   - Font families (identify or suggest closest match)
   - Font weights and sizes for each text level
   - Line heights and letter spacing
   - Text colors and contrast

3. **COLOR PALETTE**
   - Primary, secondary, accent colors (exact hex codes)
   - Background colors and gradients
   - Border colors and opacity values
   - Shadows and depth

4. **COMPONENTS**
   - Identify all UI components (buttons, cards, inputs, navbars, etc.)
   - Component variants and states
   - Icons and imagery patterns

5. **DESIGN PATTERNS**
   - Name the overall design pattern (e.g., "Bento grid", "Hero section", "Pricing cards")
   - Identify specific techniques (glassmorphism, neumorphism, gradients, etc.)

6. **INTERACTIONS (INFERRED)**
   - Hover states
   - Transitions and animations
   - Micro-interactions

## Output Format

You MUST respond with valid JSON in this exact structure:

{{
  "analysis": {{
    "layout_type": "string describing layout type",
    "container_specs": "Tailwind/CSS classes for container",
    "grid_config": "Grid configuration or null",
    "spacing_system": "Spacing values used",
    "typography": {{
      "heading1": {{ "classes": "text-4xl font-bold", "color": "#hex" }},
      "heading2": {{ "classes": "text-2xl font-semibold", "color": "#hex" }},
      "body": {{ "classes": "text-base", "color": "#hex" }},
      "small": {{ "classes": "text-sm", "color": "#hex" }}
    }},
    "colors": {{
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex",
      "surface": "#hex",
      "text_primary": "#hex",
      "text_secondary": "#hex",
      "border": "#hex"
    }},
    "components": ["list", "of", "components", "detected"],
    "design_patterns": ["list", "of", "patterns"],
    "interactions": ["list", "of", "inferred", "interactions"]
  }},
  "prompt_package": {{
    "recommended_platform": "{request.target_platform.value}",
    "recommended_model": "claude-sonnet-4-5-20250929",
    "temperature": 0.3,
    "max_tokens": 4096,
    "foundation_prompt": "The complete, detailed prompt for recreating this design...",
    "refinement_prompt": "Follow-up prompt for fine-tuning...",
    "interaction_prompt": "Prompt for adding animations and interactions...",
    "design_pattern_name": "Name of the overall pattern",
    "similar_examples": ["Reference links or descriptions"],
    "common_pitfalls": ["Common AI mistakes to avoid"],
    "framework_notes": "Notes about framework compatibility"
  }}
}}

## Prompt Generation Guidelines

Target framework: {request.framework}
Target styling: {request.styling}
Detail level: {request.detail_level}
Include interactions: {request.include_interactions}

When generating the foundation_prompt:
1. Start with a clear component description
2. Use EXACT {request.styling} classes (e.g., for Tailwind: "max-w-6xl mx-auto px-6")
3. Specify exact pixel/rem values where Tailwind classes don't exist
4. Include responsive breakpoints (sm:, md:, lg:, xl:)
5. Define each component with precise specifications
6. Include color values as both hex AND closest {request.styling} classes

The prompt should be so detailed that an AI could recreate the design pixel-perfectly without seeing the original image.

IMPORTANT: Respond ONLY with the JSON object, no markdown code blocks or additional text."""

    def _build_image_content(self, request: ImageToPromptRequest) -> Dict[str, Any]:
        """Build the image content for the API call."""
        # Clean base64 string - remove data URI prefix if present
        image_data = request.image_base64
        if "," in image_data:
            image_data = image_data.split(",")[1]

        media_type_map = {
            "png": "image/png",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "webp": "image/webp",
            "gif": "image/gif",
        }
        media_type = media_type_map.get(request.image_type, "image/png")

        return {
            "type": "image",
            "source": {
                "type": "base64",
                "media_type": media_type,
                "data": image_data,
            },
        }

    def _parse_response(self, text: str, request: ImageToPromptRequest) -> VisionResponse:
        """Parse the LLM response into structured data."""
        # Try to extract JSON from the response
        try:
            # First try direct JSON parse
            data = json.loads(text)
        except json.JSONDecodeError:
            # Try to find JSON in the response
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                try:
                    data = json.loads(json_match.group())
                except json.JSONDecodeError:
                    # Return fallback response
                    return self._create_fallback_response(text, request)
            else:
                return self._create_fallback_response(text, request)

        # Parse analysis
        analysis_data = data.get("analysis", {})
        analysis = DesignAnalysis(
            layout_type=analysis_data.get("layout_type", "unknown"),
            container_specs=analysis_data.get("container_specs", "max-w-6xl mx-auto px-4"),
            grid_config=analysis_data.get("grid_config"),
            spacing_system=analysis_data.get("spacing_system", "standard"),
            typography=analysis_data.get("typography", {}),
            colors=analysis_data.get("colors", {}),
            components=analysis_data.get("components", []),
            design_patterns=analysis_data.get("design_patterns", []),
            interactions=analysis_data.get("interactions", []),
        )

        # Parse prompt package
        package_data = data.get("prompt_package", {})

        # Map platform string to enum
        platform_str = package_data.get("recommended_platform", request.target_platform.value)
        try:
            platform = OutputTarget(platform_str)
        except ValueError:
            platform = request.target_platform

        prompt_package = PromptPackage(
            recommended_platform=platform,
            recommended_model=package_data.get("recommended_model", "claude-sonnet-4-5-20250929"),
            temperature=package_data.get("temperature", 0.3),
            max_tokens=package_data.get("max_tokens", 4096),
            foundation_prompt=package_data.get("foundation_prompt", ""),
            refinement_prompt=package_data.get("refinement_prompt"),
            interaction_prompt=package_data.get("interaction_prompt") if request.include_interactions else None,
            design_pattern_name=package_data.get("design_pattern_name", "Custom Design"),
            similar_examples=package_data.get("similar_examples", []),
            common_pitfalls=package_data.get("common_pitfalls", []),
            framework_notes=package_data.get("framework_notes", ""),
        )

        # Generate raw markdown
        raw_markdown = self._generate_markdown(analysis, prompt_package)

        return VisionResponse(
            analysis=analysis,
            prompt_package=prompt_package,
            raw_markdown=raw_markdown,
            usage={},  # Will be populated by subclass
        )

    def _create_fallback_response(self, text: str, request: ImageToPromptRequest) -> VisionResponse:
        """Create a fallback response when parsing fails."""
        analysis = DesignAnalysis(
            layout_type="unknown",
            container_specs="max-w-6xl mx-auto px-4",
            grid_config=None,
            spacing_system="standard",
            typography={},
            colors={},
            components=[],
            design_patterns=[],
            interactions=[],
        )

        prompt_package = PromptPackage(
            recommended_platform=request.target_platform,
            recommended_model="claude-sonnet-4-5-20250929",
            temperature=0.3,
            max_tokens=4096,
            foundation_prompt=text,  # Use raw response as the prompt
            refinement_prompt=None,
            interaction_prompt=None,
            design_pattern_name="Custom Design",
            similar_examples=[],
            common_pitfalls=["Response parsing failed - manual review recommended"],
            framework_notes="",
        )

        return VisionResponse(
            analysis=analysis,
            prompt_package=prompt_package,
            raw_markdown=self._generate_markdown(analysis, prompt_package),
            usage={},
        )

    def _generate_markdown(self, analysis: DesignAnalysis, package: PromptPackage) -> str:
        """Generate copyable markdown from the prompt package."""
        platform_names = {
            OutputTarget.VERCEL_V0: "Vercel v0",
            OutputTarget.CLAUDE_CODE: "Claude Code",
            OutputTarget.CURSOR: "Cursor",
            OutputTarget.GENERIC: "Any AI Coding Assistant",
        }

        md = f"""# Design Recreation Prompt

## Design Analysis

**Pattern:** {package.design_pattern_name}
**Layout:** {analysis.layout_type}
**Components:** {', '.join(analysis.components) if analysis.components else 'N/A'}
**Design Patterns:** {', '.join(analysis.design_patterns) if analysis.design_patterns else 'N/A'}

### Color Palette
"""
        for name, color in analysis.colors.items():
            md += f"- **{name.replace('_', ' ').title()}:** `{color}`\n"

        md += f"""
---

## Recommended Setup

- **Platform:** {platform_names.get(package.recommended_platform, 'Generic')}
- **Model:** `{package.recommended_model}`
- **Temperature:** {package.temperature} (precise, deterministic)
- **Max Tokens:** {package.max_tokens}

---

## Step 1: Foundation Prompt

Copy and paste this prompt to generate the initial component:

```
{package.foundation_prompt}
```
"""

        if package.refinement_prompt:
            md += f"""
---

## Step 2: Refinement Prompt

If the output needs adjustments, use this follow-up prompt:

```
{package.refinement_prompt}
```
"""

        if package.interaction_prompt:
            md += f"""
---

## Step 3: Interaction Prompt

Add animations and interactions with this prompt:

```
{package.interaction_prompt}
```
"""

        if package.common_pitfalls:
            md += """
---

## Common Pitfalls to Avoid

"""
            for pitfall in package.common_pitfalls:
                md += f"- {pitfall}\n"

        if package.framework_notes:
            md += f"""
---

## Framework Notes

{package.framework_notes}
"""

        return md


class AnthropicVisionService(VisionService):
    """Anthropic Claude implementation of the vision service."""

    def __init__(self, api_key: str):
        """Initialize the Anthropic client."""
        self.client = anthropic.AsyncAnthropic(api_key=api_key)

    async def analyze_and_translate(
        self, request: ImageToPromptRequest
    ) -> VisionResponse:
        """Analyze an image and generate a prompt package using Claude Vision."""

        system_prompt = self._build_analysis_prompt(request)
        image_content = self._build_image_content(request)

        # Select model based on detail level
        model_map = {
            "basic": "claude-sonnet-4-5-20250929",
            "detailed": "claude-sonnet-4-5-20250929",
            "comprehensive": "claude-sonnet-4-5-20250929",
        }
        model = model_map.get(request.detail_level, "claude-sonnet-4-5-20250929")

        # Adjust max tokens based on detail level
        max_tokens_map = {
            "basic": 2000,
            "detailed": 4000,
            "comprehensive": 8000,
        }
        max_tokens = max_tokens_map.get(request.detail_level, 4000)

        response = await self.client.messages.create(
            model=model,
            max_tokens=max_tokens,
            messages=[
                {
                    "role": "user",
                    "content": [
                        image_content,
                        {
                            "type": "text",
                            "text": system_prompt,
                        },
                    ],
                }
            ],
        )

        # Parse the response
        result = self._parse_response(response.content[0].text, request)

        # Update usage
        result.usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "total_tokens": response.usage.input_tokens + response.usage.output_tokens,
        }

        return result


class OpenAIVisionService(VisionService):
    """OpenAI GPT-4 Vision implementation of the vision service."""

    def __init__(self, api_key: str):
        """Initialize the OpenAI client."""
        self.client = openai.AsyncOpenAI(api_key=api_key)

    async def analyze_and_translate(
        self, request: ImageToPromptRequest
    ) -> VisionResponse:
        """Analyze an image and generate a prompt package using GPT-4 Vision."""

        system_prompt = self._build_analysis_prompt(request)

        # Clean base64 and build data URL
        image_data = request.image_base64
        if "," in image_data:
            image_data = image_data.split(",")[1]

        media_type_map = {
            "png": "image/png",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "webp": "image/webp",
            "gif": "image/gif",
        }
        media_type = media_type_map.get(request.image_type, "image/png")
        data_url = f"data:{media_type};base64,{image_data}"

        response = await self.client.chat.completions.create(
            model="gpt-4o",
            max_tokens=4000,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url, "detail": "high"},
                        },
                        {
                            "type": "text",
                            "text": system_prompt,
                        },
                    ],
                }
            ],
        )

        # Parse the response
        result = self._parse_response(response.choices[0].message.content, request)

        # Update usage
        result.usage = {
            "input_tokens": response.usage.prompt_tokens,
            "output_tokens": response.usage.completion_tokens,
            "total_tokens": response.usage.total_tokens,
        }

        return result


class VisionServiceFactory:
    """Factory for creating vision service instances."""

    @staticmethod
    def get_service(provider: str = "anthropic") -> VisionService:
        """Get a vision service by provider name."""
        if provider == "anthropic":
            if not settings.ANTHROPIC_API_KEY:
                raise ValueError("Anthropic API key not configured")
            return AnthropicVisionService(api_key=settings.ANTHROPIC_API_KEY)
        elif provider == "openai":
            if not settings.OPENAI_API_KEY:
                raise ValueError("OpenAI API key not configured")
            return OpenAIVisionService(api_key=settings.OPENAI_API_KEY)
        else:
            raise ValueError(f"Unsupported vision provider: {provider}")


@lru_cache()
def get_vision_service(provider: str = "anthropic") -> VisionService:
    """Dependency to get a vision service."""
    return VisionServiceFactory.get_service(provider)
