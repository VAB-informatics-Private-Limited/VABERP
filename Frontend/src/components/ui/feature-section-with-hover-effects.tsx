import { cn } from "@/lib/utils";
import {
  IconPhone,
  IconFileText,
  IconTool,
  IconBox,
  IconShoppingCart,
  IconChartBar,
  IconUsers,
  IconSettings,
} from "@tabler/icons-react";

const features = [
  {
    title: "CRM & Enquiries",
    description: "Capture leads, track follow-ups, and nurture customer relationships from first contact to close.",
    icon: <IconPhone size={24} />,
  },
  {
    title: "Quotation Builder",
    description: "Generate professional versioned quotations and convert them to sales orders in one click.",
    icon: <IconFileText size={24} />,
  },
  {
    title: "Manufacturing & Job Cards",
    description: "Full BOM-to-dispatch workflow with job cards, production stages, and real-time tracking.",
    icon: <IconTool size={24} />,
  },
  {
    title: "Inventory Management",
    description: "Manage raw materials, track stock levels, and maintain a complete stock ledger effortlessly.",
    icon: <IconBox size={24} />,
  },
  {
    title: "Procurement",
    description: "Handle purchase indents, manage supplier relationships, and streamline your purchasing process.",
    icon: <IconShoppingCart size={24} />,
  },
  {
    title: "Reports & Analytics",
    description: "Charts, sales funnels, and trend analysis to keep you informed and always ahead.",
    icon: <IconChartBar size={24} />,
  },
  {
    title: "Customer Management",
    description: "Centralised customer profiles with full history, contacts, and communication logs.",
    icon: <IconUsers size={24} />,
  },
  {
    title: "Settings & Control",
    description: "Configure stages, units, templates, and permissions to fit exactly how your business works.",
    icon: <IconSettings size={24} />,
  },
];

export function FeaturesSectionWithHoverEffects() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10 py-10 max-w-7xl mx-auto">
      {features.map((feature, index) => (
        <Feature key={feature.title} {...feature} index={index} />
      ))}
    </div>
  );
}

const Feature = ({
  title,
  description,
  icon,
  index,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  index: number;
}) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r py-10 relative group/feature border-neutral-200",
        (index === 0 || index === 4) && "lg:border-l border-neutral-200",
        index < 4 && "lg:border-b border-neutral-200"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-neutral-50 to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-neutral-50 to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-neutral-500">
        {icon}
      </div>
      <div className="text-base font-semibold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-neutral-200 group-hover/feature:bg-slate-900 transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block text-neutral-800">
          {title}
        </span>
      </div>
      <p className="text-sm text-neutral-500 max-w-xs relative z-10 px-10 leading-relaxed">
        {description}
      </p>
    </div>
  );
};
