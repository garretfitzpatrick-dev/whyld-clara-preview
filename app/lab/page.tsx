"use client";

import { useState } from "react";
import { CLARA_DEFAULT_MAX_TOKENS, CLARA_DEFAULT_MODEL, CLARA_DEFAULT_TEMPERATURE } from "../../lib/claraSystemPrompt";
import { CLARA_EVAL_CASES } from "../../lib/claraEvalCases";

type LabResponse = {
  text?: string;
  error?: string;
  detail?: string;
  debugPrompt?: unknown;
  responseReceived?: unknown;
  modelUsed?: string;
  fallbackUsed?: boolean;
};

const starterTranscript = CLARA_EVAL_CASES[0]?.transcript ?? "";
const starterOpener = CLARA_EVAL_CASES[0]?.opener ?? "";

export default function ClaraLabPage() {
  const [transcript, setTranscript] = useState(starterTranscript);
  const [opener, setOpener] = useState(starterOpener);
  const [memory, setMemory] = useState(CLARA_EVAL_CASES[0]?.memory ?? "");
  const [selectedCaseId, setSelectedCaseId] = useState(CLARA_EVAL_CASES[0]?.id ?? "");
  const [model, setModel] = useState(CLARA_DEFAULT_MODEL);
  const [temperature, setTemperature] = useState(String(CLARA_DEFAULT_TEMPERATURE));
  const [maxTokens, setMaxTokens] = useState(String(CLARA_DEFAULT_MAX_TOKENS));
  const [response, setResponse] = useState("");
  const [debugPrompt, setDebugPrompt] = useState<unknown>(null);
  const [responseReceived, setResponseReceived] = useState<unknown>(null);
  const [modelUsed, setModelUsed] = useState("");
  const [fallbackUsed, setFallbackUsed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateResponse() {
    setLoading(true);
    setError("");
    setResponse("");
    setResponseReceived(null);
    setModelUsed("");
    setFallbackUsed(null);

    try {
      const result = await fetch("/api/clara-lab", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          transcript,
          opener,
          memory,
          depth: "",
          model,
          temperature: Number(temperature),
          maxTokens: Number(maxTokens)
        })
      });
      const data = (await result.json()) as LabResponse;

      setDebugPrompt(data.debugPrompt ?? null);
      setResponseReceived(data.responseReceived ?? null);
      setModelUsed(data.modelUsed ?? "");
      setFallbackUsed(data.fallbackUsed ?? null);

      if (!result.ok) {
        throw new Error(data.detail || data.error || "Clara lab request failed");
      }

      setResponse(data.text ?? "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function loadEvalCase(caseId: string) {
    const example = CLARA_EVAL_CASES.find((item) => item.id === caseId);
    if (!example) return;

    setSelectedCaseId(example.id);
    setTranscript(example.transcript);
    setOpener(example.opener);
    setMemory(example.memory ?? "");
    setResponse("");
    setError("");
    setDebugPrompt(null);
    setResponseReceived(null);
    setModelUsed("");
    setFallbackUsed(null);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8">
      <header className="mb-8 flex flex-col gap-3 border-b border-pearl/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-clay">Developer lab</p>
          <h1 className="mt-2 text-4xl leading-tight text-pearl">Clara Response Lab</h1>
        </div>
        <a className="text-sm text-fog underline decoration-clay/60 underline-offset-4" href="/">
          Back to app
        </a>
      </header>

      <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm text-clay">Eval case</span>
            <select
              className="w-full rounded-md border border-pearl/12 bg-[#201e1a] px-4 py-3 text-base text-pearl outline-none transition focus:border-clay/70"
              value={selectedCaseId}
              onChange={(event) => loadEvalCase(event.target.value)}
            >
              {CLARA_EVAL_CASES.map((example) => (
                <option key={example.id} value={example.id}>
                  {example.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm text-clay">Conversation transcript</span>
            <textarea
              className="min-h-72 w-full resize-y rounded-md border border-pearl/12 bg-pearl/7 px-4 py-4 text-lg leading-7 text-pearl outline-none transition placeholder:text-fog/45 focus:border-clay/70"
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              placeholder="Clara: What gave you energy today?&#10;User: Coaching baseball and spending time with my kids."
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm text-clay">Opener question</span>
              <input
                className="w-full rounded-md border border-pearl/12 bg-pearl/7 px-4 py-3 text-base text-pearl outline-none transition placeholder:text-fog/45 focus:border-clay/70"
                value={opener}
                onChange={(event) => setOpener(event.target.value)}
                placeholder="Optional"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-clay">User profile / memory</span>
              <input
                className="w-full rounded-md border border-pearl/12 bg-pearl/7 px-4 py-3 text-base text-pearl outline-none transition placeholder:text-fog/45 focus:border-clay/70"
                value={memory}
                onChange={(event) => setMemory(event.target.value)}
                placeholder="Optional"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block space-y-2">
              <span className="text-sm text-clay">Model name</span>
              <input
                className="w-full rounded-md border border-pearl/12 bg-pearl/7 px-4 py-3 text-base text-pearl outline-none transition placeholder:text-fog/45 focus:border-clay/70"
                value={model}
                onChange={(event) => setModel(event.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-clay">Temperature</span>
              <input
                className="w-full rounded-md border border-pearl/12 bg-pearl/7 px-4 py-3 text-base text-pearl outline-none transition placeholder:text-fog/45 focus:border-clay/70"
                inputMode="decimal"
                value={temperature}
                onChange={(event) => setTemperature(event.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm text-clay">Max tokens</span>
              <input
                className="w-full rounded-md border border-pearl/12 bg-pearl/7 px-4 py-3 text-base text-pearl outline-none transition placeholder:text-fog/45 focus:border-clay/70"
                inputMode="numeric"
                value={maxTokens}
                onChange={(event) => setMaxTokens(event.target.value)}
              />
            </label>
          </div>

          <button
            className="w-full rounded-md bg-clay px-5 py-4 text-base font-medium text-ink transition hover:bg-[#cc9978] disabled:cursor-not-allowed disabled:opacity-55"
            disabled={loading}
            onClick={() => void generateResponse()}
            type="button"
          >
            {loading ? "Generating..." : "Generate Clara response"}
          </button>

          <section className="border-t border-pearl/10 pt-5 text-sm leading-6 text-fog">
            The lab sends only the central Clara prompt, opener, transcript, and optional memory to the model. It does not
            run keyword extraction, thread locking, localStorage, or template response logic.
          </section>
        </div>

        <div className="space-y-5">
          <section className="space-y-3 rounded-md border border-pearl/10 bg-pearl/7 p-4">
            <p className="text-sm text-clay">Clara response</p>
            {error ? <p className="text-base leading-7 text-[#f0a28e]">{error}</p> : null}
            <div className="grid gap-2 text-sm text-fog md:grid-cols-2">
              <span>Model used: {modelUsed || "Not run yet"}</span>
              <span>Fallback used: {fallbackUsed === null ? "Not run yet" : fallbackUsed ? "true" : "false"}</span>
            </div>
            <p className="min-h-28 whitespace-pre-wrap text-2xl leading-9 text-pearl">
              {response || "Generated response will appear here."}
            </p>
          </section>

          <section className="space-y-3 rounded-md border border-pearl/10 bg-pearl/7 p-4">
            <p className="text-sm text-clay">Debug prompt sent to model</p>
            <pre className="max-h-[34rem] overflow-auto whitespace-pre-wrap rounded-md bg-ink/70 p-4 text-xs leading-5 text-fog">
              {debugPrompt ? JSON.stringify(debugPrompt, null, 2) : "Prompt payload will appear here after generation."}
            </pre>
          </section>

          <section className="space-y-3 rounded-md border border-pearl/10 bg-pearl/7 p-4">
            <p className="text-sm text-clay">Raw response received</p>
            <pre className="max-h-[24rem] overflow-auto whitespace-pre-wrap rounded-md bg-ink/70 p-4 text-xs leading-5 text-fog">
              {responseReceived
                ? JSON.stringify(responseReceived, null, 2)
                : "Raw model response will appear here after generation."}
            </pre>
          </section>
        </div>
      </section>
    </main>
  );
}
