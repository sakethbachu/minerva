#!/usr/bin/env python3
"""
Tavily MCP Server
A simple MCP server that wraps Tavily's Python SDK for use with Groq via E2B.
This replicates the Exa MCP pattern but for Tavily.
"""

import json
import os
import sys

from tavily import TavilyClient


def get_ecommerce_domains():
    """Get list of major ecommerce domains."""
    return [
        "amazon.com",
        "amazon.co.uk",
        "amazon.ca",
        "amazon.com.au",
        "ebay.com",
        "walmart.com",
        "target.com",
        "bestbuy.com",
        "costco.com",
        "homedepot.com",
        "lowes.com",
        "macys.com",
        "nordstrom.com",
        "zappos.com",
        "rei.com",
        "adidas.com",
        "nike.com",
        "apple.com",
        "samsung.com",
        "sony.com",
        "bose.com",
        "shopify.com",
        "etsy.com",
        "wayfair.com",
        "overstock.com",
        "newegg.com",
        "bhphotovideo.com",
        "adorama.com",
    ]


def get_exclude_domains():
    """Domains to exclude (reviews, blogs, news)."""
    return [
        "reddit.com",
        "quora.com",
        "medium.com",
        "wikipedia.org",
        "cnn.com",
        "bbc.com",
        "nytimes.com",
        "theverge.com",
        "techcrunch.com",
        "wired.com",
        "cnet.com",
        "pcmag.com",
        "soundguys.com",
        "rtings.com",
        "reviewgeek.com",
        "techradar.com",
    ]


def is_product_page(url: str) -> bool:
    """Check if URL is a product page (not search/category page)."""
    if not url:
        return False
    url_lower = url.lower()

    # Product page patterns
    product_patterns = [
        "/dp/",
        "/gp/product/",
        "/itm/",
        "/p/",
        "/product/",
        "/products/",
        "/item/",
        "/listing/",
        "/ip/",
        "/site/",
        "/buy/",
        "/shop/",
    ]

    # Non-product patterns
    non_product_patterns = [
        "/s?",
        "/s/",
        "/search",
        "/category",
        "/categories",
        "/browse",
        "/c/",
        "/shop-all",
        "/collections",
        "/results",
        "/list",
    ]

    # Check negative patterns first
    for pattern in non_product_patterns:
        if pattern in url_lower:
            return False

    # Check positive patterns
    for pattern in product_patterns:
        if pattern in url_lower:
            pattern_idx = url_lower.find(pattern)
            if pattern_idx != -1:
                after_pattern = url_lower[pattern_idx + len(pattern) :]
                if len(after_pattern.split("/")[0]) > 2:
                    return True

    # Domain-specific checks
    if "amazon.com" in url_lower:
        return "/dp/" in url_lower or "/gp/product/" in url_lower
    if "ebay.com" in url_lower:
        return "/itm/" in url_lower or ("/p/" in url_lower and "/search" not in url_lower)
    if "etsy.com" in url_lower:
        return "/listing/" in url_lower

    return False


def tavily_search(
    query: str, max_results: int = 10, ecommerce_only: bool = True, product_pages_only: bool = True
):
    """
    Perform Tavily search with ecommerce and product page filtering.

    Returns:
        JSON string with search results
    """
    try:
        api_key = os.getenv("TAVILY_API_KEY")
        if not api_key:
            return json.dumps({"error": "TAVILY_API_KEY not set", "results": []})

        client = TavilyClient(api_key=api_key)

        # Enhance query for product pages
        enhanced_query = query
        if ecommerce_only:
            product_terms = []
            if "buy" not in query.lower():
                product_terms.append("buy")
            if "product" not in query.lower() and "item" not in query.lower():
                product_terms.append("product")
            if product_terms:
                enhanced_query = f"{query} {' '.join(product_terms)}"

        # Get domains
        ecommerce_domains = get_ecommerce_domains() if ecommerce_only else None
        exclude_domains = (
            [
                "reddit.com",
                "quora.com",
                "medium.com",
                "wikipedia.org",
                "cnn.com",
                "bbc.com",
                "nytimes.com",
                "theverge.com",
                "techcrunch.com",
                "wired.com",
                "cnet.com",
                "pcmag.com",
            ]
            if ecommerce_only
            else None
        )

        # Request more results if filtering
        initial_max = max_results * 3 if (ecommerce_only and product_pages_only) else max_results

        # Perform search
        response = client.search(
            query=enhanced_query,
            max_results=initial_max,
            search_depth="advanced",
            include_domains=ecommerce_domains,
            exclude_domains=exclude_domains,
            include_answer=False,
            include_raw_content=False,
            include_images=True,
        )

        # Filter to product pages if requested
        if product_pages_only and response.get("results"):
            product_pages = [r for r in response["results"] if is_product_page(r.get("url", ""))]
            response["results"] = product_pages[:max_results]

        # Match images to results (same-domain only)
        if response.get("results") and response.get("images"):
            matched_images = match_images_to_results(response["results"], response["images"])
            for idx, result in enumerate(response["results"]):
                if idx in matched_images:
                    result["image_url"] = matched_images[idx]

        return json.dumps(response, ensure_ascii=False)

    except Exception as e:
        return json.dumps({"error": str(e), "results": []})


