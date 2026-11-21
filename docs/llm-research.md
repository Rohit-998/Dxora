# Model selection: accuracy, latency, and cost

Research date: **21 November 2026**. USD prices describe standard synchronous text inference. Thinking tokens, retries, tiers, region, and tools may change the bill. Recheck the sources before deployment.

## Selection and lifecycle

**Use Gemini 3.5 Flash-Lite with minimal thinking.** The user requested Gemini. Its documented structured-output support, 1,048,576-token input limit, and extraction-oriented positioning make it a practical candidate. These specifications do not establish application-level accuracy. [Model specifications](https://aistudio.google.com/docs/models/gemini-3.5-flash-lite), [thinking controls](https://aistudio.google.com/docs/thinking#thinking-levels).

The initial implementation targeted Gemini 2.5 Flash. Current documentation marks it deprecated and describes routing to 3.5 Flash-Lite from 1 December 2026. The final configuration names the replacement directly. [Deprecation schedule](https://aistudio.google.com/docs/deprecations#gemini-2.5-flash-models).

## Comparison

| Model | Input / output per 1M tokens | Context | JSON | Expected speed (not measured) | Accuracy (not benchmarked) |
| --- | --- | --- | --- | --- | --- |
| **Gemini 3.5 Flash-Lite** | **$0.30 / $2.50** | 1,048,576 input | JSON Schema | Provider targets low latency; minimal thinking limits extra work | Evaluate extraction completeness and unsupported claims |
| Gemini 3.8 Flash | $0.75 / $3.75 through 31 Dec 2026; then $1.50 / $7.50 | 1M | JSON Schema | More reasoning may take longer; compare at low thinking | Candidate for difficult or ambiguous websites |
| GPT-6.1 Terra | $1.00 / $5.00 at ≤272K input | 1,050,000 | Structured outputs | Provider describes it as efficient; reasoning affects time | Evaluate synthesis and extraction; no superiority claimed |
| Claude Haiku 5.5 | $0.10 / $0.50 at ≤100K input; $0.50 / $2.50 above | 1M | Provider documents JSON schema | Provider targets latency-sensitive extraction | Cost candidate; tokenizer/reasoning affect actual usage |

Sources: [Google pricing](https://aistudio.google.com/docs/pricing), [3.8 Flash specifications](https://aistudio.google.com/docs/models/gemini-3.8-flash), [OpenAI specifications/pricing](https://developers.openai.com/api/docs/models/gpt-6.1-terra), [Anthropic specifications/pricing](https://platform.claude.com/docs/en/models/haiku-5-5/overview), [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).

All context windows exceed this application's evidence budget. That does not justify sending raw HTML. No comparable website-analysis latency, accuracy, or schema-failure benchmarks have been run; unrelated provider benchmarks would not establish them.

## Cost and latency budget

Estimate **8,000 input tokens**, including instructions/schema/evidence, and **3,500 output tokens**. The 24,000-character evidence ceiling is roughly 6,000 English tokens, with additional schema/prompt overhead. Character-to-token ratios vary. Actual usage comes from Gemini `usageMetadata`.

```text
Gemini 3.5 Flash-Lite:
8,000 × $0.30 / 1,000,000 = $0.00240
3,500 × $2.50 / 1,000,000 = $0.00875
Estimated base cost       = $0.01115 per website
```

At identical assumed counts, 3.8 Flash costs $0.019125 at its current promotional rate, GPT-6.1 Terra $0.02550, and Haiku 5.5 $0.00255 in the short-input tier. These are arithmetic comparisons, not equivalent-workload measurements: tokenizers and reasoning usage differ. Haiku is the cheapest listed candidate. Gemini is selected because of the requested integration and workload fit, not a lowest-price claim.

Thinking tokens add output charges. An 8,192-token output cap bounds each response but does not guarantee completeness. A transient retry may add time/cost. No paid search grounding is enabled: competitors remain suggestions.

Planning latency: **10–40 seconds for generation**, **15–60 seconds for typical uncached analysis**. These are estimates, not measurements or SLAs. Website access, provider load, output length, throttling, and retries affect duration. Each fetch has a 15-second deadline; all Gemini attempts share a 75-second deadline. Cache hits avoid new network/model calls until expiry.

## Cost controls implemented

1. Remove scripts, navigation, styling, and duplicate lines.
2. Bound extraction to three pages and 24,000 characters.
3. Generate all sections in one schema-constrained call.
4. Cache normalized URLs for 15 minutes in bounded memory; coordinate duplicates.
5. Use minimal thinking and cap output. Perform basic HTML checks without an LLM.
6. Reject invalid results rather than repeatedly paying for repair prompts.
7. Restrict concurrency/frequency and support an app access key.

Provider prompt caching is not enabled: short, changing content may not justify storage/minimums. The in-process result cache is different. Multi-user deployments should evaluate shared caching, isolation, and invalidation.

## Fallback and evaluation plan

Set `GEMINI_MODEL=gemini-3.8-flash` and restart to try the manual alternative; the client selects low thinking. There is no automatic fallback that silently changes costs. Other providers need adapters and credentials.

Before making quality claims, collect 20 public sites covering SaaS, agencies, local services, retail, nonprofits, sparse HTML, redirects, and blocked/JavaScript-only pages. Save permitted snapshots and human-annotate brands, services, geography, and expected limitations.

- Use identical evidence/output requirements per provider; repeat each site three times.
- Measure schema success, service precision/recall, excerpt matches, unsupported facts, and query specificity. Score competitor hypotheses separately from asserted facts.
- Record actual input/output/thought tokens, generation/total duration, errors, and cost. Report median/p95 only with enough samples.
- Review blind to provider when possible. Separate factual extraction from subjective marketing usefulness.
- Choose the cheapest model meeting agreed accuracy/latency thresholds; retain a regression set before upgrades.

The software tests use fixtures/mocked provider responses. They do not establish model accuracy, live schema acceptance, or paid API latency. A Gemini key is required for the first live verification.
