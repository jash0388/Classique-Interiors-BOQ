import { Router, type IRouter } from "express";

type Project = {
  id: number; code: string; name: string; client: string; location: string;
  projectType: string; status: string; value: number; cost: number; margin: number;
  manager: string; updatedAt: string; isDemo: boolean;
};
type Vendor = { id: number; name: string; company: string; category: string; phone: string; email: string; rating: number; active: boolean; isDemo: boolean };
type Boq = { id: number; projectId: number; projectName: string; version: string; status: string; itemCount: number; total: number; updatedAt: string };
type Quotation = { id: number; vendor: string; project: string; number: string; date: string; total: number; validity: string; status: string; leadTime: string; isDemo: boolean };
type Activity = { id: number; actor: string; action: string; target: string; time: string; tone: string };

const now = () => new Date().toISOString();
let projects: Project[] = [
  { id: 1, code: "CI-2026-014", name: "IBM India Workplace Refresh", client: "IBM India", location: "Hyderabad", projectType: "Corporate Interiors", status: "Execution", value: 12450000, cost: 9324000, margin: 25.1, manager: "Saurabh Mehta", updatedAt: "Today, 10:42 AM", isDemo: true },
  { id: 2, code: "CI-2026-018", name: "ADC Hyderabad Fit-out", client: "Amazon Development Centre", location: "Hyderabad", projectType: "Commercial Fit-out", status: "BOQ Preparation", value: 7850000, cost: 5630000, margin: 28.3, manager: "Ajay Rao", updatedAt: "Yesterday, 4:18 PM", isDemo: true },
  { id: 3, code: "CI-2026-009", name: "Nucleus Office Expansion", client: "Nucleus Software", location: "Bengaluru", projectType: "Office Interiors", status: "Management Approval", value: 4120000, cost: 3020000, margin: 26.7, manager: "Jashwanth Kumar", updatedAt: "Aug 19, 2026", isDemo: true },
  { id: 4, code: "CI-2026-021", name: "Citi Collaboration Floors", client: "Citi India", location: "Pune", projectType: "Corporate Interiors", status: "Vendor RFQ", value: 9620000, cost: 7410000, margin: 23.0, manager: "Saurabh Mehta", updatedAt: "Aug 18, 2026", isDemo: true },
];
let vendors: Vendor[] = [
  { id: 1, name: "Ramesh Kumar", company: "StudioBuild Materials", category: "Civil & Finishes", phone: "+91 98480 11223", email: "ramesh@studiobuild.in", rating: 4.8, active: true, isDemo: true },
  { id: 2, name: "Priya Shah", company: "Lumina Electricals", category: "Electrical", phone: "+91 98202 44781", email: "priya@lumina.co.in", rating: 4.6, active: true, isDemo: true },
  { id: 3, name: "Vikram Singh", company: "AcoustiCraft Systems", category: "Acoustics", phone: "+91 99876 33109", email: "vikram@acousticraft.com", rating: 4.4, active: true, isDemo: true },
  { id: 4, name: "Neha Menon", company: "Greenply Projects", category: "Joinery & Furniture", phone: "+91 98451 22761", email: "neha@greenplyprojects.in", rating: 4.2, active: true, isDemo: true },
];
let boqs: Boq[] = [
  { id: 1, projectId: 1, projectName: "IBM India Workplace Refresh", version: "V3", status: "Internal Review", itemCount: 148, total: 12450000, updatedAt: "Today, 9:24 AM" },
  { id: 2, projectId: 2, projectName: "ADC Hyderabad Fit-out", version: "V2", status: "Draft", itemCount: 96, total: 7850000, updatedAt: "Yesterday, 3:56 PM" },
  { id: 3, projectId: 3, projectName: "Nucleus Office Expansion", version: "V4", status: "Awaiting Approval", itemCount: 72, total: 4120000, updatedAt: "Aug 19, 2026" },
];
let quotations: Quotation[] = [
  { id: 1, vendor: "StudioBuild Materials", project: "IBM India Workplace Refresh", number: "SB/26/184", date: "Aug 20, 2026", total: 4680000, validity: "30 days", status: "Received", leadTime: "21 days", isDemo: true },
  { id: 2, vendor: "Lumina Electricals", project: "IBM India Workplace Refresh", number: "LE/26/092", date: "Aug 21, 2026", total: 4215000, validity: "45 days", status: "Under Comparison", leadTime: "14 days", isDemo: true },
  { id: 3, vendor: "AcoustiCraft Systems", project: "ADC Hyderabad Fit-out", number: "ACS/26/077", date: "Aug 18, 2026", total: 1890000, validity: "30 days", status: "Negotiation", leadTime: "28 days", isDemo: true },
];
let activity: Activity[] = [
  { id: 1, actor: "Saurabh Mehta", action: "moved BOQ V3 to", target: "Internal Review · IBM India", time: "12 minutes ago", tone: "blue" },
  { id: 2, actor: "Ajay Rao", action: "uploaded quotation from", target: "Lumina Electricals", time: "1 hour ago", tone: "green" },
  { id: 3, actor: "Jashwanth Kumar", action: "created new version", target: "BOQ V4 · Nucleus Office", time: "Yesterday", tone: "purple" },
  { id: 4, actor: "Saurabh Mehta", action: "logged site progress for", target: "IBM India Workplace Refresh", time: "Yesterday", tone: "orange" },
];

