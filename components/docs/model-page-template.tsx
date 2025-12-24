'use client';

import { useState } from 'react';
import { DocsShell, DocsBreadcrumb, DocsFooter } from '@/components/docs/docs-shell';
import Link from 'next/link';
import { Copy, Check } from 'lucide-react';

export interface ModelSpec {
  label: string;
  value: string;
}

export interface PromptExample {
  title: string;
  prompt: string;
}

export interface ModelLimit {
  label: string;
  value: string;
}

export interface ModelPageProps {
  name: string;
  familyName: string;
  familyHref: string;
  shortDescription: string;
  description: string;
  specs: ModelSpec[];
  details: string;
  idealFor: string[];
  promptExamples: PromptExample[];
  limits: ModelLimit[];
  tip?: string;
  actionHref: string;
}

function PromptExampleCard({ title, prompt }: { title: string; prompt: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <div className="text-sm font-medium text-white font-inter mb-2">{title}</div>
      <div className="relative group">
        <code className="block p-3 pr-12 bg-[#1a1a1a] rounded-lg text-sm text-[#b0b0b0] font-inter leading-relaxed">
          {prompt}
        </code>
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-1.5 rounded-md bg-[#2a2a2a] hover:bg-[#3a3a3a] transition-colors opacity-0 group-hover:opacity-100"
          title="Скопировать промпт"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-[#959595]" />
          )}
        </button>
      </div>
    </div>
  );
}

export function ModelPageTemplate({
  name,
  familyName,
  familyHref,
  shortDescription,
  description,
  specs,
  details,
  idealFor,
  promptExamples,
  limits,
  tip,
  actionHref,
}: ModelPageProps) {
  return (
    <DocsShell>
      {/* Breadcrumb */}
      <DocsBreadcrumb items={[
        { label: 'Модели', href: '/docs/models' },
        { label: familyName, href: familyHref },
        { label: name },
      ]} />

      {/* Title and Description */}
      <div className="mb-6">
        <h1 className="text-[30px] font-bold text-white font-inter leading-tight tracking-[-0.013em] mb-4">
          {name}
        </h1>
        <p className="text-sm text-[#959595] font-inter leading-relaxed">
          {shortDescription}
        </p>
      </div>

      {/* About the Model */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          Про модель
        </h2>
        <p className="text-sm text-[#959595] font-inter leading-relaxed whitespace-pre-line">
          {description}
        </p>
      </div>

      {/* Technical Specs Table */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          Технические характеристики
        </h2>
        <div className="flex">
          {/* Labels Column */}
          <div className="flex-1">
            {specs.map((spec, index) => (
              <div key={index} className="py-3 pr-4 border-b border-[#4e4e4e]">
                <span className="text-sm text-[#959595] font-inter">
                  {spec.label}
                </span>
              </div>
            ))}
          </div>
          {/* Values Column */}
          <div className="flex-1">
            {specs.map((spec, index) => (
              <div key={index} className="py-3 border-b border-[#4e4e4e]">
                <span className="text-sm font-medium text-white font-inter">
                  {spec.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Limits */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          Лимиты и ограничения
        </h2>
        <div className="flex">
          {/* Labels Column */}
          <div className="flex-1">
            {limits.map((limit, index) => (
              <div key={index} className="py-3 pr-4 border-b border-[#4e4e4e]">
                <span className="text-sm text-[#959595] font-inter">{limit.label}</span>
              </div>
            ))}
          </div>
          {/* Values Column */}
          <div className="flex-1">
            {limits.map((limit, index) => (
              <div key={index} className="py-3 border-b border-[#4e4e4e]">
                <span className="text-sm font-medium text-white font-inter">{limit.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prompt Examples */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          Примеры промптов
        </h2>
        <div className="space-y-4">
          {promptExamples.map((example, index) => (
            <PromptExampleCard key={index} title={example.title} prompt={example.prompt} />
          ))}
        </div>
      </div>

      {/* Important Details */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          Важные детали
        </h2>
        <p className="text-sm text-[#959595] font-inter leading-relaxed whitespace-pre-line">
          {details}
        </p>
      </div>

      {/* Ideal For */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white font-inter leading-tight tracking-[-0.012em] mb-3">
          Идеально для
        </h2>
        <ul className="text-sm text-[#959595] font-inter leading-relaxed space-y-1">
          {idealFor.map((item, index) => (
            <li key={index}>* {item}</li>
          ))}
        </ul>
      </div>

      {/* Tip Box */}
      {tip && (
        <div className="p-5 bg-[#212121] rounded-2xl mb-8 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-white font-inter flex-1">
            {tip}
          </p>
          <Link
            href={actionHref}
            className="px-4 py-2.5 bg-[#303030] rounded-xl text-sm font-medium text-white font-inter hover:bg-[#404040] transition-colors whitespace-nowrap"
          >
            Попробовать
          </Link>
        </div>
      )}

      <DocsFooter />
    </DocsShell>
  );
}
