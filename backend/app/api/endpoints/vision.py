from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Literal
import logging

from app.services.vision.vision_service import VisionService, get_vision_service
from app.models.vision import (
    ImageToPromptRequest,
    ImageToPromptResponse,
    AnalyzeDesignRequest,
    AnalyzeDesignResponse,
    DesignAnalysis,
    OutputTarget,
)
from app.services.supabase.auth import SupabaseAuthService, get_auth_service
from app.core.config import settings

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)


@router.post("/translate", response_model=ImageToPromptResponse)
async def translate_image_to_prompt(
    request: ImageToPromptRequest,
    provider: Literal["anthropic", "openai"] = "anthropic",
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: SupabaseAuthService = Depends(get_auth_service),
):
    """
    Translate a design image into a comprehensive prompt package.

    This endpoint analyzes the uploaded design image and generates:
    - Detailed visual analysis (layout, typography, colors, components)
    - Multi-step prompt package for recreating the design
    - Copyable markdown format for easy use

    The generated prompts are optimized for the specified target platform
    (Vercel v0, Claude Code, Cursor, or generic AI assistants).
    """
    try:
        # Validate user authentication
        try:
            user = await auth_service.get_user(credentials.credentials)
            logger.info(f"User authenticated for vision translate: {user.email if hasattr(user, 'email') else 'Unknown'}")
        except Exception as auth_error:
            logger.error(f"Authentication error: {str(auth_error)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(auth_error)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Validate image data
        if not request.image_base64:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image data is required",
            )

        # Check base64 size (rough estimate: 10MB limit)
        base64_size = len(request.image_base64)
        if base64_size > 15_000_000:  # ~10MB after base64 encoding
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image too large. Maximum size is approximately 10MB.",
            )

        # Get the vision service
        try:
            vision_service = get_vision_service(provider)
            logger.info(f"Using vision provider: {provider}")
        except ValueError as provider_error:
            logger.error(f"Provider error: {str(provider_error)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(provider_error),
            )

        # Check API key configuration
        if provider == "anthropic" and not settings.ANTHROPIC_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Anthropic API key not configured. Please set the ANTHROPIC_API_KEY environment variable.",
            )
        elif provider == "openai" and not settings.OPENAI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OpenAI API key not configured. Please set the OPENAI_API_KEY environment variable.",
            )

        # Perform the analysis and translation
        try:
            logger.info(f"Starting vision analysis - target: {request.target_platform}, framework: {request.framework}")
            result = await vision_service.analyze_and_translate(request)
            logger.info(f"Vision analysis complete - tokens used: {result.usage.get('total_tokens', 'N/A')}")

            return ImageToPromptResponse(
                success=True,
                analysis=result.analysis,
                prompt_package=result.prompt_package,
                raw_markdown=result.raw_markdown,
                usage=result.usage,
            )

        except Exception as analysis_error:
            logger.error(f"Vision analysis error: {str(analysis_error)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Vision analysis failed: {str(analysis_error)}",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in vision translate: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.post("/analyze", response_model=AnalyzeDesignResponse)
async def analyze_design(
    request: AnalyzeDesignRequest,
    provider: Literal["anthropic", "openai"] = "anthropic",
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: SupabaseAuthService = Depends(get_auth_service),
):
    """
    Analyze a design image without generating prompts.

    This is a lighter-weight endpoint that only extracts design analysis
    (layout, colors, typography, components) without generating the full
    prompt package. Useful for quick previews or when you only need
    the design specifications.
    """
    try:
        # Validate user authentication
        try:
            user = await auth_service.get_user(credentials.credentials)
            logger.info(f"User authenticated for design analysis: {user.email if hasattr(user, 'email') else 'Unknown'}")
        except Exception as auth_error:
            logger.error(f"Authentication error: {str(auth_error)}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Authentication failed: {str(auth_error)}",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Convert to full request for the service
        full_request = ImageToPromptRequest(
            image_base64=request.image_base64,
            image_type=request.image_type,
            target_platform=OutputTarget.GENERIC,
            framework="react",
            styling="tailwind",
            include_interactions=False,
            detail_level="basic",  # Use basic for faster analysis
        )

        # Get the vision service
        try:
            vision_service = get_vision_service(provider)
        except ValueError as provider_error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(provider_error),
            )

        # Perform analysis
        result = await vision_service.analyze_and_translate(full_request)

        return AnalyzeDesignResponse(
            success=True,
            analysis=result.analysis,
            usage=result.usage,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in design analysis: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error: {str(e)}",
        )


@router.get("/platforms")
async def get_supported_platforms():
    """
    Get list of supported output platforms and their configurations.
    """
    return {
        "platforms": [
            {
                "id": "vercel_v0",
                "name": "Vercel v0",
                "description": "Optimized for v0.dev generative UI",
                "recommended_model": "claude-sonnet-4-5-20250929",
                "features": ["React", "Tailwind CSS", "shadcn/ui"],
            },
            {
                "id": "claude_code",
                "name": "Claude Code",
                "description": "Optimized for Claude Code assistant",
                "recommended_model": "claude-sonnet-4-5-20250929",
                "features": ["Full codebase context", "File operations", "Multi-file generation"],
            },
            {
                "id": "cursor",
                "name": "Cursor",
                "description": "Optimized for Cursor AI IDE",
                "recommended_model": "claude-sonnet-4-5-20250929",
                "features": ["Inline editing", "Chat-based generation", "Codebase awareness"],
            },
            {
                "id": "generic",
                "name": "Generic",
                "description": "Works with any AI coding assistant",
                "recommended_model": "claude-sonnet-4-5-20250929",
                "features": ["Universal prompts", "Framework-agnostic"],
            },
        ],
        "frameworks": ["react", "vue", "svelte", "html"],
        "styling": ["tailwind", "css", "styled-components", "scss"],
        "detail_levels": [
            {"id": "basic", "tokens": "~2000", "description": "Quick analysis"},
            {"id": "detailed", "tokens": "~4000", "description": "Standard analysis"},
            {"id": "comprehensive", "tokens": "~8000", "description": "Deep analysis with all details"},
        ],
    }
