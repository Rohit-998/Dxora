from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=2000)]
Platform = Literal["Google", "Facebook", "Instagram", "LinkedIn", "X"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class AnalysisRequest(StrictModel):
    url: str = Field(min_length=8, max_length=2048, examples=["https://example.com"])


class Brand(StrictModel):
    name: Text
    category: Text
    summary: Text
    products_and_services: list[Text] = Field(max_length=15)


class Competitor(StrictModel):
    name: Text
    comparison: Text
    strengths: list[Text] = Field(max_length=5)
    gaps: list[Text] = Field(max_length=5)
    evidence_status: Literal["ai_suggestion"]


class CompetitorAnalysis(StrictModel):
    brand_overview: Text
    competitors: list[Competitor] = Field(max_length=5)
    strengths: list[Text] = Field(max_length=8)
    opportunities: list[Text] = Field(max_length=8)


class SearchQuery(StrictModel):
    query: Text
    platforms: list[Platform] = Field(min_length=1, max_length=5)
    intent: Text
    business_relevance: Text
    target_audience: Text


class ContentIdea(StrictModel):
    title: Text
    content_type: Text
    rationale: Text
    priority: Literal["high", "medium", "low"]


class SEOImprovements(StrictModel):
    primary_keyword: Text
    secondary_keywords: list[Text] = Field(max_length=10)
    long_tail_keywords: list[Text] = Field(max_length=10)
    business_keywords: list[Text] = Field(max_length=10)
    recommended_title: Text
    title_rationale: Text
    meta_description: Text
    supporting_content: list[ContentIdea] = Field(max_length=8)


class Evidence(StrictModel):
    source_id: Text
    quote: Text


class Service(StrictModel):
    name: Text
    description: Text
    target_industry: Text
    target_customer: Text
    main_benefit: Text
    evidence_status: Literal["observed", "inferred"]
    evidence: list[Evidence] = Field(max_length=3)


class AudienceSegment(StrictModel):
    name: Text
    business_type: Text
    profile: Text
    needs: list[Text] = Field(max_length=6)
    interests: list[Text] = Field(max_length=6)
    marketing_approach: Text


class TargetAudience(StrictModel):
    primary_audience: list[Text] = Field(max_length=6)
    secondary_audience: list[Text] = Field(max_length=6)
    industries: list[Text] = Field(max_length=8)
    business_types: list[Text] = Field(max_length=8)
    geographic_focus: Text
    customer_needs: list[Text] = Field(max_length=8)
    segments: list[AudienceSegment] = Field(max_length=5)


class Analysis(StrictModel):
    competitor_analysis: CompetitorAnalysis
    target_search_queries: list[SearchQuery] = Field(min_length=5, max_length=5)
    seo_improvements: SEOImprovements
    top_services: list[Service] = Field(min_length=1, max_length=5)
    target_audience: TargetAudience

    @model_validator(mode="after")
    def validate_platform_coverage(self):
        platforms = {p for q in self.target_search_queries for p in q.platforms}
        if platforms != {"Google", "Facebook", "Instagram", "LinkedIn", "X"}:
            raise ValueError("Queries must cover all five supported platforms")
        if len({q.query.casefold() for q in self.target_search_queries}) != 5:
            raise ValueError("Search queries must be distinct")
        return self


class GeneratedReport(StrictModel):
    brand: Brand
    analysis: Analysis
    limitations: list[Text] = Field(max_length=10)


class PageSource(StrictModel):
    id: str
    url: str
    title: str
    meta_description: str
    headings: list[str]
    text: str
    word_count: int
    canonical: str | None
    image_count: int
    images_without_alt: int


class SEOCheck(StrictModel):
    name: str
    status: Literal["pass", "review"]
    detail: str


class ReportMetadata(StrictModel):
    request_id: str
    generated_at: datetime
    duration_ms: int
    model: str
    cached: bool = False
    input_tokens: int | None = None
    output_tokens: int | None = None
    thinking_tokens: int | None = None
    source_count: int
    is_demo: bool = False


class AnalysisResponse(GeneratedReport):
    success: Literal[True] = True
    website: str
    sources: list[PageSource]
    seo_checks: list[SEOCheck]
    metadata: ReportMetadata


class ErrorDetail(StrictModel):
    code: str
    message: str
    request_id: str


class ErrorResponse(StrictModel):
    success: Literal[False] = False
    error: ErrorDetail
