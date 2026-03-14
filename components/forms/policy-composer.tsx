"use client";

import { useState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";

type PolicyTemplateOption = {
  id: string;
  title: string;
  category: string;
  framework: string;
  description: string;
  summary: string;
  content: string;
  recommendedReviewDays: number;
};

type PolicyComposerProps = {
  createAction: (formData: FormData) => Promise<void>;
  defaultOwnerName: string;
  templates: PolicyTemplateOption[];
};

function buildDraftFromTemplate(template: PolicyTemplateOption, defaultOwnerName: string) {
  return {
    templateId: template.id,
    title: template.title,
    status: "draft",
    ownerName: defaultOwnerName,
    approverName: "",
    effectiveDate: "",
    reviewFrequencyDays: String(template.recommendedReviewDays),
    version: "1.0",
    summary: template.summary,
    content: template.content
  };
}

export function PolicyComposer({
  createAction,
  defaultOwnerName,
  templates
}: PolicyComposerProps) {
  const [draft, setDraft] = useState(() => buildDraftFromTemplate(templates[0], defaultOwnerName));
  const selectedTemplate =
    templates.find((template) => template.id === draft.templateId) ?? templates[0];

  function handleTemplateChange(templateId: string) {
    const template = templates.find((entry) => entry.id === templateId);

    if (!template) {
      return;
    }

    setDraft(buildDraftFromTemplate(template, defaultOwnerName));
  }

  return (
    <form action={createAction} className="grid gap-5">
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-ink" htmlFor="policy-template">
              Template
            </label>
            <select
              id="policy-template"
              name="templateId"
              value={draft.templateId}
              onChange={(event) => handleTemplateChange(event.target.value)}
              className="min-h-[48px] rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title} · {template.category}
                </option>
              ))}
            </select>
            <p className="text-sm text-ink/60">{selectedTemplate.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-ink" htmlFor="policy-title">
                Policy title
              </label>
              <input
                id="policy-title"
                name="title"
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-ink" htmlFor="policy-status">
                Status
              </label>
              <select
                id="policy-status"
                name="status"
                value={draft.status}
                onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))}
                className="min-h-[48px] rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="grid gap-2 xl:col-span-2">
              <label className="text-sm font-semibold text-ink" htmlFor="policy-owner">
                Owner
              </label>
              <input
                id="policy-owner"
                name="ownerName"
                value={draft.ownerName}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, ownerName: event.target.value }))
                }
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-ink" htmlFor="policy-approver">
                Approver
              </label>
              <input
                id="policy-approver"
                name="approverName"
                value={draft.approverName}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, approverName: event.target.value }))
                }
                placeholder="Optional"
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-ink" htmlFor="policy-version">
                Version
              </label>
              <input
                id="policy-version"
                name="version"
                value={draft.version}
                onChange={(event) => setDraft((current) => ({ ...current, version: event.target.value }))}
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-ink" htmlFor="policy-effective-date">
                Effective date
              </label>
              <input
                id="policy-effective-date"
                name="effectiveDate"
                type="date"
                value={draft.effectiveDate}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, effectiveDate: event.target.value }))
                }
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-ink" htmlFor="policy-review-frequency">
                Review cadence
              </label>
              <div className="relative">
                <input
                  id="policy-review-frequency"
                  name="reviewFrequencyDays"
                  inputMode="numeric"
                  value={draft.reviewFrequencyDays}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      reviewFrequencyDays: event.target.value.replace(/[^\d]/g, "")
                    }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 pr-16 text-sm text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
                />
                <span className="pointer-events-none absolute inset-y-0 right-4 grid place-items-center text-sm text-ink/50">
                  days
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold text-ink" htmlFor="policy-summary">
              Summary
            </label>
            <textarea
              id="policy-summary"
              name="summary"
              rows={4}
              value={draft.summary}
              onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
              className="rounded-3xl border border-ink/10 bg-white px-4 py-3 text-sm leading-6 text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-semibold text-ink" htmlFor="policy-content">
              Policy content
            </label>
            <textarea
              id="policy-content"
              name="content"
              rows={18}
              value={draft.content}
              onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
              className="rounded-[28px] border border-ink/10 bg-white px-4 py-4 text-sm leading-6 text-ink outline-none transition focus:border-ocean focus:ring-2 focus:ring-ocean/10"
            />
          </div>
        </div>

        <aside className="rounded-[28px] border border-ocean/15 bg-ocean/5 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-ocean">
            Draft Preview
          </p>
          <p className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold text-ink">
            {draft.title || "Untitled policy"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
            <span className="rounded-full bg-white px-3 py-1 text-ocean">
              {selectedTemplate.framework}
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-ink/70">{draft.status}</span>
            <span className="rounded-full bg-white px-3 py-1 text-ink/70">
              {draft.reviewFrequencyDays || selectedTemplate.recommendedReviewDays} day review
            </span>
          </div>
          <dl className="mt-6 grid gap-4 text-sm text-ink/70">
            <div>
              <dt className="text-ink/45">Source template</dt>
              <dd className="mt-1 font-semibold text-ink">{selectedTemplate.title}</dd>
            </div>
            <div>
              <dt className="text-ink/45">Owner</dt>
              <dd className="mt-1 font-semibold text-ink">{draft.ownerName || "Unassigned"}</dd>
            </div>
            <div>
              <dt className="text-ink/45">Version</dt>
              <dd className="mt-1 font-semibold text-ink">{draft.version || "1.0"}</dd>
            </div>
            <div>
              <dt className="text-ink/45">Summary</dt>
              <dd className="mt-2 leading-6 text-ink/75">{draft.summary}</dd>
            </div>
          </dl>
          <div className="mt-6 rounded-3xl border border-white/80 bg-white/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ocean">
              Content excerpt
            </p>
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-ink/75">
              {draft.content.slice(0, 360)}
              {draft.content.length > 360 ? "..." : ""}
            </p>
          </div>
          <div className="mt-6 flex">
            <SubmitButton
              pendingLabel="Creating..."
              className="min-h-[48px] rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
            >
              Create organization policy
            </SubmitButton>
          </div>
        </aside>
      </div>
    </form>
  );
}
