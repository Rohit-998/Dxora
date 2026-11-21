"""Rebuild the explicitly fictional UI fixture; never calls an LLM or a website."""

from datetime import UTC, datetime
from pathlib import Path

from app.schemas import AnalysisResponse
from app.services.website_extractor import parse_page, seo_checks

ROOT = Path(__file__).resolve().parents[1]
page, _ = parse_page(
    "https://forma.example/",
    (ROOT / "examples/forma.html").read_text(encoding="utf-8"),
    "page-1",
    24000,
)
service_data = [
    (
        "Brand strategy & identity",
        "A distinct voice, built to last.",
        "Startups & professional services",
        "Founders and marketing leaders",
        "Turn a business vision into a recognizable brand.",
        "Brand strategy and visual identity systems help businesses find their voice and stand out.",
    ),
    (
        "Website design & development",
        "Thoughtful websites that work as well as they look.",
        "Technology & services",
        "Growing businesses",
        "Create an accessible, credible digital home.",
        "Custom websites combine thoughtful design, accessible interfaces, and reliable development.",
    ),
    (
        "Digital product design",
        "From a complex idea to an intuitive product.",
        "SaaS & technology",
        "Product teams",
        "Validate ideas and simplify the customer experience.",
        "We design intuitive digital products, from early research to interactive prototypes and design systems.",
    ),
    (
        "E-commerce experiences",
        "Make discovery feel effortless.",
        "Retail & direct-to-consumer",
        "Retail founders",
        "Remove friction from online shopping.",
        "We create online shopping experiences that make discovering products and checking out feel effortless.",
    ),
    (
        "Creative direction",
        "One story, across every touchpoint.",
        "Consumer & professional brands",
        "Marketing teams",
        "Build consistency across campaigns and channels.",
        "Creative direction connects brand storytelling, campaigns, and digital experiences into a consistent whole.",
    ),
]
queries = [
    (
        "brand and website design studio",
        ["Google"],
        "Commercial investigation",
        "Connects the studio's two core disciplines.",
        "Founders planning a brand launch",
    ),
    (
        "creative studio for small business",
        ["Facebook"],
        "Business discovery",
        "Matches growing businesses seeking a creative partner.",
        "Small business owners",
    ),
    (
        "minimal brand identity inspiration",
        ["Instagram"],
        "Inspiration",
        "Reaches people exploring a new visual identity.",
        "Brand and marketing teams",
    ),
    (
        "digital product design partner for startups",
        ["LinkedIn"],
        "B2B service discovery",
        "Pairs product design with the stated startup audience.",
        "Startup product leaders",
    ),
    (
        "ecommerce website design recommendations",
        ["X"],
        "Peer recommendations",
        "Captures conversations about the studio's commerce offering.",
        "Retail and direct-to-consumer founders",
    ),
]
report = {
    "success": True,
    "website": page.url,
    "brand": {
        "name": "Forma",
        "category": "Independent digital studio",
        "summary": "An independent studio bringing brand strategy, design, and development together for ambitious startups and growing businesses.",
        "products_and_services": [s[0] for s in service_data],
    },
    "analysis": {
        "competitor_analysis": {
            "brand_overview": "Forma brings strategy and execution into one collaborative partnership. Its clearest positioning opportunity is to make that integrated approach tangible through focused case studies.",
            "competitors": [
                {
                    "name": "Clay",
                    "comparison": "Potential overlap in brand and digital product design.",
                    "strengths": [
                        "Recognizable digital design positioning",
                        "Product and brand disciplines",
                    ],
                    "gaps": ["Verify fit for smaller, early-stage budgets"],
                    "evidence_status": "ai_suggestion",
                },
                {
                    "name": "Ramotion",
                    "comparison": "Potential overlap in identity, websites, and product design.",
                    "strengths": [
                        "Multi-disciplinary design offering",
                        "Technology-oriented positioning",
                    ],
                    "gaps": ["Verify the depth of ongoing creative partnership"],
                    "evidence_status": "ai_suggestion",
                },
                {
                    "name": "Focus Lab",
                    "comparison": "Potential overlap in strategic brand identity work.",
                    "strengths": [
                        "Focused brand strategy positioning",
                        "Business-oriented brand storytelling",
                    ],
                    "gaps": ["Verify coverage of product and commerce development"],
                    "evidence_status": "ai_suggestion",
                },
            ],
            "strengths": [
                "Strategy, design, and development in one studio",
                "A collaborative approach for founders and teams",
                "Coverage across brand, product, and commerce",
            ],
            "opportunities": [
                "Build dedicated landing pages for each core service",
                "Publish case studies with verifiable business outcomes",
                "Clarify project fit, process, and engagement options",
            ],
        },
        "target_search_queries": [
            dict(
                zip(
                    ["query", "platforms", "intent", "business_relevance", "target_audience"],
                    q,
                    strict=True,
                )
            )
            for q in queries
        ],
        "seo_improvements": {
            "primary_keyword": "digital design studio",
            "secondary_keywords": [
                "brand identity design",
                "website design and development",
                "digital product design",
            ],
            "long_tail_keywords": [
                "brand and website design for startups",
                "independent digital studio for growing businesses",
                "ecommerce experience design studio",
            ],
            "business_keywords": ["creative direction", "design systems", "brand strategy"],
            "recommended_title": "Digital Design Studio for Ambitious Brands | Forma",
            "title_rationale": "Lead with the service category, add the audience, and close with the brand.",
            "meta_description": "Build a brand that moves your business forward. Forma brings brand strategy, web development, and digital product design together. Meet your creative partner.",
            "supporting_content": [
                {
                    "title": "Brand strategy for early-stage startups",
                    "content_type": "Service landing page",
                    "rationale": "Explain deliverables and process for a clearly named customer group.",
                    "priority": "high",
                },
                {
                    "title": "From first idea to product launch",
                    "content_type": "Case study",
                    "rationale": "Show the actual research, design decisions, and measured outcomes of a project.",
                    "priority": "high",
                },
                {
                    "title": "What to expect when working with a design studio",
                    "content_type": "FAQ / guide",
                    "rationale": "Answer practical questions about collaboration, scope, and timelines.",
                    "priority": "medium",
                },
            ],
        },
        "top_services": [
            {
                "name": s[0],
                "description": s[1],
                "target_industry": s[2],
                "target_customer": s[3],
                "main_benefit": s[4],
                "evidence_status": "observed",
                "evidence": [{"source_id": "page-1", "quote": s[5]}],
            }
            for s in service_data
        ],
        "target_audience": {
            "primary_audience": ["Startup founders", "Growing businesses"],
            "secondary_audience": ["Marketing leaders", "Product teams"],
            "industries": ["Technology", "Retail", "Professional services"],
            "business_types": [
                "Startups",
                "Small and medium businesses",
                "Direct-to-consumer brands",
            ],
            "geographic_focus": "Not specified on the analyzed pages",
            "customer_needs": [
                "A credible and distinctive brand",
                "A better digital customer experience",
                "One partner across strategy and execution",
            ],
            "segments": [
                {
                    "name": "The ambitious founder",
                    "business_type": "Early-stage startup",
                    "profile": "A founder preparing to launch or reposition a business.",
                    "needs": ["Brand clarity", "A launch-ready website"],
                    "interests": ["Entrepreneurship", "Brand building"],
                    "marketing_approach": "Share launch stories and practical brand-building advice on LinkedIn.",
                },
                {
                    "name": "The growth-minded team",
                    "business_type": "Growing business",
                    "profile": "A marketing team whose digital presence no longer reflects its business.",
                    "needs": ["A cohesive identity", "A clearer website journey"],
                    "interests": ["Customer experience", "Digital marketing"],
                    "marketing_approach": "Publish detailed redesign case studies and service-specific search content.",
                },
                {
                    "name": "The product builder",
                    "business_type": "Technology company",
                    "profile": "A product leader bringing a new digital experience to market.",
                    "needs": ["Usability research", "An adaptable design system"],
                    "interests": ["Product strategy", "User experience"],
                    "marketing_approach": "Demonstrate product thinking through prototypes and design process breakdowns.",
                },
            ],
        },
    },
    "limitations": [
        "This is a hand-authored demonstration using a fictional studio and a local HTML fixture, not a live Gemini analysis.",
        "Competitor comparisons are illustrative, unverified AI-style suggestions; no independent research was performed.",
        "Audience profiles and recommendations are interpretations, not measured customer data.",
        "No search volumes, rankings, or performance scores are claimed.",
    ],
    "sources": [page.model_dump()],
    "seo_checks": [check.model_dump() for check in seo_checks(page)],
    "metadata": {
        "request_id": "sample-report",
        "generated_at": datetime(2026, 11, 21, tzinfo=UTC).isoformat(),
        "duration_ms": 0,
        "model": "illustrative fixture",
        "cached": False,
        "input_tokens": None,
        "output_tokens": None,
        "thinking_tokens": None,
        "source_count": 1,
        "is_demo": True,
    },
}
validated = AnalysisResponse.model_validate(report)
(ROOT / "examples/sample-response.json").write_text(
    validated.model_dump_json(indent=2), encoding="utf-8"
)
print("Validated sample report written to examples/sample-response.json")
