import {
  IconUsers, IconFileText, IconActivity, IconBox,
  IconShoppingCart, IconChartLine, IconHeadset, IconAdjustments,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';

export type FlowNodeType = 'start' | 'process' | 'pipeline' | 'decision' | 'success' | 'fail';
export type FlowSide = 'top' | 'right' | 'bottom' | 'left';

export type FlowNode = {
  id: string;
  type: FlowNodeType;
  label: string;
  x: number;
  y: number;
  w?: number;
  h?: number;
};

export type FlowEdge = {
  from: string;
  to: string;
  label?: string;
  fromSide?: FlowSide;
  toSide?: FlowSide;
};

export type FlowChart = {
  width: number;
  height: number;
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export type ModuleSpec = {
  slug: string;
  title: string;
  tagline: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  imageUrl: string;
  imageAlt: string;

  overview: {
    purpose: string;
    problem: string;
    importance: string;
  };

  workflow: string[];
  flowDiagram: string[];      // legacy — kept for backwards compat with old page
  flowchart: FlowChart;       // new — proper SVG flowchart with nodes + edges
  visualDescription: string;

  features: { title: string; impact: string }[];

  useCase: {
    company: string;
    scenario: string;
    outcome: string;
  };

  businessImpact: {
    timeSaved: string;
    costOptimization: string;
    errorReduction: string;
    scalability: string;
  };

  integrations: { module: string; direction: 'in' | 'out' | 'both'; note: string }[];
};

const ICON_SIZE = 24;

export const MODULES: ModuleSpec[] = [
  /* ─── 1. CRM & Enquiries ───────────────────────────────── */
  {
    slug: 'crm-enquiries',
    title: 'CRM & Enquiries',
    tagline: 'Capture every prospect. Never lose another deal to a forgotten follow-up.',
    icon: <IconUsers size={ICON_SIZE} />,
    iconBg: '#eef4ff',
    iconColor: '#1E3A5F',
    imageUrl: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Sales team meeting with a customer',
    flowchart: {
      width: 900, height: 260,
      nodes: [
        { id: 'a', type: 'start',    label: 'Lead Source',          x: 35,  y: 40 },
        { id: 'b', type: 'process',  label: 'Enquiry Captured',     x: 175, y: 40 },
        { id: 'c', type: 'process',  label: 'Owner Assigned',       x: 315, y: 40 },
        { id: 'd', type: 'decision', label: 'Qualified?',           x: 465, y: 28 },
        { id: 'e', type: 'pipeline', label: 'Pipeline → Quote',     x: 595, y: 40 },
        { id: 'f', type: 'success',  label: 'Closed Won',           x: 735, y: 40 },
        { id: 'g', type: 'fail',     label: 'Nurture / Dropped',    x: 465, y: 175 },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'd' },
        { from: 'd', to: 'e', label: 'Yes' },
        { from: 'e', to: 'f' },
        { from: 'd', to: 'g', label: 'No', fromSide: 'bottom', toSide: 'top' },
      ],
    },

    overview: {
      purpose: 'A single, structured intake for every inbound enquiry — phone, email, website form, or walk-in — so leads enter a defined pipeline the moment they appear, not a salesperson\'s spreadsheet.',
      problem: 'Most manufacturing sales teams run on email threads and Excel. Enquiries fall through the cracks, ownership is unclear, follow-ups slip, and there is no honest view of which channels actually convert.',
      importance: 'In manufacturing the gap between an enquiry and a quotation is where most revenue leaks. A lost enquiry is a lost contract, often worth lakhs. Pipeline discipline at the top of the funnel is the highest-leverage sales investment a CEO can make.',
    },

    workflow: [
      'Enquiry captured from any source (web form, inbound call, email, factory walk-in) and auto-tagged with channel, region, and product interest.',
      'Contact and company records are created or matched against existing customers — no duplicates.',
      'Enquiry is auto-assigned to a sales owner using rules (region, product line, current load) with an SLA timer.',
      'Sales owner qualifies the enquiry against your defined criteria (volume, budget, decision timeline) and updates the pipeline stage.',
      'Activity log captures every call, email, and meeting against the lead — ownership of context lives in the system, not a person\'s inbox.',
      'Qualified leads convert in one click into a quotation, carrying contact, items of interest, and notes forward without re-entry.',
    ],

    flowDiagram: ['Enquiry Source', 'Contact Capture', 'Auto-Assignment', 'Qualification', 'Pipeline Stage', 'Quotation'],

    visualDescription: 'A Kanban-style pipeline view (New → Qualifying → Proposal → Negotiation → Closed). Each card shows company name, deal size estimate, days-in-stage, and owner avatar. A right-side detail drawer reveals contact, activity timeline, and a "Convert to Quotation" button. Top-of-page KPI tiles: New This Week, Avg. Time-to-Quote, Conversion Rate.',

    features: [
      { title: 'Multi-channel intake', impact: 'Web forms, email parsing, and manual entry feed one inbox — no enquiry gets routed to the wrong owner.' },
      { title: 'SLA timers per stage', impact: 'Stale leads are flagged automatically — a 48-hour silence becomes visible to managers, not invisible to the company.' },
      { title: 'Source attribution', impact: 'Know exactly which trade show, referral, or campaign produced revenue — invest the next budget rupee accordingly.' },
      { title: 'Owner reassignment with full history', impact: 'When sales staff change, the lead\'s context moves with the record — no knowledge loss.' },
      { title: 'One-click quotation handoff', impact: 'Removes 10–15 minutes of re-keying per qualified lead and eliminates transcription errors.' },
    ],

    useCase: {
      company: 'A mid-sized forging unit in Pune averaging 18 inbound enquiries per week across phone, email, and trade shows.',
      scenario: 'Before adoption, three of five large enquiries from a Q3 trade show went un-followed-up because the lead capture sheet sat with one manager who fell ill. The company learned about the lost deals only when a competitor announced a contract win.',
      outcome: 'After deployment, every enquiry is auto-assigned within 30 minutes with an SLA reminder. Conversion from enquiry to quotation rose from 41% to 58% in two quarters; the trade show ROI calculation is now defensible to the board.',
    },

    businessImpact: {
      timeSaved: '2–3 hours per salesperson per day previously spent reconciling spreadsheets.',
      costOptimization: 'Eliminates duplicate-CRM tooling and recovers an estimated 12–18% of historically lost enquiries.',
      errorReduction: 'Zero leads dropped from inbox; full audit trail of who-did-what-when.',
      scalability: 'Onboard new sales territories or product lines without process redesign — rules adapt, the workflow stays.',
    },

    integrations: [
      { module: 'Quotation Builder', direction: 'out', note: 'Convert qualified leads in one click — contact, items, and notes auto-populate.' },
      { module: 'Customer Management', direction: 'both', note: 'Existing customers are matched to avoid duplicates; new customers flow back as records.' },
      { module: 'Reports & Analytics', direction: 'out', note: 'Pipeline metrics, conversion funnels, and source ROI feed directly into executive dashboards.' },
    ],
  },

  /* ─── 2. Quotation Builder ─────────────────────────────── */
  {
    slug: 'quotation-builder',
    title: 'Quotation Builder',
    tagline: 'Build defensible, version-controlled quotations in minutes — not hours.',
    icon: <IconFileText size={ICON_SIZE} />,
    iconBg: '#eef4ff',
    iconColor: '#1E3A5F',
    imageUrl: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'A signed business contract on a wooden desk',
    flowchart: {
      width: 900, height: 260,
      nodes: [
        { id: 'a', type: 'start',    label: 'Customer / Enquiry',  x: 35,  y: 40 },
        { id: 'b', type: 'process',  label: 'Add Line Items',      x: 175, y: 40 },
        { id: 'c', type: 'process',  label: 'Discounts + Tax',     x: 315, y: 40 },
        { id: 'd', type: 'decision', label: 'Approval Needed?',    x: 465, y: 28 },
        { id: 'e', type: 'pipeline', label: 'Sent to Client',      x: 595, y: 40 },
        { id: 'f', type: 'success',  label: 'Order Confirmed',     x: 735, y: 40 },
        { id: 'g', type: 'process',  label: 'Manager Reviews',     x: 465, y: 175 },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'd' },
        { from: 'd', to: 'e', label: 'No' },
        { from: 'e', to: 'f' },
        { from: 'd', to: 'g', label: 'Yes', fromSide: 'bottom', toSide: 'top' },
      ],
    },

    overview: {
      purpose: 'Construct line-item-accurate quotations with reusable item catalogs, tiered discounts, GST-compliant tax handling, version control, and an approval chain that fits how your company actually negotiates.',
      problem: 'Manual Excel quotations are error-prone, lose pricing history, slow approvals, and produce inconsistent customer-facing documents. Negotiations drag because no one trusts which version is current.',
      importance: 'A 1% pricing error on a Rs 25-lakh quotation is Rs 25,000 of margin — gone. Version chaos costs deals when a customer compares two different "final" quotes from your team. Speed and precision at this stage compound directly into win-rate.',
    },

    workflow: [
      'Start from a converted enquiry or a blank quote. Customer record auto-fills.',
      'Pick line items from your central catalog with current pricing, or define one-off items inline.',
      'Apply tiered discounts at line, category, or quote level with full audit trail of who approved what.',
      'Tax engine computes GST (CGST/SGST/IGST) based on customer state and item HSN — no manual mapping.',
      'Preview the customer-facing PDF in real time; tweak terms, validity period, and payment schedule.',
      'Route to approver if discount or value crosses threshold; approver signs off in-app.',
      'Send via email with tracking, or share to the Client Portal for in-platform acceptance.',
      'Customer revisions clone the prior version — full diff history is preserved.',
      'On acceptance, convert in one click to a Sales Order; quote becomes immutable.',
    ],

    flowDiagram: ['Enquiry / Customer', 'Item Catalog', 'Pricing & Discounts', 'Tax Calculation', 'Preview', 'Approval', 'Send / Portal', 'Revision or Order'],

    visualDescription: 'Two-pane layout: left pane is the line-item table (item, qty, rate, discount, tax, total), right pane is a sticky pricing summary and a thumbnail of the rendered PDF. Top toolbar shows version number and approval status. Bottom-right action: "Send for Approval" or "Convert to Order". Highlight version-history dropdown ("V3 — Edited by Anil, 2 Apr") near the header.',

    features: [
      { title: 'Reusable item catalog', impact: 'Standardised pricing across the sales team — no more "what did we quote them last time?" hunts.' },
      { title: 'Tiered discount engine', impact: 'Bulk discounts, customer-tier discounts, and one-off concessions all coexist with a clean audit trail.' },
      { title: 'GST-compliant tax engine', impact: 'CGST/SGST/IGST computed per state and HSN — clean filings, fewer disputes.' },
      { title: 'Version control with diff', impact: 'Compare V1 vs V4 line by line; defend pricing decisions to the customer or the boss.' },
      { title: 'Approval thresholds', impact: 'Discounts above a configurable percent route to the right approver — no rogue concessions.' },
      { title: 'One-click order conversion', impact: 'Accepted quote becomes a Sales Order with zero re-keying — the order is provably what the customer agreed to.' },
    ],

    useCase: {
      company: 'A Tier-2 auto-component supplier with eight active customers, each negotiating on multiple variants per RFQ.',
      scenario: 'A long-standing customer asked for eight pricing variants on the same SKU set within 48 hours. Building each variant in Excel took roughly 45 minutes, and a wrong copy-paste led to one quote being sent with stale freight numbers — an embarrassing call followed.',
      outcome: 'Using the clone-and-tweak flow, the eight variants were prepared in under 25 minutes total, all versioned, all internally consistent. The deal closed on V6 — and the team has the full negotiation trail for the customer\'s annual price-review audit.',
    },

    businessImpact: {
      timeSaved: 'Average quote turnaround drops from ~90 minutes to ~12 minutes.',
      costOptimization: 'Recovers 0.5–2% of lost margin from manual pricing errors and unauthorised discounts.',
      errorReduction: 'Zero math errors. GST calculations always defensible at audit.',
      scalability: 'A two-person sales team can sustain 4× quote volume without adding headcount.',
    },

    integrations: [
      { module: 'CRM & Enquiries', direction: 'in', note: 'Qualified leads arrive pre-populated with customer and items of interest.' },
      { module: 'Inventory Management', direction: 'in', note: 'Catalog item pricing and current stock surface during quote build.' },
      { module: 'Sales Orders', direction: 'out', note: 'Accepted quote converts to an order with locked pricing and terms.' },
      { module: 'Client Portal', direction: 'out', note: 'Customer reviews and accepts quotes inside the portal — no email back-and-forth.' },
    ],
  },

  /* ─── 3. Job Cards ─────────────────────────────────────── */
  {
    slug: 'job-cards',
    title: 'Job Cards',
    tagline: 'Drive production from a digital job card — every stage, every station, in real time.',
    icon: <IconActivity size={ICON_SIZE} />,
    iconBg: '#eef4ff',
    iconColor: '#1E3A5F',
    imageUrl: 'https://images.unsplash.com/photo-1565514020179-026b92b84bb6?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Operator at a CNC machine on the production floor',
    flowchart: {
      width: 900, height: 260,
      nodes: [
        { id: 'a', type: 'start',    label: 'Confirmed Order',     x: 35,  y: 40 },
        { id: 'b', type: 'process',  label: 'BOM Explosion',       x: 175, y: 40 },
        { id: 'c', type: 'process',  label: 'Job Card Created',    x: 315, y: 40 },
        { id: 'd', type: 'pipeline', label: 'Stage Routing',       x: 455, y: 40 },
        { id: 'e', type: 'decision', label: 'QC Pass?',            x: 605, y: 28 },
        { id: 'f', type: 'success',  label: 'Dispatch Ready',      x: 735, y: 40 },
        { id: 'g', type: 'fail',     label: 'Rework / Scrap',      x: 605, y: 175 },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'd' },
        { from: 'd', to: 'e' },
        { from: 'e', to: 'f', label: 'Pass' },
        { from: 'e', to: 'g', label: 'Fail', fromSide: 'bottom', toSide: 'top' },
      ],
    },

    overview: {
      purpose: 'Replace paper job cards with a structured digital workflow that explodes the BOM, routes work through defined stages, captures station-level check-ins, gates quality, and exposes bottlenecks while they are still fixable.',
      problem: 'Paper job cards get lost on the shop floor, status calls take an hour to triangulate, and bottlenecks are invisible until the customer escalates. Plant managers run on gut feel, not data.',
      importance: 'A factory\'s throughput is set by its slowest visible bottleneck. If you can\'t see the bottleneck, you can\'t fix it. Job-card visibility is the single biggest unlock for operational discipline in a manufacturing business.',
    },

    workflow: [
      'A confirmed Sales Order generates a job card automatically; the BOM explodes into a staged production plan.',
      'Each stage is assigned a workstation, an operator (or pool), and an estimated cycle time.',
      'Operators check in / check out at each stage on a tablet at the station — the timestamp is the truth.',
      'Material consumption is recorded against the job card and deducted from inventory live.',
      'Quality gates between stages either pass the unit forward, mark for rework, or scrap with a reason code.',
      'Real-time dashboard shows every active job card, its current stage, time-in-stage vs target, and any blockers.',
      'On final QC approval, the job card is closed and the unit is queued for dispatch.',
    ],

    flowDiagram: ['Sales Order', 'BOM Explosion', 'Job Card Created', 'Stage Routing', 'Station Check-in', 'QC Gate', 'Completion', 'Dispatch Queue'],

    visualDescription: 'Two views: (1) shop-floor tablet view with one large job card showing current stage, "Check In" / "Check Out" buttons, material list, and a Pass / Rework / Scrap action; (2) plant-manager dashboard with a horizontal swim-lane per active job card across stages. Cards turn amber when time-in-stage exceeds target, red when blocked. A bottleneck chart at the top ranks stages by average dwell.',

    features: [
      { title: 'Automatic BOM explosion', impact: 'No manual planning per order — the production plan is derived from the engineering BOM and the order quantity.' },
      { title: 'Station check-in / check-out', impact: 'Every minute of production is attributed to a station and operator — basis for OEE, cycle-time analysis, and incentives.' },
      { title: 'Quality gates with reason codes', impact: 'Scrap and rework are categorised — defect Pareto analysis becomes possible without a separate QMS.' },
      { title: 'Live bottleneck heatmap', impact: 'Plant manager spots the slow stage in seconds, not in a Monday-morning review of last week\'s data.' },
      { title: 'Mobile-first shop-floor UI', impact: 'Operators with greasy hands and a ruggedized tablet can drive the system — no desktop, no paper.' },
      { title: 'Material consumption sync', impact: 'Inventory deductions happen at consumption, not at order close — stock levels reflect reality.' },
    ],

    useCase: {
      company: 'A precision-machining shop in Bengaluru running 12 CNC stations across three shifts.',
      scenario: 'Daily output had plateaued for nine months. Paper travelers showed every stage as "in progress" by end of shift, but no one could explain why. A six-month internal study using stopwatches narrowed the issue to "somewhere in finishing".',
      outcome: 'Within two weeks of going live, the bottleneck dashboard pointed to Stage 4 (deburring) holding an average 6.2 hours of WIP against a 1.5-hour target — caused by one station\'s fixture wearing out. A Rs 12,000 fixture replacement raised throughput 22%.',
    },

    businessImpact: {
      timeSaved: 'Plant-manager status calls reduced by ~70%. Shop-floor walkabouts shift from "what\'s happening" to "what needs decision".',
      costOptimization: '15–25% throughput gain from bottleneck removal in the first 90 days at most plants.',
      errorReduction: 'Scrap rates traceable to root cause — typically halve within two quarters of disciplined gate logging.',
      scalability: 'Adding a new product line means defining its stages once — the platform routes every order through that template.',
    },

    integrations: [
      { module: 'Sales Orders', direction: 'in', note: 'A confirmed order spawns a job card with the right BOM and quantity.' },
      { module: 'Inventory Management', direction: 'both', note: 'Raw material consumption deducts stock; produced units add to finished-goods stock.' },
      { module: 'Dispatch Tracking', direction: 'out', note: 'Closed job cards queue for dispatch with full traceability.' },
      { module: 'Reports & Analytics', direction: 'out', note: 'OEE, cycle time, scrap reasons feed the production dashboard.' },
    ],
  },

  /* ─── 4. Inventory Management ──────────────────────────── */
  {
    slug: 'inventory-management',
    title: 'Inventory Management',
    tagline: 'Real-time stock truth across raw materials, WIP, and finished goods.',
    icon: <IconBox size={ICON_SIZE} />,
    iconBg: '#eef4ff',
    iconColor: '#1E3A5F',
    imageUrl: 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Stocked warehouse aisle with organised inventory',
    flowchart: {
      width: 900, height: 260,
      nodes: [
        { id: 'a', type: 'start',    label: 'Goods Receipt',           x: 35,  y: 40 },
        { id: 'b', type: 'process',  label: 'Bin Allocation',          x: 175, y: 40 },
        { id: 'c', type: 'pipeline', label: 'Live Stock Ledger',       x: 315, y: 40 },
        { id: 'd', type: 'process',  label: 'Job Card Consumes',       x: 455, y: 40 },
        { id: 'e', type: 'decision', label: 'Below Reorder?',          x: 605, y: 28 },
        { id: 'f', type: 'success',  label: 'Continue Tracking',       x: 735, y: 40 },
        { id: 'g', type: 'process',  label: 'Auto-Indent to Procurement', x: 575, y: 175, w: 180 },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'd' },
        { from: 'd', to: 'e' },
        { from: 'e', to: 'f', label: 'No' },
        { from: 'e', to: 'g', label: 'Yes', fromSide: 'bottom', toSide: 'top' },
      ],
    },

    overview: {
      purpose: 'A live, multi-warehouse stock ledger covering raw materials, work-in-progress, and finished goods — with batch and serial tracking, automatic reorder triggers, and cycle-count workflows.',
      problem: 'Stock-outs halt production. Surplus inventory locks up cash. Manual ledgers are always at least a shift behind reality. Procurement, production, and sales each maintain their own numbers — and disagree.',
      importance: 'Inventory is usually the second-largest line on a manufacturing balance sheet after fixed assets. A 10% reduction in carrying cost frees working capital that can fund the next product line or shift expansion. And a single avoided stock-out can save a customer relationship worth crores.',
    },

    workflow: [
      'Stock arrives via a Goods Receipt against a Purchase Order — quantity, batch, and (optional) serial captured at the gate.',
      'Items are placed in defined warehouse bins; the system tracks location, not just totals.',
      'Job cards consume material at the moment of consumption — stock deducts in real time, not at end-of-shift.',
      'Reorder points and minimum-on-hand thresholds trigger automatic indents to procurement when breached.',
      'Cycle counts run on schedule (full warehouse or by category); discrepancies raise a variance with a reason field.',
      'Finished goods enter stock as job cards close; available-to-promise quantities update for the sales team in the same instant.',
    ],

    flowDiagram: ['Goods Receipt', 'Bin Allocation', 'Live Ledger', 'Job-Card Consumption', 'Reorder Trigger', 'Cycle Count', 'Available-to-Promise'],

    visualDescription: 'Stock dashboard: a searchable item grid with columns for current stock, allocated, available, reorder point, and lead time. Multi-warehouse selector at the top. Low-stock items are colour-banded (amber within 10% of reorder, red below). A side panel shows the transaction ledger for any selected item — every receipt, consumption, transfer, and adjustment with timestamp and user.',

    features: [
      { title: 'Multi-warehouse, multi-bin', impact: 'Track stock per location accurately — pickers go to the right bin first time, no rework.' },
      { title: 'Batch and serial traceability', impact: 'Trace a defective unit back to its raw-material batch in seconds — critical for pharma, food, automotive recalls.' },
      { title: 'Live consumption sync', impact: 'No "ghost stock" — what the system says is on hand is what is on the floor.' },
      { title: 'Automatic reorder triggers', impact: 'Procurement gets indents the moment thresholds are crossed — no late-night discoveries of zero stock.' },
      { title: 'Cycle-count workflow', impact: 'Replaces annual full-stock-take chaos with rolling counts — variances stay small and explainable.' },
      { title: 'Audit-grade transaction ledger', impact: 'Every movement is logged with user, timestamp, and reason — clean financial audits.' },
    ],

    useCase: {
      company: 'A pharmaceutical packaging plant with 380 SKUs across raw cartons, foils, and labels — many with strict expiry windows.',
      scenario: 'In the prior year, the plant wrote off Rs 8.2 lakh of expired raw material — printed cartons for SKUs that were discontinued mid-quarter and forgotten in a back-row bin. No one was responsible because no one had visibility.',
      outcome: 'With expiry-aware FEFO (first-expiry-first-out) picking and an automated 60-day-to-expiry alert, write-offs in the following year totalled Rs 1.1 lakh — an Rs 7 lakh saving against zero new headcount.',
    },

    businessImpact: {
      timeSaved: 'Stock reconciliation cycles compress from 3 days to under 4 hours.',
      costOptimization: '10–18% reduction in inventory carrying cost in the first year for most plants.',
      errorReduction: 'Phantom stock and stock-out surprises both eliminated — production planning becomes trustworthy.',
      scalability: 'Adding a third or fourth warehouse is configuration, not migration.',
    },

    integrations: [
      { module: 'Goods Receipts', direction: 'in', note: 'Verified receipts post to stock automatically.' },
      { module: 'Job Cards', direction: 'out', note: 'Consumption events deduct stock at the moment they occur.' },
      { module: 'Procurement', direction: 'out', note: 'Reorder triggers raise indents without manual escalation.' },
      { module: 'Quotation Builder', direction: 'out', note: 'Available-to-promise visibility prevents over-promising on quotes.' },
    ],
  },

  /* ─── 5. Procurement ───────────────────────────────────── */
  {
    slug: 'procurement',
    title: 'Procurement',
    tagline: 'From indent to PO with full vendor competition — every rupee of spend defensible.',
    icon: <IconShoppingCart size={ICON_SIZE} />,
    iconBg: '#eef4ff',
    iconColor: '#1E3A5F',
    imageUrl: 'https://images.unsplash.com/photo-1494412574745-d61ad9bc7250?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Stacked shipping containers in a logistics yard',
    flowchart: {
      width: 900, height: 260,
      nodes: [
        { id: 'a', type: 'start',    label: 'Indent Raised',         x: 35,  y: 40 },
        { id: 'b', type: 'process',  label: 'Multi-Vendor RFQ',      x: 175, y: 40 },
        { id: 'c', type: 'process',  label: 'Quotes Received',       x: 315, y: 40 },
        { id: 'd', type: 'process',  label: 'Comparison Matrix',     x: 455, y: 40 },
        { id: 'e', type: 'decision', label: 'Within Policy?',        x: 605, y: 28 },
        { id: 'f', type: 'success',  label: 'PO Issued + GRN',       x: 735, y: 40 },
        { id: 'g', type: 'process',  label: 'Escalate Approval',     x: 605, y: 175 },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'd' },
        { from: 'd', to: 'e' },
        { from: 'e', to: 'f', label: 'Yes' },
        { from: 'e', to: 'g', label: 'No', fromSide: 'bottom', toSide: 'top' },
      ],
    },

    overview: {
      purpose: 'Run procurement as a structured pipeline: indent → multi-vendor RFQ → side-by-side quote comparison → vendor selection → purchase order — with vendor scorecards and approval chains baked in.',
      problem: 'RFQs get sent over WhatsApp or email; quotes return in different formats; no one benchmarks systematically. Single-vendor habits creep in, vendor performance is judged on memory, and the company overpays without realising it.',
      importance: 'Direct material spend is typically 40–60% of a manufacturer\'s revenue. Even a 2% sourcing gain at that scale dwarfs most overhead-cost programs. Disciplined procurement also de-risks single-vendor dependence — a hidden killer when the supplier defaults.',
    },

    workflow: [
      'An indent is raised — manually by a department head or automatically from an inventory reorder trigger.',
      'Indent is approved against budget and consolidated with other open indents for the same item.',
      'RFQ is sent simultaneously to a configurable shortlist of vendors with a response deadline.',
      'Vendor quotes return into the platform in a normalised format — line items, unit price, taxes, lead time, payment terms.',
      'A side-by-side comparison matrix highlights the best landed cost (not just headline price) and flags vendor-history red flags.',
      'Selection is approved against the procurement policy — single-vendor selections require a justification.',
      'Purchase order is generated with locked terms, sent to the vendor, and its receipt timeline is tracked.',
      'Vendor performance — on-time delivery, quality acceptance rate, price stability — is logged into the vendor scorecard.',
    ],

    flowDiagram: ['Indent', 'Approval', 'RFQ to Vendors', 'Quotes Received', 'Comparison Matrix', 'Vendor Selection', 'Purchase Order', 'Goods Receipt'],

    visualDescription: 'The comparison view is the centerpiece: a wide matrix with vendors as columns and line items as rows. Each cell shows unit price, lead time, and a small badge for vendor on-time-delivery score. The cheapest landed cost in each row is highlighted; the recommended vendor is calculated and starred. Above the matrix: a strip of past PO data with the same vendors for context.',

    features: [
      { title: 'Multi-vendor RFQ in one click', impact: 'Eliminates the "we already use them" reflex — every spend is competed by default.' },
      { title: 'Landed-cost comparison', impact: 'Compares total cost (price + freight + tax + payment terms) — not just unit price headline.' },
      { title: 'Vendor performance scorecards', impact: 'On-time, quality, and price-stability scores update with every transaction — vendor reviews use data, not anecdote.' },
      { title: 'Approval chains by spend tier', impact: 'A Rs 50K indent and a Rs 50L indent route to different approvers — automatically.' },
      { title: 'Blanket POs and call-offs', impact: 'For repeat raw-material spend, lock annual pricing once and call off as needed — admin overhead falls.' },
      { title: 'Audit-ready procurement trail', impact: 'Every step from indent to receipt is logged — clean ISO and statutory audits.' },
    ],

    useCase: {
      company: 'An engineering company in Coimbatore sourcing roughly 30 SKUs of raw steel, fasteners, and consumables every month from 18 vendors.',
      scenario: 'Quarterly review showed three vendors held 78% of spend, all by inertia. No competitive RFQs had run for two years; nobody believed the team had time to chase fresh quotes.',
      outcome: 'After three months of disciplined RFQ flow, the comparison engine surfaced 9–14% savings across the top 12 SKUs by introducing two new vendors — all within existing quality specs. Annualised saving: Rs 38 lakh on a Rs 4 crore raw-material base.',
    },

    businessImpact: {
      timeSaved: 'RFQ cycle compressed from 5–7 working days to 2–3 days.',
      costOptimization: 'Typical 6–14% direct-material saving in the first year, compounding annually.',
      errorReduction: 'Eliminates "vendor with the wrong PO" episodes — terms locked at PO time.',
      scalability: 'Onboarding a new commodity or new plant\'s sourcing onto the same workflow is configuration, not a project.',
    },

    integrations: [
      { module: 'Inventory Management', direction: 'in', note: 'Reorder triggers create indents automatically.' },
      { module: 'Goods Receipts', direction: 'out', note: 'POs feed the receipt-verification flow.' },
      { module: 'Invoicing & Payments', direction: 'out', note: 'Approved POs reconcile against vendor invoices for three-way matching.' },
      { module: 'Reports & Analytics', direction: 'out', note: 'Spend analysis, vendor concentration, and savings tracking surface on procurement dashboards.' },
    ],
  },

  /* ─── 6. Reports & Analytics ───────────────────────────── */
  {
    slug: 'reports-analytics',
    title: 'Reports & Analytics',
    tagline: 'Run the business from live numbers — not last month\'s Excel.',
    icon: <IconChartLine size={ICON_SIZE} />,
    iconBg: '#eef4ff',
    iconColor: '#1E3A5F',
    imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Live analytics dashboard with charts and KPIs',
    flowchart: {
      width: 900, height: 260,
      nodes: [
        { id: 'a', type: 'start',    label: 'Operational Modules', x: 35,  y: 40 },
        { id: 'b', type: 'process',  label: 'Real-Time Aggregation', x: 165, y: 40, w: 160 },
        { id: 'c', type: 'pipeline', label: 'Role Dashboards',     x: 345, y: 40 },
        { id: 'd', type: 'decision', label: 'Anomaly?',            x: 495, y: 28 },
        { id: 'e', type: 'process',  label: 'Drill to Transaction',x: 615, y: 40, w: 150 },
        { id: 'f', type: 'success',  label: 'Decision Made',       x: 785, y: 40 },
        { id: 'g', type: 'success',  label: 'Routine Operation',   x: 495, y: 175 },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'd' },
        { from: 'd', to: 'e', label: 'Yes' },
        { from: 'e', to: 'f' },
        { from: 'd', to: 'g', label: 'No', fromSide: 'bottom', toSide: 'top' },
      ],
    },

    overview: {
      purpose: 'A unified analytics layer that pulls every transaction across CRM, quotations, production, inventory, procurement, and dispatch into role-specific dashboards — with drill-downs to the underlying record.',
      problem: 'The CEO\'s Monday review uses Friday\'s numbers, hand-stitched in Excel by three different junior analysts who each interpret the data slightly differently. Decisions are made on consensus narratives, not on the numbers themselves.',
      importance: 'Speed of decision-making is a competitive moat. Companies that close the loop from "saw a number" to "made a decision" in hours, not weeks, beat slower competitors regardless of size. Live, trustworthy data is the only way that loop closes fast.',
    },

    workflow: [
      'Every operational transaction in the platform writes to a structured data layer — no ETL, no nightly batch.',
      'Pre-built dashboards for each role (CEO overview, COO production, CFO cashflow, Sales Head pipeline) load on login.',
      'KPI tiles surface the headline number; clicking drills into the chart, then into the transaction list, then into the individual record.',
      'Custom reports are built with a drag-and-drop builder — no SQL required for analysts.',
      'Filters by date, region, product line, customer, and vendor compose freely.',
      'Reports schedule themselves to email on a cadence (Monday 8 AM weekly summary; first-of-month MIS pack).',
      'Exports go to CSV, Excel, and PDF — the auditor and the board both stay happy.',
    ],

    flowDiagram: ['Operational Modules', 'Data Layer', 'Aggregation', 'Role Dashboards', 'Drill-Down', 'Scheduled Distribution'],

    visualDescription: 'Executive dashboard: top row of four KPI tiles (Revenue MTD, Order Backlog, On-time Delivery %, Working Capital). Below: a two-column grid of charts — sales pipeline funnel, production output trend, inventory value over time, top-5 vendors by spend. Right rail: filter chips (date, plant, product line). Every chart is clickable to drill into the underlying transactions.',

    features: [
      { title: 'Pre-built role dashboards', impact: 'CEO, COO, CFO, and Sales Head each get a default that already answers their daily questions.' },
      { title: 'Drill-down to transaction', impact: 'A surprise number on a chart is two clicks away from the underlying invoice or job card — disagreements end at the data.' },
      { title: 'Custom report builder', impact: 'Analysts answer ad-hoc board questions without raising IT tickets — typical turnaround drops from days to minutes.' },
      { title: 'Scheduled email reports', impact: 'Standing reports land in the right inboxes on cadence — no more "did anyone send the weekly?" Mondays.' },
      { title: 'Cross-module joins out of the box', impact: 'Quote-to-cash funnel, scrap-to-vendor mapping, and similar cross-cuts are first-class — not a quarterly Excel project.' },
      { title: 'Audit-grade exports', impact: 'CSV, Excel, and PDF outputs include filter context — auditors trust the lineage.' },
    ],

    useCase: {
      company: 'A textile manufacturer with three plants, four product lines, and a leadership team that meets every Monday.',
      scenario: 'The COO suspected — but could not prove — that one product line was dragging margin. Three quarters of debate produced no decision because each plant\'s spreadsheet told a slightly different story.',
      outcome: 'Within a week of going live, the unified margin dashboard showed Product Line C\'s plant-2 contribution margin had quietly fallen from 18% to 7% over six quarters — masked by Plant 1\'s strong performance. The line was repriced, then partially discontinued. Annualised contribution swing: Rs 1.4 crore.',
    },

    businessImpact: {
      timeSaved: 'Weekly MIS preparation drops from ~12 person-hours to under 30 minutes.',
      costOptimization: 'Bad decisions identified weeks earlier — opportunity cost of delay is the largest hidden gain.',
      errorReduction: 'Single source of truth eliminates "your number / my number" debates.',
      scalability: 'New plants, new product lines, and new business units inherit the dashboard — no rebuild.',
    },

    integrations: [
      { module: 'Every other module', direction: 'in', note: 'CRM, Quotation, Job Cards, Inventory, Procurement, Dispatch, and Invoicing all feed the data layer in real time.' },
    ],
  },

  /* ─── 7. Client Portal ─────────────────────────────────── */
  {
    slug: 'client-portal',
    title: 'Client Portal',
    tagline: 'Give your customers their own window into orders — and stop being a switchboard.',
    icon: <IconHeadset size={ICON_SIZE} />,
    iconBg: '#eef4ff',
    iconColor: '#1E3A5F',
    imageUrl: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'A customer reviewing order updates on a laptop',
    flowchart: {
      width: 900, height: 260,
      nodes: [
        { id: 'a', type: 'start',    label: 'Customer Login',       x: 35,  y: 40 },
        { id: 'b', type: 'process',  label: 'View Quote',           x: 175, y: 40 },
        { id: 'c', type: 'decision', label: 'Accept?',              x: 325, y: 28 },
        { id: 'd', type: 'process',  label: 'Sales Order Created',  x: 455, y: 40, w: 150 },
        { id: 'e', type: 'pipeline', label: 'Track Live Status',    x: 625, y: 40 },
        { id: 'f', type: 'success',  label: 'Delivered',            x: 765, y: 40 },
        { id: 'g', type: 'process',  label: 'Request Revision',     x: 325, y: 175 },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'd', label: 'Yes' },
        { from: 'd', to: 'e' },
        { from: 'e', to: 'f' },
        { from: 'c', to: 'g', label: 'No', fromSide: 'bottom', toSide: 'top' },
      ],
    },

    overview: {
      purpose: 'A white-labeled, branded portal where your customers log in to view active quotations, accept or reject proposals, track live order status, download invoices and dispatch documents, and raise support tickets — all without calling your sales team.',
      problem: 'Sales teams spend a third of their day answering "where is my order?" and "can you resend the invoice?" calls. Customers, meanwhile, feel left in the dark between the PO and the delivery and lose confidence in the relationship.',
      importance: 'The modern B2B buyer expects self-service — they get it from Amazon Business and from international suppliers. Falling short of that bar costs deals, not just call-time. Customer self-service is the highest-leverage move for both customer satisfaction and sales-team productivity.',
    },

    workflow: [
      'Customer receives login credentials when their first quote is shared via portal.',
      'On login, customer lands on a dashboard: active quotations, in-progress orders, recent dispatches.',
      'Quotation view: full line-item detail, accept / reject / request-revision actions, and a comment thread that loops back to your sales team in-app.',
      'Order tracking: live timeline of stages — Confirmed → In Production → QC → Dispatched → Delivered — with expected dates and any flags.',
      'Document library: every invoice, dispatch challan, and certificate downloadable on demand — no email archaeology.',
      'Support tickets: raise an issue, attach photos, get a tracked SLA-bound response.',
      'Mobile-responsive — your customer\'s plant manager checks status from the shop floor.',
    ],

    flowDiagram: ['Customer Login', 'Active Quotes', 'Accept / Negotiate', 'Order Status', 'Document Library', 'Support Tickets'],

    visualDescription: 'Branded portal homepage: customer\'s own logo top-left (white-labeled). Three large status tiles — Open Quotes, Active Orders, Recent Invoices — each with a count badge. Below: an order timeline component for the most recent active order, showing stage progress visually. Right side: a "Need help?" widget that opens the ticket form. The whole portal uses the customer\'s brand colors if the supplier has configured them.',

    features: [
      { title: 'White-label branding', impact: 'Portal carries the supplier\'s brand colors, logo, and domain — feels like a premium part of the relationship.' },
      { title: 'Self-service quote acceptance', impact: 'Customers accept proposals in-app with audit log — closes deals faster than email-PDF cycles.' },
      { title: 'Live order timeline', impact: 'No more status calls — customers see the truth themselves, sales team gets hours back.' },
      { title: 'Document library', impact: 'Invoices, challans, and certificates downloadable any time — accounts payable processing accelerates.' },
      { title: 'Tracked support tickets', impact: 'Issues get an SLA, an owner, and a paper trail — no more "I emailed you last week" disputes.' },
      { title: 'Mobile responsive', impact: 'Works on the phone of a plant manager standing next to a delayed shipment.' },
    ],

    useCase: {
      company: 'An industrial valves manufacturer with about 50 active customers across India and the Gulf.',
      scenario: 'Two members of the sales team estimated they spent 40% of their working hours on customer status and document-resend calls. New deal generation suffered because the team was reactive all day.',
      outcome: 'After portal rollout, status calls dropped 68% in the first quarter and document-resend requests by 84%. The sales team reallocated four working hours per person per day to outbound activity; quarterly new-customer wins rose from 3 to 7.',
    },

    businessImpact: {
      timeSaved: '12–18 hours per salesperson per week recovered from reactive customer service.',
      costOptimization: 'Faster invoice access shortens DSO (days sales outstanding) — directly improves cash position.',
      errorReduction: 'Customer-side disputes have a documented trail — chargebacks and re-issues fall.',
      scalability: 'Customer count can grow 5× without a proportional increase in customer-service headcount.',
    },

    integrations: [
      { module: 'Quotation Builder', direction: 'in', note: 'Quotes shared to portal show with full line-item detail and acceptance actions.' },
      { module: 'Sales Orders', direction: 'in', note: 'Confirmed orders surface in the customer\'s active-orders list.' },
      { module: 'Job Cards', direction: 'in', note: 'Live production stage drives the customer-facing status timeline.' },
      { module: 'Invoicing & Payments', direction: 'in', note: 'Issued invoices appear in the document library immediately.' },
    ],
  },

  /* ─── 8. Control Logic ─────────────────────────────────── */
  {
    slug: 'control-logic',
    title: 'Control Logic',
    tagline: 'Configure how YOUR factory runs — without writing code or waiting on the vendor.',
    icon: <IconAdjustments size={ICON_SIZE} />,
    iconBg: '#eef4ff',
    iconColor: '#1E3A5F',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1400&q=80',
    imageAlt: 'Engineer configuring system controls at a workstation',
    flowchart: {
      width: 900, height: 260,
      nodes: [
        { id: 'a', type: 'start',    label: 'Admin Console',         x: 35,  y: 40 },
        { id: 'b', type: 'process',  label: 'Roles + Permissions',   x: 175, y: 40, w: 150 },
        { id: 'c', type: 'process',  label: 'Workflow Stages',       x: 345, y: 40 },
        { id: 'd', type: 'decision', label: 'Threshold Crossed?',    x: 495, y: 28, w: 130 },
        { id: 'e', type: 'process',  label: 'Routes for Approval',   x: 645, y: 40, w: 150 },
        { id: 'f', type: 'success',  label: 'Action Logged',         x: 815, y: 40, w: 110 },
        { id: 'g', type: 'success',  label: 'Auto-Approved',         x: 505, y: 175 },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'd' },
        { from: 'd', to: 'e', label: 'Yes' },
        { from: 'e', to: 'f' },
        { from: 'd', to: 'g', label: 'No', fromSide: 'bottom', toSide: 'top' },
      ],
    },

    overview: {
      purpose: 'The configuration layer that bends the platform to your operating model — granular role-based permissions, custom approval chains, configurable workflow stages, conditional notifications, and a complete audit log of every administrative change.',
      problem: 'Off-the-shelf software forces companies into the vendor\'s opinionated workflow. Every variation needs a support ticket, a quote, and a release cycle. Operating-model agility — re-organising a team, splitting a plant, changing an approval threshold — becomes an IT project.',
      importance: 'No two manufacturing businesses operate identically. The platform that wins long-term is the one whose operating-model rules can be changed by an admin in an hour, not by a vendor in a quarter. That agility is the foundation of every other module\'s value.',
    },

    workflow: [
      'Admin defines roles (e.g. Plant Manager, Sales Executive, QC Inspector) and the permissions each holds at module/sub-module/action granularity.',
      'Approval chains are configured by spend tier, by department, or by transaction type — with named fall-back approvers for absences.',
      'Workflow stages (production stages, lead pipeline stages, procurement stages) are defined per business unit — different plants can have different routing.',
      'Notification rules fire on conditions: "alert the Plant Manager if any job card crosses 4 hours in Stage 3", "ping the CFO when a single PO crosses Rs 25 lakh".',
      'Every administrative change is logged with the user, timestamp, before/after values — full audit trail for ISO, IATF, and statutory reviews.',
      'Changes propagate live — no maintenance windows, no service interruption.',
    ],

    flowDiagram: ['Admin Console', 'Roles & Permissions', 'Approval Chains', 'Workflow Stages', 'Notification Rules', 'Audit Log'],

    visualDescription: 'Three-panel admin console: left panel is the navigation tree (Roles / Permissions / Approvals / Workflows / Notifications / Audit). Center panel is the editor for the selected item — a permission matrix with checkboxes for each role × module × action, or a drag-and-drop canvas for workflow stages with arrows between them. Right panel is the contextual audit log showing recent changes to whatever the admin is editing.',

    features: [
      { title: 'Granular RBAC', impact: 'Permissions go down to the action level — "view orders but not edit", "approve discounts up to 5% only".' },
      { title: 'Multi-tier approval chains', impact: 'Approvals scale by transaction value or by department — no manual escalations, no rogue approvals.' },
      { title: 'Per-business-unit workflows', impact: 'Plant A and Plant B can run different production routings on the same platform — rare but vital for multi-site groups.' },
      { title: 'Conditional notifications', impact: 'Alerts fire on real triggers — silent days don\'t generate noise; problem days surface to the right person immediately.' },
      { title: 'Full administrative audit log', impact: 'Every config change is replayable — clean ISO 9001/IATF 16949 audits, fast root-cause for "who turned that off?" incidents.' },
      { title: 'Live propagation', impact: 'Configuration takes effect the moment it\'s saved — no downtime, no overnight cutover.' },
    ],

    useCase: {
      company: 'An auto-parts group operating four plants — two in Pune, one in Chennai, one in Pithampur — each with slightly different QC and approval norms.',
      scenario: 'The legacy system imposed a single approval threshold across all four plants. Pithampur, a smaller unit, was throttled by Pune\'s thresholds; Chennai, with stricter customer audits, needed an extra QC step Pune did not.',
      outcome: 'Per-plant configuration in Control Logic let the group define each plant\'s thresholds and stages independently. Pithampur\'s small-PO bottleneck disappeared; Chennai\'s extra QC stage was added in one afternoon. The group passed an IATF audit two months later — the audit log made every variant defensible without consultant time.',
    },

    businessImpact: {
      timeSaved: 'Configuration changes in hours, not in vendor-managed release cycles.',
      costOptimization: 'Eliminates ongoing vendor change-request fees and external consultant configuration projects.',
      errorReduction: 'Permission boundaries are explicit — accidental edits by the wrong role become impossible.',
      scalability: 'New plants, new departments, and new business models can be modelled without re-platforming.',
    },

    integrations: [
      { module: 'Every other module', direction: 'out', note: 'Permissions, workflow stages, and approval chains apply to CRM, Quotations, Job Cards, Inventory, Procurement, Dispatch, and Reports — uniformly.' },
    ],
  },
];

export const getModuleBySlug = (slug: string): ModuleSpec | undefined =>
  MODULES.find((m) => m.slug === slug);
