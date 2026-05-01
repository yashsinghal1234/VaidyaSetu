"""
FHIRBridge MCP — FHIR HTTP Client
Handles auth, retries, pagination, and base FHIR resource fetching.
"""
import httpx
import time
from typing import Any, Optional
from cachetools import TTLCache
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from config import get_settings

settings = get_settings()

# ── In-memory cache keyed by URL ─────────────────────────────────────────────
_cache: TTLCache = TTLCache(maxsize=512, ttl=settings.cache_ttl)

# ── SMART token state ─────────────────────────────────────────────────────────
_smart_token: Optional[str] = None
_smart_token_expiry: float = 0.0


def _get_smart_token() -> str:
    """Fetch/refresh SMART on FHIR client-credentials token."""
    global _smart_token, _smart_token_expiry
    if _smart_token and time.time() < _smart_token_expiry - 30:
        return _smart_token
    resp = httpx.post(
        settings.smart_token_url,
        data={
            "grant_type": "client_credentials",
            "client_id": settings.smart_client_id,
            "client_secret": settings.smart_client_secret,
        },
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    _smart_token = data["access_token"]
    _smart_token_expiry = time.time() + data.get("expires_in", 3600)
    return _smart_token


def _build_headers() -> dict[str, str]:
    headers = {"Accept": "application/fhir+json", "Content-Type": "application/fhir+json"}
    auth = settings.fhir_auth_type.lower()
    if auth == "bearer":
        headers["Authorization"] = f"Bearer {settings.fhir_bearer_token}"
    elif auth == "smart":
        headers["Authorization"] = f"Bearer {_get_smart_token()}"
    return headers


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.ConnectError)),
    reraise=True,
)
def _raw_get(url: str, params: dict | None = None) -> dict:
    """Single GET request with retry logic."""
    key = f"{url}?{params}"
    if key in _cache:
        return _cache[key]

    with httpx.Client(timeout=30) as client:
        resp = client.get(url, headers=_build_headers(), params=params)
        resp.raise_for_status()
        data = resp.json()
        _cache[key] = data
        return data


# ── Public FHIR helpers ───────────────────────────────────────────────────────

def fhir_get(resource_type: str, resource_id: str) -> dict:
    """Fetch a single FHIR resource by type and id."""
    url = f"{settings.fhir_base_url}/{resource_type}/{resource_id}"
    return _raw_get(url)


def fhir_search(resource_type: str, params: dict) -> list[dict]:
    """
    Search FHIR resources. Handles Bundle pagination and returns
    a flat list of all matching resource entries.
    """
    url = f"{settings.fhir_base_url}/{resource_type}"
    resources: list[dict] = []
    page_params = {**params, "_count": params.get("_count", 50)}

    while url:
        bundle = _raw_get(url, page_params if url == f"{settings.fhir_base_url}/{resource_type}" else None)
        for entry in bundle.get("entry", []):
            resources.append(entry.get("resource", {}))

        # Follow 'next' link for pagination
        url = None
        for link in bundle.get("link", []):
            if link.get("relation") == "next":
                url = link["url"]
                page_params = None  # URL already has params encoded
                break

    return resources


def fhir_search_bundle(resource_type: str, params: dict) -> dict:
    """Return the raw Bundle (first page) for callers that need metadata."""
    url = f"{settings.fhir_base_url}/{resource_type}"
    return _raw_get(url, params)
