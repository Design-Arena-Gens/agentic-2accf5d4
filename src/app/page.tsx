"use client";

import { useCallback, useMemo, useState } from "react";

const DEMO_MASTER = `Algebra Basics
Algebraic Expressions
Data Analysis
Decimals
Fractions
Geometry: Angles
Geometry: Shapes
Measurement
Number Patterns
Percentages
Probability
Word Problems`;

const DEMO_PASSED = `Decimals
Fractions
Measurement
Number Patterns`;

const DEMO_FAILED = `Percentages
Probability
Algebraic Expressions`;

type PartitionResult = {
  canonical: string[];
  unknown: string[];
};

const collator = new Intl.Collator(undefined, {
  sensitivity: "base",
  usage: "sort",
});

function normalizeKey(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function parseSkills(input: string): string[] {
  const trimmed = input.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .map((entry) =>
          typeof entry === "string" ? entry : entry != null ? String(entry) : "",
        )
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
  } catch {
    // Fall through to plain-text parsing.
  }

  return trimmed
    .split(/[\n,;]+/)
    .map((entry) => entry.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
}

function dedupePreserveOrder(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const skill of skills) {
    const key = normalizeKey(skill);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(skill.trim());
  }

  return result;
}

function partitionByMaster(
  skills: string[],
  lookup: Map<string, string>,
): PartitionResult {
  const canonical: string[] = [];
  const unknown: string[] = [];
  const seenCanonical = new Set<string>();
  const seenUnknown = new Set<string>();

  for (const skill of skills) {
    const key = normalizeKey(skill);
    if (!key) {
      continue;
    }
    const canonicalValue = lookup.get(key);
    if (canonicalValue) {
      if (!seenCanonical.has(canonicalValue)) {
        seenCanonical.add(canonicalValue);
        canonical.push(canonicalValue);
      }
    } else if (!seenUnknown.has(skill)) {
      seenUnknown.add(skill);
      unknown.push(skill);
    }
  }

  canonical.sort(collator.compare);
  unknown.sort(collator.compare);

  return { canonical, unknown };
}

