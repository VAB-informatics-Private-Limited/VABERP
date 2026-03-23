import { Users, FileText, PackageCheck, ArrowRight } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: <Users className="size-5" />,
    title: 'Add Customers & Capture Enquiries',
    desc: 'Register contacts, log inbound enquiries, and assign follow-up tasks to your team — all in one place.',
  },
  {
    number: '02',
    icon: <FileText className="size-5" />,
    title: 'Create Quotations & Convert to Orders',
    desc: 'Build detailed quotations with line items, apply discounts, get approvals, and convert to orders instantly.',
  },
  {
    number: '03',
    icon: <PackageCheck className="size-5" />,
    title: 'Manufacture, Track & Dispatch',
    desc: 'Generate job cards, move through production stages, track real-time status, and dispatch with full documentation.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 px-6 bg-white">
      <div className="mx-auto max-w-5xl">

        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-900 mb-3">
            How It Works
          </h2>
          <p className="text-gray-400 text-base max-w-md mx-auto">
            Three simple steps that cover your entire manufacturing operation.
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-0">
          {steps.map((step, i) => (
            <div key={step.number} className="flex items-start md:items-center w-full">

              {/* Step card */}
              <div className="flex-1 flex flex-col items-center text-center px-6">
                {/* Number + icon */}
                <div className="relative mb-5">
                  <div className="w-14 h-14 rounded-2xl border border-neutral-200 bg-white flex items-center justify-center text-neutral-700 shadow-sm">
                    {step.icon}
                  </div>
                  <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2 leading-snug max-w-[180px]">
                  {step.title}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed max-w-[200px]">
                  {step.desc}
                </p>
              </div>

              {/* Arrow between steps */}
              {i < steps.length - 1 && (
                <div className="hidden md:flex flex-shrink-0 items-center text-neutral-300">
                  <ArrowRight className="size-5" />
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
