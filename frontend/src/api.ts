import type { Health, Report } from "./types";

export async function getHealth(signal: AbortSignal): Promise<Health> {
  const response = await fetch("/health", { signal });
  if (!response.ok) throw new Error("API unavailable");
  return response.json();
}

export async function analyzeWebsite(
  url: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<Report> {
  const response = await fetch("/link-analysis", {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { "X-API-Key": apiKey } : {}),
    },
    body: JSON.stringify({ url }),
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(
      "The server returned an unreadable response. Check that the API is running on port 4000.",
    );
  }
  if (!response.ok || !body.success)
    throw new Error(
      body.error?.message || "The analysis could not be completed.",
    );
  return body as Report;
}

export function exportReport(report: Report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `aperture-${report.brand.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}${report.metadata.is_demo ? "-sample" : ""}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