export default function Home() {
  const [masterInput, setMasterInput] = useState("");
  const [passedInput, setPassedInput] = useState("");
  const [failedInput, setFailedInput] = useState("");

  const loadDemoData = useCallback(() => {
    setMasterInput(DEMO_MASTER);
    setPassedInput(DEMO_PASSED);
    setFailedInput(DEMO_FAILED);
  }, []);

  const masterSkills = useMemo(() => {
    const parsed = parseSkills(masterInput);
    const deduped = dedupePreserveOrder(parsed);
    return [...deduped].sort(collator.compare);
  }, [masterInput]);

  const canonicalLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const skill of masterSkills) {
      map.set(normalizeKey(skill), skill);
    }
    return map;
  }, [masterSkills]);

  const { canonical: passedSkills, unknown: passedUnknown } = useMemo(
    () => partitionByMaster(parseSkills(passedInput), canonicalLookup),
    [passedInput, canonicalLookup],
  );

  const { canonical: failedSkills, unknown: failedUnknown } = useMemo(
    () => partitionByMaster(parseSkills(failedInput), canonicalLookup),
    [failedInput, canonicalLookup],
  );

  const recommendedSkills = useMemo(() => {
    const taken = new Set([...passedSkills, ...failedSkills].map(normalizeKey));
    return masterSkills.filter((skill) => !taken.has(normalizeKey(skill)));
  }, [failedSkills, masterSkills, passedSkills]);

  const coverage = useMemo(() => {
    if (!masterSkills.length) {
      return 0;
    }
    return Math.round((passedSkills.length / masterSkills.length) * 100);
  }, [masterSkills.length, passedSkills.length]);

  const attemptedCount = useMemo(() => {
    const combined = new Set(
      [...passedSkills, ...failedSkills].map((skill) => normalizeKey(skill)),
    );
    return combined.size;
  }, [failedSkills, passedSkills]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 lg:py-16">
        <header className="flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-800/80 px-4 py-1 text-sm font-medium text-sky-300 ring-1 ring-inset ring-slate-600">
            Skill Assessment Engine
          </span>
          <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Generate student skill recommendations in seconds.
          </h1>
          <p className="max-w-3xl text-base text-slate-300 sm:text-lg">
            Provide the master catalog of skills alongside the student&apos;s
            passed and attempted-but-not-passed skills. The engine aligns every
            entry, surfaces gaps, and produces a prioritized recommendation list
            for future assessments.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
            <span className="rounded-full bg-slate-800 px-3 py-1">
              Master skills: {masterSkills.length}
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1">
              Passed: {passedSkills.length}
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1">
              Failed: {failedSkills.length}
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1">
              Recommended next: {recommendedSkills.length}
            </span>
            <span className="rounded-full bg-slate-800 px-3 py-1">
              Coverage: {coverage}%
            </span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Master List</h2>
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Required
              </span>
            </div>
            <textarea
              value={masterInput}
              onChange={(event) => setMasterInput(event.target.value)}
              placeholder="One skill per line, comma-separated list, or JSON array."
              className="min-h-[200px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-black/40 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
            />
            <p className="mt-3 text-xs text-slate-400">
              This is the authoritative catalog of assessable skills.
            </p>
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Passed Skills</h2>
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Optional
              </span>
            </div>
            <textarea
              value={passedInput}
              onChange={(event) => setPassedInput(event.target.value)}
              placeholder="Enter skills the student has mastered."
              className="min-h-[200px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-black/40 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
            />
            <p className="mt-3 text-xs text-slate-400">
              Any skill not listed in the master catalog is flagged below.
            </p>
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Failed Skills</h2>
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Optional
              </span>
            </div>
            <textarea
              value={failedInput}
              onChange={(event) => setFailedInput(event.target.value)}
              placeholder="Enter skills attempted but not yet passed."
              className="min-h-[200px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-black/40 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/40"
            />
            <button
              type="button"
              onClick={loadDemoData}
              className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-sky-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-sky-400"
            >
              Load demo dataset
            </button>
            <p className="mt-3 text-xs text-slate-400">
              Failed entries inform the recommendation ordering.
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
            <header className="mb-4 flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-white">Passed Skills</h3>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Sorted alphabetically · {passedSkills.length} skills
              </p>
            </header>
            <SkillList items={passedSkills} emptyLabel="No passed skills yet." />
            {passedUnknown.length > 0 ? (
              <AlertList
                title="Outside master catalog"
                items={passedUnknown}
                tone="warning"
              />
            ) : null}
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
            <header className="mb-4 flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-white">Failed Skills</h3>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Attempted but not passed · {failedSkills.length} skills
              </p>
            </header>
            <SkillList items={failedSkills} emptyLabel="No failed skills yet." />
            {failedUnknown.length > 0 ? (
              <AlertList
                title="Outside master catalog"
                items={failedUnknown}
                tone="warning"
              />
            ) : null}
          </div>

          <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40">
            <header className="mb-4 flex flex-col gap-2">
              <h3 className="text-lg font-semibold text-white">
                Recommended Next Focus
              </h3>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Not yet passed or attempted · {recommendedSkills.length} skills
              </p>
            </header>
            <SkillList
              items={recommendedSkills}
              emptyLabel="All skills have been attempted."
            />
            <div className="mt-4 space-y-2 text-xs text-slate-400">
              <p>Total skills attempted so far: {attemptedCount}</p>
              <p>
                Remaining gap: {recommendedSkills.length} of {masterSkills.length} (
                {masterSkills.length
                  ? Math.round(
                      (recommendedSkills.length / masterSkills.length) * 100,
                    )
                  : 0}
                %)
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40">
          <h3 className="text-lg font-semibold text-white">Data handling</h3>
          <p className="mt-2 text-sm text-slate-300">
            Inputs support newline, comma, or semicolon separated values, as well
            as JSON arrays. Duplicate entries are automatically deduplicated and
            aligned against the master catalog using case-insensitive matching.
            Values not present in the master catalog are flagged for review.
          </p>
        </section>
      </main>
    </div>
  );
}

type AlertTone = "warning" | "info";

function SkillList({
  items,
  emptyLabel,
}: {
  items: string[];
  emptyLabel: string;
}) {
  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 px-4 py-6 text-sm text-slate-400">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-2 text-sm text-slate-100 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-xl border border-slate-700/80 bg-slate-950/60 px-4 py-3 shadow-inner shadow-black/40"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function AlertList({
  items,
  title,
  tone = "info",
}: {
  items: string[];
  title: string;
  tone?: AlertTone;
}) {
  const badgeClasses =
    tone === "warning"
      ? "bg-amber-400/10 text-amber-300 border border-amber-500/40"
      : "bg-sky-400/10 text-sky-300 border border-sky-500/40";

  return (
    <div className="mt-6 rounded-xl border border-slate-700/80 bg-slate-950/80 p-4 text-sm text-slate-200">
      <div
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badgeClasses}`}
      >
        {title}
      </div>
      <ul className="mt-3 space-y-2 text-sm text-slate-100">
        {items.map((item) => (
          <li key={item} className="rounded-lg bg-slate-900/80 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
