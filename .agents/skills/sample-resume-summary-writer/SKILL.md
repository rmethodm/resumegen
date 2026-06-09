---
name: sample-resume-summary-writer
description: "Sample skill for learning local agent creation. Activates when the user asks to write, rewrite, shorten, or tailor a resume professional summary for a specific role, industry, or job posting."
license: MIT
metadata:
  author: rmethod
---

# Sample Resume Summary Writer

## Purpose

This is a teaching skill. Use it when the request is specifically about improving a resume summary rather than rewriting the full resume.

## When to Apply

Activate this skill when:

- Writing a new professional summary from resume details
- Rewriting a summary to match a target job
- Shortening an overlong summary
- Making a summary more specific, credible, and results-oriented

Do not use this skill when:

- The user wants bullet points for work experience
- The user wants a cover letter
- The user wants a full resume rewrite

## Workflow

1. Identify the target role, seniority, and industry.
2. Pull out the strongest two or three differentiators from the user material.
3. Write a short summary focused on business impact, scope, or specialization.
4. Remove generic claims that are not supported by evidence.
5. Keep the tone concrete and direct.

## Output Rules

- Default to 2 to 4 lines.
- Lead with role identity or years of experience when available.
- Prefer measurable outcomes over adjectives.
- Avoid filler such as "hardworking", "passionate", or "team player" unless the user explicitly wants that tone.

## References

- For prompt examples and before/after patterns, read `references/example-prompts.md` only when needed.
