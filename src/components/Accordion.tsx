import { ReactNode } from 'react';

type AccordionProps = {
  title: string;
  children: ReactNode;
};

export const Accordion = ({ title, children }: AccordionProps) => {
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer list-none text-base font-semibold text-slate-800">
        {title}
      </summary>
      <div className="mt-3 space-y-2 text-sm text-slate-600">{children}</div>
    </details>
  );
};
