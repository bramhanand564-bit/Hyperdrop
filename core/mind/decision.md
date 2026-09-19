# HyperMind V0.1 Decision Policy

## Question

**Does Hyperdrop know enough to answer or act safely?**

The decision is not based on a single "confidence" number.

## Research triggers

Research when one or more are true:
1. The user asks for current, changing, or externally verifiable information.
2. The task depends on a fact not present in trusted memory.
3. Internal evidence conflicts.
4. Confidence is below the task's required threshold.
5. The user explicitly asks for research or sources.

## Direct-response path

A direct response is acceptable when:
- the task does not require current external information;
- relevant knowledge is available;
- evidence is internally consistent;
- uncertainty is small enough for the task.

## Important rule

When uncertain, HyperMind should say what is uncertain rather than silently inventing an answer.

## Future extension

The policy will later learn thresholds from task outcomes, but V0.1 keeps the rules explicit and inspectable.
