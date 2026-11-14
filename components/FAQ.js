'use client';

import { useState } from 'react';
import { useLang } from '@/lib/LanguageContext';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import Reveal from '@/components/Reveal';

export default function FAQ() {
  const { t } = useLang();
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section
      id="faq"
      className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 scroll-mt-24"
    >
      <Reveal>
        <h2 className="text-3xl sm:text-4xl font-outfit font-bold text-center text-nc-text1">
          {t.faq.title}
        </h2>
      </Reveal>

      <div className="mt-10 flex flex-col gap-3">
        {t.faq.items.map((item, i) => {
          const open = openIdx === i;
          return (
            <Reveal key={i} delay={i * 80}>
              <div
                className={`rounded-2xl bg-nc-card border transition-colors ${
                  open ? 'border-nc-green/50' : 'border-nc-border'
                }`}
              >
                <button
                  onClick={() => setOpenIdx(open ? -1 : i)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-start"
                  aria-expanded={open}
                >
                  <span className="font-medium text-nc-text1 leading-relaxed">
                    {item.q}
                  </span>
                  <ChevronDownIcon
                    className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${
                      open ? 'rotate-180 text-nc-green' : 'text-nc-text3'
                    }`}
                    strokeWidth={2}
                  />
                </button>
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{
                    gridTemplateRows: open ? '1fr' : '0fr',
                  }}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 pb-4 text-nc-text2 text-sm leading-relaxed">
                      {item.a}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
