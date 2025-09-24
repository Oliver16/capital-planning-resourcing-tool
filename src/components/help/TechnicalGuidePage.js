import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import technicalGuideContent from "../../../docs/TECHNICAL_GUIDE.md";

const MarkdownComponents = {
  h1: ({ node, ...props }) => (
    <h1
      className="text-3xl font-bold text-slate-900 mt-10 first:mt-0 mb-4"
      {...props}
    />
  ),
  h2: ({ node, ...props }) => (
    <h2
      className="text-2xl font-semibold text-slate-900 mt-10 first:mt-0 mb-3"
      {...props}
    />
  ),
  h3: ({ node, ...props }) => (
    <h3
      className="text-xl font-semibold text-slate-800 mt-8 first:mt-0 mb-2"
      {...props}
    />
  ),
  p: ({ node, ...props }) => (
    <p className="text-base leading-7 text-slate-700 mb-4" {...props} />
  ),
  ul: ({ node, ordered, ...props }) => (
    <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-4" {...props} />
  ),
  ol: ({ node, ordered, ...props }) => (
    <ol className="list-decimal pl-6 space-y-2 text-slate-700 mb-4" {...props} />
  ),
  li: ({ node, ...props }) => <li className="leading-6" {...props} />,
  a: ({ node, ...props }) => (
    <a
      className="text-blue-600 underline decoration-blue-200 hover:decoration-blue-400"
      {...props}
    />
  ),
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto mb-6">
      <table className="min-w-full divide-y divide-slate-200" {...props} />
    </div>
  ),
  thead: ({ node, ...props }) => (
    <thead className="bg-slate-50 text-left" {...props} />
  ),
  tbody: ({ node, ...props }) => (
    <tbody className="divide-y divide-slate-200" {...props} />
  ),
  th: ({ node, ...props }) => (
    <th
      className="px-4 py-2 text-sm font-semibold text-slate-600 uppercase tracking-wide"
      {...props}
    />
  ),
  td: ({ node, ...props }) => (
    <td className="px-4 py-2 align-top text-sm text-slate-700" {...props} />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="border-l-4 border-blue-200 bg-blue-50/60 text-slate-700 italic px-4 py-3 rounded-r"
      {...props}
    />
  ),
  code: ({ node, inline, className, children, ...props }) => {
    if (inline) {
      return (
        <code
          className="rounded bg-slate-100 px-1 py-0.5 text-sm font-mono text-slate-700"
          {...props}
        >
          {children}
        </code>
      );
    }

    return (
      <pre className="mb-4 overflow-x-auto rounded-lg bg-slate-900 p-4 text-slate-100">
        <code className="font-mono text-sm leading-6" {...props}>
          {children}
        </code>
      </pre>
    );
  },
};

const TechnicalGuidePage = ({ onClose }) => {
  const content = useMemo(() => technicalGuideContent, []);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Technical Guide &amp; Reference
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review system architecture, data model, and calculation details.
          </p>
        </div>
        {typeof onClose === "function" && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 shadow-sm transition hover:bg-blue-100"
          >
            Return to workspace
          </button>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={MarkdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default TechnicalGuidePage;
