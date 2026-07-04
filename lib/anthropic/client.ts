import Anthropic from "@anthropic-ai/sdk";

export const anthropic = new Anthropic();

// Kept as a config value, not hardcoded — swap models by changing the env var.
// NOTE: structured outputs (output_config.format) require a model that
// supports them (Sonnet 5, Opus 4.7/4.8, Fable 5, Haiku 4.5) — confirm
// support before changing this to an older model.
export const GRADING_MODEL = process.env.GRADING_MODEL ?? "claude-sonnet-5";
