"""
Tests for Designr Labs Vision Translation Engine

Simple, focused tests that verify the core functionality works.
"""

import pytest
from pydantic import ValidationError

from app.models.vision import (
    ImageToPromptRequest,
    ImageToPromptResponse,
    DesignAnalysis,
    PromptPackage,
    OutputTarget,
)


class TestVisionModels:
    """Test vision model validation"""

    def test_image_to_prompt_request_defaults(self):
        """Test that request has sensible defaults"""
        request = ImageToPromptRequest(image_base64="dGVzdA==")

        assert request.image_type == "png"
        assert request.target_platform == OutputTarget.GENERIC
        assert request.framework == "react"
        assert request.styling == "tailwind"
        assert request.include_interactions is True
        assert request.detail_level == "detailed"

    def test_image_to_prompt_request_custom_values(self):
        """Test custom values are accepted"""
        request = ImageToPromptRequest(
            image_base64="dGVzdA==",
            image_type="jpg",
            target_platform=OutputTarget.VERCEL_V0,
            framework="vue",
            styling="css",
            include_interactions=False,
            detail_level="basic",
        )

        assert request.image_type == "jpg"
        assert request.target_platform == OutputTarget.VERCEL_V0
        assert request.framework == "vue"
        assert request.styling == "css"
        assert request.include_interactions is False
        assert request.detail_level == "basic"

    def test_image_to_prompt_request_requires_base64(self):
        """Test that base64 image data is required"""
        with pytest.raises(ValidationError):
            ImageToPromptRequest()

    def test_output_target_enum_values(self):
        """Test all output targets are valid"""
        assert OutputTarget.VERCEL_V0.value == "vercel_v0"
        assert OutputTarget.CLAUDE_CODE.value == "claude_code"
        assert OutputTarget.CURSOR.value == "cursor"
        assert OutputTarget.GENERIC.value == "generic"

    def test_design_analysis_required_fields(self):
        """Test DesignAnalysis requires all fields"""
        analysis = DesignAnalysis(
            layout_type="grid",
            container_specs="max-w-6xl mx-auto",
            spacing_system="8px grid",
            typography={"heading": {"classes": "text-xl", "color": "#000"}},
            colors={"primary": "#6366f1"},
            components=["button", "card"],
            design_patterns=["glassmorphism"],
        )

        assert analysis.layout_type == "grid"
        assert len(analysis.components) == 2
        assert "primary" in analysis.colors

    def test_prompt_package_required_fields(self):
        """Test PromptPackage has all required fields"""
        package = PromptPackage(
            recommended_platform=OutputTarget.GENERIC,
            recommended_model="claude-sonnet-4-5-20250929",
            foundation_prompt="Create a component...",
            design_pattern_name="Hero Section",
        )

        assert package.temperature == 0.3  # default
        assert package.max_tokens == 4096  # default
        assert package.refinement_prompt is None
        assert package.common_pitfalls == []


class TestInputValidation:
    """Test input validation edge cases"""

    def test_valid_image_types(self):
        """Test all valid image types are accepted"""
        for img_type in ["png", "jpg", "jpeg", "webp", "gif"]:
            request = ImageToPromptRequest(
                image_base64="dGVzdA==",
                image_type=img_type,
            )
            assert request.image_type == img_type

    def test_valid_frameworks(self):
        """Test all valid frameworks are accepted"""
        for framework in ["react", "vue", "svelte", "html"]:
            request = ImageToPromptRequest(
                image_base64="dGVzdA==",
                framework=framework,
            )
            assert request.framework == framework

    def test_valid_styling_options(self):
        """Test all valid styling options are accepted"""
        for styling in ["tailwind", "css", "styled-components", "scss"]:
            request = ImageToPromptRequest(
                image_base64="dGVzdA==",
                styling=styling,
            )
            assert request.styling == styling

    def test_valid_detail_levels(self):
        """Test all valid detail levels are accepted"""
        for level in ["basic", "detailed", "comprehensive"]:
            request = ImageToPromptRequest(
                image_base64="dGVzdA==",
                detail_level=level,
            )
            assert request.detail_level == level


class TestSecurityValidation:
    """Security-focused tests"""

    def test_base64_with_data_uri_prefix(self):
        """Test that data URI prefixes don't break parsing"""
        # This should be handled by the service, not the model
        request = ImageToPromptRequest(
            image_base64="data:image/png;base64,dGVzdA=="
        )
        assert "base64" in request.image_base64

    def test_large_base64_string(self):
        """Test that large strings are accepted (actual limit enforced by endpoint)"""
        # 1MB of base64 data
        large_base64 = "A" * (1024 * 1024)
        request = ImageToPromptRequest(image_base64=large_base64)
        assert len(request.image_base64) == 1024 * 1024


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
