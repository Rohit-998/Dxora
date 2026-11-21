import sample from "../../examples/sample-response.json";

// The checked-in sample is validated by the same Pydantic response model as the API.
export type Report = Omit<typeof sample, "metadata"> & {
  metadata: Omit<
    typeof sample.metadata,
    "input_tokens" | "output_tokens" | "thinking_tokens"
  > & {
    input_tokens: number | null;
    output_tokens: number | null;
    thinking_tokens: number | null;
  };
};
export type Tab =
  | "Overview"
  | "Competitors"
  | "Search queries"
  | "SEO opportunities"
  | "Services"
  | "Audience"
  | "Sources";
export type Health = {
  status: string;
  configured: boolean;
  authentication_required: boolean;
  model: string;
};