def match_images_to_results(results, top_level_images):
    """Match images to results (same-domain only)."""
    from urllib.parse import urlparse

    def get_domain(url):
        try:
            return urlparse(url).netloc.replace("www.", "").lower()
        except Exception:
            return ""

    def domains_match(result_domain, img_domain):
        if not result_domain or not img_domain:
            return False
        if img_domain == result_domain:
            return True

        # Check CDN subdomains
        def get_base(domain):
            parts = domain.split(".")
            return ".".join(parts[-2:]) if len(parts) >= 2 else domain

        result_base = get_base(result_domain)
        img_base = get_base(img_domain)
        if img_base == result_base:
            cdn_patterns = ["media.", "cdn.", "images.", "img.", "static.", "assets."]
            if any(img_domain.startswith(p) for p in cdn_patterns):
                return True
        return False

    result_images = {}
    used_images = set()

    for idx, result in enumerate(results):
        result_url = result.get("url", "")
        result_domain = get_domain(result_url)
        if not result_domain:
            continue

        best_image = None
        best_score = 0

        for img_url in top_level_images:
            if img_url in used_images:
                continue
            img_domain = get_domain(img_url)
            if not domains_match(result_domain, img_domain):
                continue

            score = 10
            img_lower = img_url.lower()
            if any(p in img_lower for p in ["product", "item", "image", "photo"]):
                score += 3
            if any(ext in img_lower for ext in [".jpg", ".jpeg", ".png", ".webp"]):
                score += 2
            if any(
                kw in img_lower
                for kw in [
                    "article",
                    "blog",
                    "news",
                    "review",
                    "guide",
                    "best-of",
                    "hero",
                    "banner",
                ]
            ):
                score -= 5

            if score > best_score:
                best_score = score
                best_image = img_url

        if best_image and best_score > 5:
            result_images[idx] = best_image
            used_images.add(best_image)

    return result_images


if __name__ == "__main__":
    # MCP server mode: read from stdin, write to stdout
    if len(sys.argv) > 1 and sys.argv[1] == "mcp":
        # Simple JSON-RPC-like interface
        try:
            line = sys.stdin.readline()
            if line:
                request = json.loads(line.strip())
                method = request.get("method", "")
                params = request.get("params", {})

                if method == "tavily_search":
                    query = params.get("query", "")
                    max_results = params.get("max_results", 10)
                    ecommerce_only = params.get("ecommerce_only", True)
                    product_pages_only = params.get("product_pages_only", True)
                    result = tavily_search(query, max_results, ecommerce_only, product_pages_only)
                    response = {
                        "jsonrpc": "2.0",
                        "id": request.get("id"),
                        "result": json.loads(result),
                    }
                    print(json.dumps(response))
                else:
                    error_response = {
                        "jsonrpc": "2.0",
                        "id": request.get("id"),
                        "error": {"code": -32601, "message": "Method not found"},
                    }
                    print(json.dumps(error_response))
        except Exception as e:
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32603, "message": str(e)},
            }
            print(json.dumps(error_response))