const router: IRouter = Router();
router.get("/dashboard", (_req, res) => {
  const totalValue = projects.reduce((sum, p) => sum + p.value, 0);
  const totalCost = projects.reduce((sum, p) => sum + p.cost, 0);
  res.json({
    metrics: { totalProjects: projects.length, activeProjects: projects.filter(p => p.status !== "Closed").length, pendingBoqs: 2, pendingQuotations: 4, pendingApprovals: 3, activePos: 2, siteVisits: 5, executionProjects: projects.filter(p => p.status === "Execution").length, variations: 2, estimatedCost: totalCost, projectValue: totalValue, expectedMargin: 25.6, actualCost: 9324000, actualMargin: 23.1 },
    pipeline: ["Enquiry", "BOQ Preparation", "Vendor RFQ", "Management Approval", "Execution"].map(status => ({ status, count: projects.filter(p => p.status === status).length, value: projects.filter(p => p.status === status).reduce((s, p) => s + p.value, 0) })),
    recentProjects: projects.slice(0, 4), pendingActions: [
      { id: 1, title: "BOQ awaiting quotation", project: "ADC Hyderabad Fit-out", due: "Due today", priority: "high" },
      { id: 2, title: "Management approval required", project: "Nucleus Office Expansion", due: "Due Aug 25", priority: "medium" },
      { id: 3, title: "Site measurement pending", project: "IBM India Workplace Refresh", due: "Due Aug 26", priority: "low" },
      { id: 4, title: "Vendor follow-up pending", project: "Citi Collaboration Floors", due: "Due Aug 27", priority: "medium" },
    ], activity,
  });
});
router.get("/projects", (req, res) => {
  const search = String(req.query.search ?? "").toLowerCase();
  const status = String(req.query.status ?? "");
  res.json(projects.filter(p => (!search || `${p.name} ${p.client} ${p.code}`.toLowerCase().includes(search)) && (!status || p.status === status)));
});
router.post("/projects", (req, res) => {
  const body = req.body ?? {};
  if (!body.name || !body.client || !body.location || !body.status) return res.status(400).json({ error: "Name, client, location and status are required." });
  const project: Project = { id: Math.max(...projects.map(p => p.id), 0) + 1, code: `CI-2026-${String(projects.length + 22).padStart(3, "0")}`, name: body.name, client: body.client, location: body.location, projectType: body.projectType ?? "Interior Project", status: body.status, value: Number(body.value ?? 0), cost: 0, margin: 0, manager: body.manager ?? "Unassigned", updatedAt: "Just now", isDemo: false };
  projects = [project, ...projects]; activity = [{ id: activity.length + 1, actor: "You", action: "created project", target: project.name, time: "Just now", tone: "blue" }, ...activity]; return res.status(201).json(project);
});
router.get("/projects/:id", (req, res) => {
  const project = projects.find(p => p.id === Number(req.params.id)); if (!project) return res.status(404).json({ error: "Project not found" });
  return res.json({ ...project, boqs: boqs.filter(b => b.projectId === project.id), quotations: quotations.filter(q => q.project === project.name), activity });
});
router.patch("/projects/:id", (req, res) => {
  const index = projects.findIndex(p => p.id === Number(req.params.id)); if (index < 0) return res.status(404).json({ error: "Project not found" });
  projects[index] = { ...projects[index], ...req.body, updatedAt: "Just now" }; return res.json(projects[index]);
});
router.get("/vendors", (_req, res) => res.json(vendors));
router.post("/vendors", (req, res) => { const body = req.body ?? {}; if (!body.name || !body.company || !body.category) return res.status(400).json({ error: "Name, company and category are required." }); const vendor = { id: Math.max(...vendors.map(v => v.id), 0) + 1, name: body.name, company: body.company, category: body.category, phone: body.phone ?? "", email: body.email ?? "", rating: 0, active: true, isDemo: false }; vendors = [vendor, ...vendors]; return res.status(201).json(vendor); });
router.get("/boqs", (req, res) => { const projectId = req.query.projectId ? Number(req.query.projectId) : undefined; res.json(boqs.filter(b => !projectId || b.projectId === projectId)); });
router.post("/boqs", (req, res) => { const project = projects.find(p => p.id === Number(req.body?.projectId)); if (!project) return res.status(400).json({ error: "Project not found." }); const boq = { id: Math.max(...boqs.map(b => b.id), 0) + 1, projectId: project.id, projectName: project.name, version: "V1", status: "Draft", itemCount: 0, total: 0, updatedAt: "Just now" }; boqs = [boq, ...boqs]; return res.status(201).json(boq); });
router.post("/boqs/:id/items", (req, res) => { const body = req.body ?? {}; const quantity = Number(body.quantity ?? 0), material = Number(body.materialRate ?? 0), labour = Number(body.labourRate ?? 0); if (!body.code || !body.description) return res.status(400).json({ error: "Code and description are required." }); const item = { id: Date.now(), boqId: Number(req.params.id), code: body.code, description: body.description, specification: body.specification ?? "", category: body.category ?? "Interiors", quantity, unit: body.unit ?? "Nos", materialRate: material, labourRate: labour, totalRate: material + labour, amount: quantity * (material + labour), vendor: body.vendor ?? "", remarks: body.remarks ?? "" }; const boq = boqs.find(b => b.id === item.boqId); if (boq) { boq.itemCount += 1; boq.total += item.amount; boq.updatedAt = "Just now"; } return res.status(201).json(item); });
router.get("/quotations", (_req, res) => res.json(quotations));
router.post("/quotations", (req, res) => { const body = req.body ?? {}; if (!body.vendor || !body.project || !body.number || body.total === undefined) return res.status(400).json({ error: "Vendor, project, quotation number and total are required." }); const q = { id: Math.max(...quotations.map(x => x.id), 0) + 1, vendor: body.vendor, project: body.project, number: body.number, date: "Just now", total: Number(body.total), validity: body.validity ?? "30 days", status: "Received", leadTime: body.leadTime ?? "To confirm", isDemo: false }; quotations = [q, ...quotations]; return res.status(201).json(q); });
router.get("/comparisons", (_req, res) => res.json([{ id: 1, project: "IBM India Workplace Refresh", boq: "BOQ V3", status: "Ready for Review", vendors: 3, lowest: 4215000, updatedAt: "Today, 10:05 AM" }, { id: 2, project: "ADC Hyderabad Fit-out", boq: "BOQ V2", status: "Negotiation", vendors: 2, lowest: 1890000, updatedAt: "Yesterday" }]));
router.get("/activity", (_req, res) => res.json(activity));
export default router;