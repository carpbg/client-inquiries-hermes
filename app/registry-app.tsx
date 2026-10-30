"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowUp,
  BarChart3,
  Bell,
  BellOff,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Filter,
  LayoutDashboard,
  Loader2,
  LogOut,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  Settings2,
  Trash2,
  UploadCloud,
  UserRound,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast, Toaster } from "sonner";
import { CatalogManager } from "./catalog-manager";
import { SettingsManager } from "./settings-manager";
import { ThemeToggle } from "./theme-toggle";
import { actionLabel, workflowSteps, roleOptions, allowedStatuses, statusLabel, statusCode } from "@/lib/workflow";

type Client = { id: number; name: string; active: boolean };
type Employee = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
  systemRole: string;
  accessRole: "user" | "manager" | "admin";
};
type Inquiry = {
  id: number;
  referenceNo: number;
  year: number;
  client: string;
  clientId: number | null;
  recipientEmployeeId: number | null;
  analystEmployeeId: number | null;
  projectManagerEmployeeId: number | null;
  internalNo: string;
  receivedAt: string;
  offerSentAt: string | null;
  confirmedAt: string | null;
  description: string;
  status: string;
  recipient: string;
  analyst: string;
  evaluationDueAt: string | null;
  projectManager: string;
  statusComment: string;
  implementedAt: string | null;
  folderPath: string;
  requestType: string;
  offerChannel: string;
  offerSentBy: string;
  clientDecision: string;
  pausedFromStatus: string | null;
  lifecycleDecisionAt: string | null;
  lifecycleDecisionBy: string;
  reviewAt: string | null;
  invoiceNo: string;
  invoiceDate: string | null;
  invoiceSentAt: string | null;
  decisionDueAt?: string | null;
  decisionOverdue?: boolean;
};
type InquiryDocument = {
  id: number;
  category: string;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: string;
  note: string;
};
type ReportCriteria = {
  client?: string;
  status?: string;
  requestType?: string;
  analyst?: string;
  pm?: string;
  from?: string;
  to?: string;
  days?: string;
};
type ReportResult = { headers: string[]; rows: unknown[][] };

const statuses = allowedStatuses;
const tones: Record<string, string> = {
  "1": "bg-amber-100 text-amber-800",
  "2": "bg-orange-100 text-orange-800",
  "3": "bg-violet-100 text-violet-800",
  "4": "bg-blue-100 text-blue-800",
  "5": "bg-cyan-100 text-cyan-800",
  "6": "bg-indigo-100 text-indigo-800",
  "7": "bg-teal-100 text-teal-800",
  "8": "bg-emerald-100 text-emerald-800",
  "9": "bg-slate-200 text-slate-700",
  "10": "bg-slate-200 text-slate-700",
};
const stage = statusLabel;
const toneForStatus = (status: string) =>
  tones[statusCode(status)] || "bg-slate-100 text-slate-700";
const fmt = (d: string | null) =>
  d ? new Intl.DateTimeFormat("bg-BG").format(new Date(d + "T00:00:00")) : "—";

export function RegistryApp({
  currentUser,
  onUserChange,
  onLogout,
}: {
  currentUser: { id: number; email: string; name: string; accessRole: "user" | "manager" | "admin"; notificationsEnabled: boolean };
  onUserChange: (user: { id: number; email: string; name: string; accessRole: "user" | "manager" | "admin"; notificationsEnabled: boolean }) => void;
  onLogout: () => void;
}) {
  const [rows, setRows] = useState<Inquiry[]>([]),
    [employees, setEmployees] = useState<Employee[]>([]),
    [loading, setLoading] = useState(true),
    [registryScope, setRegistryScope] = useState<"mine" | "all">("mine"),
    [employeeFilter, setEmployeeFilter] = useState("me"),
    [roleFilter, setRoleFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [clientFilter, setClientFilter] = useState("all"),
    [mobileFiltersOpen, setMobileFiltersOpen] = useState(false),
    [quickFilter, setQuickFilter] = useState("action"),
    [reportType, setReportType] = useState("all"),
    [reportResult, setReportResult] = useState<ReportResult | null>(null),
    [active, setActive] = useState<Inquiry | null>(null),
    [dialog, setDialog] = useState(false),
    [editing, setEditing] = useState<Inquiry | null>(null);
  const load = async () => {
    try {
      const [r, employeeResponse] = await Promise.all([
          fetch("/api/inquiries"),
          fetch("/api/employees"),
        ]),
        [j, employeeData] = await Promise.all([
          r.json(),
          employeeResponse.json(),
        ]);
      if (!r.ok) throw new Error(j.error);
      setRows(j.inquiries);
      if (employeeResponse.ok) setEmployees(employeeData.employees ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Грешка при зареждане");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const savedScope = window.localStorage.getItem("registry-scope");
    if (savedScope === "all") {
      setRegistryScope("all");
      setEmployeeFilter("all");
      setQuickFilter("all");
    }
  }, []);
  const selectScope = (scope: "mine" | "all") => {
    setRegistryScope(scope);
    setEmployeeFilter(scope === "mine" ? "me" : "all");
    setRoleFilter("all");
    setQuickFilter(scope === "mine" ? "action" : "all");
    window.localStorage.setItem("registry-scope", scope);
  };
  const toggleNotifications = async () => {
    const next = !currentUser.notificationsEnabled;
    const response = await fetch("/api/auth/session", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notificationsEnabled: next }),
    });
    const result = await response.json();
    if (!response.ok) return toast.error(result.error || "Настройката не е записана.");
    onUserChange(result.user);
    toast.success(next ? "Уведомленията са включени." : "Уведомленията са изключени.");
  };
  const selectPersonalMetric = (metric: string) => {
    if (registryScope === "all") {
      setRegistryScope("mine");
      setEmployeeFilter("me");
      setRoleFilter("all");
      window.localStorage.setItem("registry-scope", "mine");
    }
    setQuickFilter(quickFilter === metric ? "all" : metric);
  };
  const activeEmployees = useMemo(
    () =>
      employees
        .filter((employee) => employee.active)
        .sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`,
            "bg",
          ),
        ),
    [employees],
  );
  const selectedEmployeeId =
    employeeFilter === "me"
      ? currentUser.id
      : employeeFilter === "all"
        ? null
        : Number(employeeFilter);
  const isClosed = (inquiry: Inquiry) =>
    ["6.1", "6.2", "6.3", "6.4", "10"].includes(statusCode(inquiry.status));
  const hasRole = (inquiry: Inquiry, employeeId: number, role: string) =>
    ((role === "all" || role === "recipient") &&
      inquiry.recipientEmployeeId === employeeId) ||
    ((role === "all" || role === "analyst") &&
      inquiry.analystEmployeeId === employeeId) ||
    ((role === "all" || role === "project_manager") &&
      inquiry.projectManagerEmployeeId === employeeId);
  const requiresAction = (inquiry: Inquiry, employeeId: number) => {
    const code = statusCode(inquiry.status);
    const employee = employees.find((item) => item.id === employeeId);
    if (code === "1") return inquiry.recipientEmployeeId === employeeId;
    if (["2", "2.1"].includes(code))
      return inquiry.analystEmployeeId === employeeId;
    if (["3", "4", "9"].includes(code))
      return employee?.systemRole === "contract_manager";
    if (code === "5")
      return (
        inquiry.recipientEmployeeId === employeeId ||
        employee?.systemRole === "contract_manager"
      );
    if (code === "6")
      return employee?.systemRole === "department_head";
    if (["7", "8"].includes(code))
      return inquiry.projectManagerEmployeeId === employeeId;
    return false;
  };
  const belongsToSelectedEmployee = (inquiry: Inquiry) =>
    selectedEmployeeId === null ||
    hasRole(inquiry, selectedEmployeeId, roleFilter) ||
    (roleFilter === "all" && requiresAction(inquiry, selectedEmployeeId));
  const isOverdueForSelectedEmployee = (inquiry: Inquiry) =>
    selectedEmployeeId !== null &&
    belongsToSelectedEmployee(inquiry) &&
    !isClosed(inquiry) &&
    (inquiry.decisionOverdue ||
      (!!inquiry.evaluationDueAt &&
        new Date(`${inquiry.evaluationDueAt}T23:59:59`) < new Date()));
  const clientNames = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.client))).sort((a, b) =>
        a.localeCompare(b, "bg"),
      ),
    [rows],
  );
  const filtered = rows.filter(
        (r) =>
          (status === "all" || statusCode(r.status) === statusCode(status)) &&
          (registryScope === "all" || belongsToSelectedEmployee(r)) &&
          (quickFilter === "all" ||
            (quickFilter === "action" &&
              selectedEmployeeId !== null &&
              requiresAction(r, selectedEmployeeId)) ||
            (quickFilter === "received" &&
              selectedEmployeeId !== null &&
              r.recipientEmployeeId === selectedEmployeeId &&
              !isClosed(r)) ||
            (quickFilter === "analysis" &&
              selectedEmployeeId !== null &&
              r.analystEmployeeId === selectedEmployeeId &&
              !isClosed(r)) ||
            (quickFilter === "overdue" && isOverdueForSelectedEmployee(r))) &&
          (clientFilter === "all" || r.client === clientFilter) &&
          (!query ||
            `${r.referenceNo} ${r.client} ${r.description} ${r.internalNo}`
              .toLowerCase()
              .includes(query.toLowerCase())),
      );
  const metricEmployeeId = selectedEmployeeId ?? currentUser.id;
  const personalRows = rows.filter(
    (inquiry) =>
      hasRole(inquiry, metricEmployeeId, "all") ||
      requiresAction(inquiry, metricEmployeeId),
  );
  const actionCount = personalRows.filter(
    (inquiry) =>
      requiresAction(inquiry, metricEmployeeId),
  ).length;
  const receivedCount = personalRows.filter(
    (inquiry) =>
      inquiry.recipientEmployeeId === metricEmployeeId && !isClosed(inquiry),
  ).length;
  const analysisCount = personalRows.filter(
    (inquiry) =>
      inquiry.analystEmployeeId === metricEmployeeId && !isClosed(inquiry),
  ).length;
  const overdueCount = personalRows.filter(
    (inquiry) =>
      !isClosed(inquiry) &&
      (inquiry.decisionOverdue ||
        (!!inquiry.evaluationDueAt &&
          new Date(`${inquiry.evaluationDueAt}T23:59:59`) < new Date())),
  ).length;
  const activeRegistryFilters = [
    employeeFilter !== "me",
    roleFilter !== "all",
    status !== "all",
    clientFilter !== "all",
  ].filter(Boolean).length;
  const exportCsv = () => {
    const h = [
        "№",
        "Година",
        "Клиент",
        "Вътрешен номер",
        "Дата на получаване",
        "Описание",
        "Статус",
        "Получил",
        "Анализатор",
        "Срок за оценка",
        "Отговорен PM",
        "Коментар",
      ],
      data = filtered.map((r) => [
        r.referenceNo,
        r.year,
        r.client,
        r.internalNo,
        r.receivedAt,
        r.description,
        stage(r.status),
        r.recipient,
        r.analyst,
        r.evaluationDueAt ?? "",
        r.projectManager,
        r.statusComment,
      ]);
    const csv =
        "\uFEFF" +
        [h, ...data]
          .map((a) =>
            a.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";"),
          )
          .join("\r\n"),
      a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    a.download = `client_inquiries_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const runReport = async (
    criteria: ReportCriteria = {},
    download = false,
  ) => {
    const [reportResponse, inquiryResponse] = await Promise.all([
      fetch("/api/reports"),
      fetch("/api/inquiries"),
    ]);
    const r = reportResponse;
    const j = await r.json();
    const inquiryData = await inquiryResponse.json();
    if (inquiryResponse.ok && Array.isArray(inquiryData.inquiries))
      j.inquiries = inquiryData.inquiries;
    if (!r.ok)
      return toast.error(j.error || "Грешка при зареждане на справката");
    if (!Array.isArray(j.inquiries) || j.inquiries.length === 0)
      return toast.error("В базата няма налични клиентски запитвания.");
    const source = j.inquiries.filter(
      (x: Inquiry) =>
        (!criteria.client ||
          criteria.client === "all" ||
          x.client === criteria.client) &&
        (!criteria.status ||
          criteria.status === "all" ||
          x.status.trim() === criteria.status.trim()) &&
        (!criteria.requestType ||
          criteria.requestType === "all" ||
          x.requestType === criteria.requestType) &&
        (!criteria.analyst ||
          criteria.analyst === "all" ||
          x.analyst === criteria.analyst) &&
        (!criteria.pm ||
          criteria.pm === "all" ||
          x.projectManager === criteria.pm) &&
        (!criteria.from || x.receivedAt >= criteria.from) &&
        (!criteria.to || x.receivedAt <= criteria.to),
    );
    const rowsFor = (type: string) => {
      if (type === "status")
        return statuses.map((s) => [
          stage(s),
          source.filter((x: Inquiry) => x.status.trim() === s.trim()).length,
        ]);
      if (type === "overdue")
        return source
          .filter(
            (x: Inquiry) =>
              x.evaluationDueAt &&
              Math.floor(
                (Date.now() - new Date(x.evaluationDueAt).getTime()) / 86400000,
              ) >= Number(criteria.days || 0) &&
              !["8", "9", "10"].some((s) => x.status.startsWith(s)),
          )
          .map((x: Inquiry) => [
            x.referenceNo,
            x.client,
            stage(x.status),
            x.evaluationDueAt,
          ]);
      if (type === "expired")
        return source
          .filter(
            (x: Inquiry) =>
              x.offerSentAt &&
              new Date(
                new Date(x.offerSentAt).setMonth(
                  new Date(x.offerSentAt).getMonth() + 3,
                ),
              ) < new Date() &&
              x.status.startsWith("5"),
          )
          .map((x: Inquiry) => [
            x.referenceNo,
            x.client,
            x.offerSentAt,
            stage(x.status),
          ]);
      if (type === "processing")
        return source.map((x: Inquiry) => {
          const days = (a: string, b?: string | null) =>
            b
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(b).getTime() - new Date(a).getTime()) / 86400000,
                  ),
                )
              : "";
          return [
            x.referenceNo,
            x.client,
            days(x.receivedAt, x.offerSentAt),
            days(x.receivedAt, x.confirmedAt),
            days(x.receivedAt, x.implementedAt),
            stage(x.status),
          ];
        });
      if (type === "decisions")
        return source
          .filter((x: Inquiry) =>
            ["6", "6.1", "6.2", "6.3", "6.4"].some((s) => x.status.startsWith(s)),
          )
          .map((x: Inquiry) => [
            x.referenceNo,
            x.client,
            stage(x.status),
            x.confirmedAt ?? "",
            x.statusComment,
          ]);
      if (type === "invoicing")
        return source
          .filter(
            (x: Inquiry) =>
              x.status.startsWith("9") || x.status.startsWith("10"),
          )
          .map((x: Inquiry) => [
            x.referenceNo,
            x.client,
            stage(x.status),
            x.invoiceNo,
            x.invoiceDate ?? "",
          ]);
      if (type === "employees") {
        const names = new Set<string>();
        source.forEach((x: Inquiry) =>
          [x.recipient, x.analyst, x.projectManager]
            .filter(Boolean)
            .forEach((n) => names.add(n)),
        );
        return [...names]
          .sort()
          .map((n) => [
            n,
            source.filter(
              (x: Inquiry) =>
                x.recipient === n || x.analyst === n || x.projectManager === n,
            ).length,
          ]);
      }
      if (type === "documents")
        return source.map((x: Inquiry) => [
          x.referenceNo,
          x.client,
          stage(x.status),
          j.documents
            .filter((d: { inquiryId: number }) => d.inquiryId === x.id)
            .map((d: { category: string }) => d.category)
            .join(", "),
        ]);
      if (type === "history")
        return j.actions.map(
          (x: {
            inquiryId: number;
            action: string;
            actorName: string;
            actorEmail: string;
            details: string;
            createdAt: string;
          }) => [
            x.inquiryId,
            x.action,
            x.actorName,
            x.actorEmail,
            x.details,
            x.createdAt,
          ],
        );
      if (type === "notifications")
        return j.notifications.map(
          (x: {
            inquiryId: number;
            event: string;
            recipients: string;
            deliveryStatus: string;
            errorMessage: string;
            createdAt: string;
          }) => [
            x.inquiryId,
            x.event,
            x.recipients,
            x.deliveryStatus,
            x.errorMessage,
            x.createdAt,
          ],
        );
      return source.map((x: Inquiry) => [
        x.referenceNo,
        x.year,
        x.client,
        x.internalNo,
        x.receivedAt,
        x.requestType,
        stage(x.status),
        x.recipient,
        x.analyst,
        x.projectManager,
        x.evaluationDueAt ?? "",
        x.offerSentAt ?? "",
        x.confirmedAt ?? "",
        x.implementedAt ?? "",
        x.invoiceNo,
        x.invoiceDate ?? "",
      ]);
    };
    const headers: Record<string, string[]> = {
      all: [
        "№",
        "Година",
        "Клиент",
        "Вътрешен номер",
        "Дата",
        "Тип",
        "Статус",
        "Получил",
        "Анализатор",
        "PM",
        "Срок оценка",
        "Изпратена оферта",
        "Потвърдена",
        "Внедрена",
        "Фактура №",
        "Дата фактура",
      ],
      overdue: ["№", "Клиент", "Статус", "Срок оценка"],
      expired: ["№", "Клиент", "Изпратена оферта", "Статус"],
      processing: [
        "№",
        "Клиент",
        "Дни до оферта",
        "Дни до потвърждение",
        "Дни до внедряване",
        "Статус",
      ],
      decisions: ["№", "Клиент", "Статус", "Дата решение", "Коментар"],
      invoicing: ["№", "Клиент", "Статус", "Фактура №", "Дата фактура"],
      status: ["Статус", "Брой"],
      employees: ["Служител", "Брой заявки"],
      documents: ["№", "Клиент", "Статус", "Качени категории"],
      history: [
        "Заявка ID",
        "Действие",
        "Потребител",
        "Имейл",
        "Детайли",
        "Дата",
      ],
      notifications: [
        "Заявка ID",
        "Събитие",
        "Получатели",
        "Статус",
        "Грешка",
        "Дата",
      ],
    };
    const data = rowsFor(reportType);
    setReportResult({ headers: headers[reportType], rows: data });
    if (!download) return;
    const csv =
      "\uFEFF" +
      [headers[reportType], ...data]
        .map((a) =>
          a.map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`).join(";"),
        )
        .join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    a.download = `report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Toaster richColors />
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-[#0d3b66] text-white">
              <ClipboardList className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold leading-tight">
                Клиентски запитвания
              </div>
              <div className="hidden text-xs text-slate-500 min-[390px]:block">
                Процедура CON001 · Регистър 2026
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium">{currentUser.name}</div>
              <div className="text-xs text-slate-500">
                {currentUser.email} · {currentUser.accessRole === "admin" ? "Администратор" : currentUser.accessRole === "manager" ? "Ръководител" : "Потребител"}
              </div>
            </div>
            <div className="hidden min-[390px]:block"><ThemeToggle /></div>
            <Button
              variant="outline"
              size="icon"
              aria-label={currentUser.notificationsEnabled ? "Изключи уведомленията" : "Включи уведомленията"}
              title={currentUser.notificationsEnabled ? "Уведомленията са включени" : "Уведомленията са изключени"}
              onClick={toggleNotifications}
              className={currentUser.notificationsEnabled ? "text-[#0d3b66]" : "text-slate-400"}
            >
              {currentUser.notificationsEnabled ? <Bell /> : <BellOff />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Изход"
              title="Изход"
              onClick={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                onLogout();
              }}
            >
              <LogOut />
            </Button>
            <Button
              className="bg-[#0d3b66] px-3 hover:bg-[#092e50] sm:px-4"
              aria-label="Ново запитване"
              onClick={() => {
                setEditing(null);
                setDialog(true);
              }}
            >
              <Plus />
              <span className="hidden sm:inline">Ново запитване</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1600px] px-3 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-6">
        <Tabs defaultValue="registry" className="gap-6">
          <TabsList className="fixed inset-x-0 bottom-0 z-40 h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-x-0 border-b-0 bg-white/95 p-1.5 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:w-auto sm:rounded-xl sm:border sm:shadow-sm">
            <TabsTrigger value="registry">
              <LayoutDashboard />
              <span>Регистър</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="max-sm:text-slate-400 max-sm:data-[state=active]:bg-slate-100 max-sm:data-[state=active]:text-slate-700 max-sm:data-[state=active]:shadow-none">
              <BarChart3 />
              <span className="hidden sm:inline">Справки</span>
            </TabsTrigger>
            <TabsTrigger value="process" className="max-sm:text-slate-400 max-sm:data-[state=active]:bg-slate-100 max-sm:data-[state=active]:text-slate-700 max-sm:data-[state=active]:shadow-none">
              <FileText />
              <span className="hidden sm:inline">Процедура</span>
            </TabsTrigger>
            {currentUser.accessRole === "admin" && (
              <>
                <TabsTrigger value="catalogs" className="max-sm:text-slate-400 max-sm:data-[state=active]:bg-slate-100 max-sm:data-[state=active]:text-slate-700 max-sm:data-[state=active]:shadow-none">
                  <Users />
                  <span className="hidden sm:inline">Номенклатури</span>
                </TabsTrigger>
                <TabsTrigger value="settings" className="max-sm:text-slate-400 max-sm:data-[state=active]:bg-slate-100 max-sm:data-[state=active]:text-slate-700 max-sm:data-[state=active]:shadow-none">
                  <Settings2 />
                  <span className="hidden sm:inline">Настройки</span>
                </TabsTrigger>
              </>
            )}
          </TabsList>
          <TabsContent value="registry" className="space-y-6">
            <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl font-semibold text-slate-950 dark:text-slate-50">
                  Регистър на клиентските запитвания
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Следете регистъра или задачите на конкретен служител.
                </p>
              </div>
              <div className="grid w-full grid-cols-2 rounded-xl bg-slate-100 p-1 sm:w-[360px] dark:bg-slate-900">
                <Button
                  type="button"
                  variant={registryScope === "mine" ? "default" : "ghost"}
                  className={registryScope === "mine" ? "bg-[#0d3b66] hover:bg-[#092e50]" : ""}
                  onClick={() => selectScope("mine")}
                >
                  Моите задачи
                </Button>
                <Button
                  type="button"
                  variant={registryScope === "all" ? "default" : "ghost"}
                  className={registryScope === "all" ? "bg-[#0d3b66] hover:bg-[#092e50]" : ""}
                  onClick={() => selectScope("all")}
                >
                  Всички заявки
                </Button>
              </div>
            </section>
            <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <Metric
                icon={<ClipboardList />}
                label="За мое действие"
                value={actionCount}
                note="изискват текущо действие"
                active={quickFilter === "action"}
                onClick={() => selectPersonalMetric("action")}
              />
              <Metric
                icon={<UserRound />}
                label="Получени от мен"
                value={receivedCount}
                note="активни заявки като Получател"
                active={quickFilter === "received"}
                onClick={() => selectPersonalMetric("received")}
              />
              <Metric
                icon={<BarChart3 />}
                label="В анализ при мен"
                value={analysisCount}
                note="активни заявки като Анализатор"
                active={quickFilter === "analysis"}
                onClick={() => selectPersonalMetric("analysis")}
              />
              <Metric
                icon={<CalendarClock />}
                label="Просрочени"
                value={overdueCount}
                note="мои активни задачи с изтекъл срок"
                accent="amber"
                active={quickFilter === "overdue"}
                onClick={() => selectPersonalMetric("overdue")}
              />
            </section>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
                <div className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
                  <Input
                    className="pl-9"
                    placeholder="Търси по номер, клиент, описание или HD…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between sm:hidden"
                  onClick={() => setMobileFiltersOpen((open) => !open)}
                  aria-expanded={mobileFiltersOpen}
                >
                  <span className="flex items-center gap-2"><Filter /> Филтри</span>
                  <span className="text-xs text-slate-500">{activeRegistryFilters ? `${activeRegistryFilters} активни` : mobileFiltersOpen ? "Скрий" : "Покажи"}</span>
                </Button>
                <div className={`${mobileFiltersOpen ? "grid" : "hidden"} gap-2 sm:grid sm:grid-cols-2 lg:flex`}>
                  <Select
                    value={employeeFilter}
                    onValueChange={(value) => {
                      setEmployeeFilter(value);
                      setRegistryScope(value === "all" ? "all" : "mine");
                      setQuickFilter(value === "all" ? "all" : "action");
                    }}
                  >
                    <SelectTrigger className="w-full lg:w-[230px]">
                      <UserRound />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="me">Служител: Аз</SelectItem>
                      <SelectItem value="all">Всички служители</SelectItem>
                      {activeEmployees
                        .filter((employee) => employee.id !== currentUser.id)
                        .map((employee) => (
                          <SelectItem key={employee.id} value={String(employee.id)}>
                            {employee.firstName} {employee.lastName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full lg:w-[210px]">
                      <Users />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Всички мои роли</SelectItem>
                      <SelectItem value="recipient">Получател</SelectItem>
                      <SelectItem value="analyst">Анализатор</SelectItem>
                      <SelectItem value="project_manager">Отговорен PM</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-full sm:w-[245px]">
                      <Filter />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Всички статуси</SelectItem>
                      {statuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {stage(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="w-full sm:w-[230px]">
                      <Building2 />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Всички клиенти</SelectItem>
                      {clientNames.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="border-b bg-slate-50/70 px-4 py-3 text-sm text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                {quickFilter === "action"
                  ? "Показани са задачите, по които избраният служител има текущо действие."
                  : "Показани са заявките според избраните филтри."}
              </div>
              <div className="hidden overflow-x-auto sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className="w-20">№</TableHead>
                      <TableHead>Клиент / запитване</TableHead>
                      <TableHead>Получател</TableHead>
                      <TableHead>Анализатор</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Срок</TableHead>
                      <TableHead>PM</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-40 text-center">
                          <Loader2 className="mx-auto animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((r) => (
                        <TableRow
                          key={r.id}
                          className="cursor-pointer odd:bg-slate-50/70 even:bg-white hover:bg-blue-50/70 dark:odd:bg-slate-900/40 dark:even:bg-slate-950"
                          onClick={() => setActive(r)}
                        >
                          <TableCell className="font-mono font-semibold text-[#0d3b66]">
                            {r.referenceNo}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{r.client}</div>
                            <div className="mt-1 max-w-xl truncate text-sm text-slate-500">
                              {r.description}
                            </div>
                          </TableCell>
                          <TableCell>{r.recipient || "—"}</TableCell>
                          <TableCell>{r.analyst || "—"}</TableCell>
                          <TableCell>
                            <Badge
                              className={`${toneForStatus(r.status)} border-0 font-medium`}
                            >
                              {stage(r.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>{fmt(r.evaluationDueAt)}</TableCell>
                          <TableCell>{r.projectManager || "—"}</TableCell>
                          <TableCell>
                            <ChevronRight className="size-4 text-slate-400" />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    {!loading && filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                          Няма заявки, които отговарят на избраните критерии.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="divide-y sm:hidden">
                {loading ? (
                  <div className="grid h-32 place-items-center"><Loader2 className="animate-spin" /></div>
                ) : filtered.length ? (
                  filtered.map((r) => (
                    <button type="button" key={r.id} className="block w-full p-4 text-left odd:bg-slate-50/80 even:bg-white active:bg-blue-50 dark:odd:bg-slate-900/40 dark:even:bg-slate-950" onClick={() => setActive(r)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2"><span className="font-mono text-sm font-bold text-[#0d3b66]">№ {r.referenceNo}</span><span className="truncate font-semibold">{r.client}</span></div>
                          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{r.description}</p>
                        </div>
                        <ChevronRight className="mt-1 size-5 shrink-0 text-slate-400" />
                      </div>
                      <Badge className={`${toneForStatus(r.status)} mt-3 max-w-full whitespace-normal border-0 text-left font-medium`}>{stage(r.status)}</Badge>
                      <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                        <Detail l="Получател" v={r.recipient || "—"} /><Detail l="Анализатор" v={r.analyst || "—"} />
                        <Detail l="Срок" v={fmt(r.evaluationDueAt)} /><Detail l="Отговорен PM" v={r.projectManager || "—"} />
                      </div>
                    </button>
                  ))
                ) : <div className="px-5 py-12 text-center text-sm text-slate-500">Няма заявки, които отговарят на избраните критерии.</div>}
              </div>
              <div className="border-t px-4 py-3 text-sm text-slate-500">
                Показани {filtered.length} от {rows.length} запитвания
              </div>
            </section>
          </TabsContent>
          <TabsContent value="reports">
            <ReportsCards
              rows={rows}
              statuses={statuses}
              reportType={reportType}
              setReportType={setReportType}
              onShow={(criteria) => runReport(criteria, false)}
              onDownload={(criteria) => runReport(criteria, true)}
              result={reportResult}
            />
            {/*
            <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
              <div className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">
                      Справка по текущите филтри
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Експортът включва {filtered.length} записа, клиент и
                      заинтересовани служители.
                    </p>
                  </div>
                  <Button onClick={exportCsv} className="bg-[#0d3b66]">
                    <Download />
                    Експорт CSV
                  </Button>
                </div>
                <div className="mb-6 flex flex-col gap-2 sm:flex-row">
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger className="w-full sm:w-[360px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">1. Всички клиентски запитвания</SelectItem>
                      <SelectItem value="status">2. Запитвания по статус</SelectItem>
                      <SelectItem value="overdue">3. Просрочени запитвания</SelectItem>
                      <SelectItem value="expired">4. Изтекъл тримесечен срок</SelectItem>
                      <SelectItem value="employees">5. Натоварване по служители</SelectItem>
                      <SelectItem value="processing">6. Време/етап „Работи се“</SelectItem>
                      <SelectItem value="decisions">7. Оферти и решения на клиенти</SelectItem>
                      <SelectItem value="invoicing">8. Фактуриране</SelectItem>
                      <SelectItem value="documents">9. Документи по заявки</SelectItem>
                      <SelectItem value="history">10. История на действията</SelectItem>
                      <SelectItem value="notifications">11. Изпратени уведомления</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={exportReport} variant="outline"><Download />Експорт на избраната справка</Button>
                </div>
                {statuses.map((s) => {
                  const n = rows.filter(
                    (r) => r.status.trim() === s.trim(),
                  ).length;
                  return (
                    <div
                      key={s}
                      className="mb-3 grid grid-cols-[minmax(180px,280px)_1fr_32px] items-center gap-3"
                    >
                      <span className="text-sm">{stage(s)}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#1e88a8]"
                          style={{
                            width: `${rows.length ? Math.max(3, (n / rows.length) * 100) : 0}%`,
                          }}
                        />
                      </div>
                      <span className="text-right text-sm font-semibold">
                        {n}
                      </span>
                    </div>
                  );
                })}
              </div>
              <aside className="rounded-2xl bg-[#0d3b66] p-6 text-white shadow-sm">
                <CircleDollarSign className="size-8 text-cyan-300" />
                <h3 className="mt-5 text-lg font-semibold">За фактуриране</h3>
                <div className="mt-2 text-4xl font-semibold">
                  {rows.filter((r) => r.status.startsWith("8")).length}
                </div>
              </aside>
            </section>*/}
          </TabsContent>
          <TabsContent value="process">
            <ProcessView />
          </TabsContent>
          <TabsContent value="catalogs">
            <CatalogManager />
          </TabsContent>
          <TabsContent value="settings">
            <SettingsManager />
          </TabsContent>
        </Tabs>
      </main>
      <FloatingScrollTop />
      <InquirySheet
        inquiry={active}
        currentUser={currentUser}
        onClose={() => setActive(null)}
        onEdit={() => {
          setEditing(active);
          setActive(null);
          setDialog(true);
        }}
        onChanged={async () => {
          setActive(null);
          setLoading(true);
          await load();
        }}
      />
      <InquiryDialog
        open={dialog}
        inquiry={editing}
        onOpenChange={setDialog}
        onSaved={async () => {
          setDialog(false);
          setLoading(true);
          await load();
        }}
      />
    </div>
  );
}

type ReportCriteria = {
  client?: string;
  status?: string;
  requestType?: string;
  analyst?: string;
  pm?: string;
  from?: string;
  to?: string;
  days?: string;
};
const reportCards = [
  [
    "all",
    "Всички клиентски запитвания",
    "Пълен списък с филтри по клиент, статус, дата, тип, анализатор и PM.",
  ],
  [
    "status",
    "Запитвания по статус",
    "Обобщение на броя заявки във всеки етап от процеса.",
  ],
  [
    "overdue",
    "Просрочени запитвания",
    "Заявки без движение над определен брой дни.",
  ],
  [
    "expired",
    "Изтекъл тримесечен срок",
    "Оферти без решение от клиента, изискващи ръчно действие.",
  ],
  [
    "employees",
    "Натоварване по служители",
    "Брой заявки по анализатор, PM, Получил заявката и други роли.",
  ],
  [
    "processing",
    "Време за обработка",
    "Време от регистрация до оценка, оферта, потвърждение и приключване.",
  ],
  [
    "decisions",
    "Оферти и решения на клиенти",
    "Потвърдени, отказани, отложени и приключени без отговор.",
  ],
  [
    "invoicing",
    "Фактуриране",
    "Приети, нефактурирани и фактурирани заявки с номер и дата.",
  ],
  [
    "documents",
    "Документи по заявки",
    "Налични и липсващи оценки, оферти, протоколи и други документи.",
  ],
  [
    "history",
    "История на действията",
    "Кой, кога и какво е направил по всяка заявка.",
  ],
  [
    "notifications",
    "Изпратени уведомления",
    "Получател, дата, шаблон, статус и евентуална грешка при изпращане.",
  ],
] as const;

function ReportsCards({
  rows,
  statuses,
  reportType,
  setReportType,
  onShow,
  onDownload,
  result,
}: {
  rows: Inquiry[];
  statuses: string[];
  reportType: string;
  setReportType: (v: string) => void;
  onShow: (c: ReportCriteria) => void;
  onDownload: (c: ReportCriteria) => void;
  result: ReportResult | null;
}) {
  const [params, setParams] = useState<ReportCriteria>({
    days: "30",
    from: "",
    to: "",
    client: "all",
    status: "all",
    requestType: "all",
    analyst: "all",
    pm: "all",
  });
  const selected =
    reportCards.find((x) => x[0] === reportType) ?? reportCards[0];
  const names = (key: "analyst" | "pm") =>
    Array.from(
      new Set(
        rows
          .map((r) => (key === "analyst" ? r.analyst : r.projectManager))
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "bg"));
  const update = (key: keyof ReportCriteria, value: string) =>
    setParams((x) => ({ ...x, [key]: value }));
  const clearParams = () =>
    setParams({
      days: "30",
      from: "",
      to: "",
      client: "all",
      status: "all",
      requestType: "all",
      analyst: "all",
      pm: "all",
    });
  const activeFilters = [
    params.from && `От дата: ${params.from.split("-").reverse().join(".")}`,
    params.to && `До дата: ${params.to.split("-").reverse().join(".")}`,
    params.client !== "all" && `Клиент: ${stage(params.client || "")}`,
    params.status !== "all" && `Статус: ${params.status}`,
    params.requestType !== "all" &&
      `Тип: ${params.requestType === "service" ? "Услуга" : "Промяна на конфигурация"}`,
    params.analyst !== "all" && `Анализатор: ${params.analyst}`,
    params.pm !== "all" && `Отговорен PM: ${params.pm}`,
    reportType === "overdue" && params.days !== "30" && `Без движение: ${params.days} дни`,
  ].filter(Boolean) as string[];
  return (
    <section className="grid items-start gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="rounded-2xl border bg-white p-5 shadow-sm xl:sticky xl:top-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#0d3b66] text-white">
            <BarChart3 className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Справки и експорти</h2>
            <p className="text-sm text-slate-500">Параметри на справката</p>
          </div>
        </div>

        <div className="mt-5 space-y-2">
          <Label>Справка</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="h-11 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {reportCards.map(([id, title]) => (
                <SelectItem key={id} value={id}>{title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="rounded-xl border border-[#1e88a8]/30 bg-blue-50/70 p-3.5">
            <p className="font-semibold text-[#0d3b66]">{selected[1]}</p>
            <p className="mt-1.5 text-sm leading-5 text-slate-600">{selected[2]}</p>
          </div>
        </div>

        <div className="mt-5 border-t pt-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <CalendarClock className="size-4 text-[#0d3b66]" /> Период
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="space-y-2">
              <Label htmlFor="report-from">От дата</Label>
              <Input id="report-from" type="date" value={params.from} onChange={(e) => update("from", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-to">До дата</Label>
              <Input id="report-to" type="date" value={params.to} onChange={(e) => update("to", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="mt-5 border-t pt-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <ClipboardList className="size-4 text-[#0d3b66]" /> Заявка
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Клиент</Label>
              <Select value={params.client} onValueChange={(v) => update("client", v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всички клиенти</SelectItem>
                  {Array.from(new Set(rows.map((r) => r.client))).map((x) => <SelectItem key={x} value={x}>{stage(x)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select value={params.status} onValueChange={(v) => update("status", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всички статуси</SelectItem>
                    {statuses.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Тип</Label>
                <Select value={params.requestType} onValueChange={(v) => update("requestType", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Всички типове</SelectItem>
                    <SelectItem value="service">Услуга</SelectItem>
                    <SelectItem value="change">Промяна на конфигурация</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {reportType === "overdue" && (
              <div className="space-y-2">
                <Label>Без движение над (дни)</Label>
                <Input type="number" min="0" value={params.days} onChange={(e) => update("days", e.target.value)} />
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 border-t pt-5">
          <div className="mb-3 flex items-center gap-2 font-semibold">
            <Users className="size-4 text-[#0d3b66]" /> Отговорници
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Анализатор</Label>
              <Select value={params.analyst} onValueChange={(v) => update("analyst", v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всички анализатори</SelectItem>
                  {names("analyst").map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Отговорен PM</Label>
              <Select value={params.pm} onValueChange={(v) => update("pm", v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Всички PM</SelectItem>
                  {names("pm").map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={() => onShow(params)}
            className="h-11 border-[#0d3b66] text-[#0d3b66] hover:bg-blue-50 hover:text-[#0d3b66]"
          >
            <Eye /> Покажи
          </Button>
          <Button
            onClick={() => onDownload(params)}
            className="h-11 bg-[#0d3b66] text-white hover:bg-[#0a3155]"
          >
            <Download /> Свали
          </Button>
        </div>
      </aside>

      <div className="min-w-0 space-y-5">
        <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-blue-50 text-[#0d3b66]"><BarChart3 className="size-4" /></div>
                <h2 className="text-xl font-semibold">Резултати</h2>
              </div>
              <p className="mt-3 font-semibold">{result ? `${result.rows.length} резултата` : "Няма изпълнена справка"}</p>
              <p className="mt-1 text-sm text-slate-500">{result ? "Резултатите са готови за преглед и експорт." : "Задайте филтри и натиснете „Изпълни“, за да заредите данни."}</p>
            </div>
            <Badge variant="secondary">{result?.rows.length ?? 0} запитвания</Badge>
          </div>

          <div className="mt-5 flex min-h-14 flex-col gap-3 rounded-xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <Filter className="size-5 shrink-0 text-[#0d3b66]" />
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">Активни филтри:</span>
                {activeFilters.length ? activeFilters.map((item) => <span key={item} className="rounded-full border bg-white px-2.5 py-1 text-xs text-slate-600">{item}</span>) : <span className="text-slate-500">Няма приложени филтри</span>}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={clearParams} disabled={!activeFilters.length} className="shrink-0 text-[#0d3b66]">Изчисти всички</Button>
          </div>
        </div>

        <div className="min-h-[32rem] rounded-2xl border bg-white p-5 shadow-sm sm:p-6">
          {!result || result.rows.length === 0 ? (
            <div className="grid min-h-[27rem] place-items-center text-center">
              <div>
                <div className="mx-auto grid size-16 place-items-center rounded-full bg-blue-50 text-[#0d3b66]"><Archive className="size-7" /></div>
                <h3 className="mt-4 text-lg font-semibold">Няма налични данни</h3>
                <p className="mt-1 text-sm text-slate-500">{result ? "Няма намерени записи по зададените критерии." : "Използвайте параметрите вляво и натиснете „Изпълни“."}</p>
              </div>
            </div>
          ) : (
            <>
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader><TableRow>{result.headers.map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
                <TableBody>{result.rows.slice(0, 100).map((row, i) => <TableRow key={i}>{row.map((v, j) => <TableCell key={j}>{String(v ?? "—")}</TableCell>)}</TableRow>)}</TableBody>
              </Table>
              {result.rows.length > 100 && <p className="mt-3 text-sm text-slate-500">Показани са първите 100 записа. CSV файлът съдържа всички.</p>}
            </div>
            <div className="space-y-3 sm:hidden">
              {result.rows.slice(0, 100).map((row, rowIndex) => (
                <article key={rowIndex} className="rounded-xl border bg-slate-50/60 p-3">
                  {row.map((value, columnIndex) => (
                    <div key={columnIndex} className="grid grid-cols-[minmax(6rem,40%)_1fr] gap-3 border-b py-2 last:border-0">
                      <div className="text-xs font-semibold text-slate-500">{result.headers[columnIndex]}</div>
                      <div className="min-w-0 break-words text-sm">{String(value ?? "—")}</div>
                    </div>
                  ))}
                </article>
              ))}
              {result.rows.length > 100 && <p className="text-sm text-slate-500">Показани са първите 100 записа. CSV файлът съдържа всички.</p>}
            </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function getActiveScrollSurface(): HTMLElement | Window {
  const surfaces = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-slot="dialog-content"], [data-slot="sheet-content"]',
    ),
  ).filter((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden";
  });

  return surfaces.at(-1) ?? window;
}

function FloatingScrollTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let surface: HTMLElement | Window = getActiveScrollSurface();

    const updateVisibility = () => {
      const isPage = surface === window;
      const scrollTop = isPage ? window.scrollY : (surface as HTMLElement).scrollTop;
      const viewportHeight = isPage
        ? window.innerHeight
        : (surface as HTMLElement).clientHeight;
      const contentHeight = isPage
        ? document.documentElement.scrollHeight
        : (surface as HTMLElement).scrollHeight;

      setVisible(contentHeight > viewportHeight + 80 && scrollTop > 180);
    };

    const connectSurface = () => {
      const nextSurface = getActiveScrollSurface();
      if (nextSurface !== surface) {
        surface.removeEventListener("scroll", updateVisibility);
        surface = nextSurface;
        surface.addEventListener("scroll", updateVisibility, { passive: true });
      }
      updateVisibility();
    };

    surface.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", connectSurface);

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(connectSurface);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "class", "style"],
    });
    updateVisibility();

    return () => {
      surface.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", connectSurface);
      observer.disconnect();
    };
  }, []);

  if (!visible) return null;

  return (
    <Button
      type="button"
      size="icon"
      className="fixed bottom-20 right-4 z-[100] rounded-full bg-[#0d3b66] text-white shadow-lg hover:bg-[#092e50] sm:bottom-6 sm:right-6"
      aria-label="Върни в началото"
      title="Върни в началото"
      onClick={() => {
        const surface = getActiveScrollSurface();
        if (surface === window) window.scrollTo({ top: 0, behavior: "smooth" });
        else (surface as HTMLElement).scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      <ArrowUp />
    </Button>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
  accent = "navy",
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  note: string;
  accent?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const c: Record<string, string> = {
    navy: "bg-blue-50 text-[#0d3b66]",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-cyan-50 text-cyan-700",
    green: "bg-emerald-50 text-emerald-700",
  };
  return (
    <article
      className={`rounded-2xl border bg-white p-3 shadow-sm transition sm:p-5 ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:border-[#0d3b66] hover:shadow-md" : ""} ${active ? "border-[#0d3b66] ring-2 ring-[#0d3b66]/20" : "border-slate-200"}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) onClick();
      }}
    >
      <div
        className={`grid size-9 place-items-center rounded-xl sm:size-10 ${c[accent]} [&>svg]:size-5`}
      >
        {icon}
      </div>
      <div className="mt-3 text-2xl font-semibold sm:mt-4 sm:text-3xl">{value}</div>
      <div className="mt-1 text-sm font-medium leading-5 sm:text-base">{label}</div>
      <div className="mt-1 hidden text-sm text-slate-500 sm:block">{note}</div>
    </article>
  );
}

function InquirySheet({
  inquiry,
  currentUser,
  onClose,
  onEdit,
  onChanged,
}: {
  inquiry: Inquiry | null;
  currentUser: { id: number; email: string; name: string; accessRole: "user" | "manager" | "admin" };
  onClose: () => void;
  onEdit: () => void;
  onChanged: () => void;
}) {
  return (
    <Sheet open={!!inquiry} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="border-b p-4 sm:p-6">
          <SheetTitle className="pr-8 text-xl">{inquiry?.client}</SheetTitle>
          <SheetDescription>
            Запитване № {inquiry?.referenceNo} ·{" "}
            {inquiry?.internalNo || "без вътрешен номер"}
          </SheetDescription>
        </SheetHeader>
        {inquiry && (
          <div className="space-y-5 p-4 sm:space-y-6 sm:p-6">
            <Badge
              className={`${toneForStatus(inquiry.status)} border-0`}
            >
              {stage(inquiry.status)}
            </Badge>
            <p className="leading-7">{inquiry.description}</p>
            <div className="grid grid-cols-1 gap-4 min-[390px]:grid-cols-2">
              <Detail
                l="Тип"
                v={
                  inquiry.requestType === "service"
                    ? "Услуга"
                    : "Промяна на конфигурация"
                }
              />
              <Detail l="Получено" v={fmt(inquiry.receivedAt)} />
              <Detail l="Получател" v={inquiry.recipient || "—"} />
              <Detail l="Срок за оценка" v={fmt(inquiry.evaluationDueAt)} />
              <Detail l="Анализатор" v={inquiry.analyst || "—"} />
              <Detail l="Отговорен PM" v={inquiry.projectManager || "—"} />
              <Detail l="Оферта изпратена" v={fmt(inquiry.offerSentAt)} />
              <Detail l="Канал" v={inquiry.offerChannel || "—"} />
              <Detail l="Дата на внедряване" v={fmt(inquiry.implementedAt)} />
              <Detail l="Фактура" v={inquiry.invoiceNo || "—"} />
              <Detail l="Дата на фактура" v={fmt(inquiry.invoiceDate)} />
              {inquiry.lifecycleDecisionAt && (
                <Detail l="Дата на решението" v={fmt(inquiry.lifecycleDecisionAt)} />
              )}
              {inquiry.lifecycleDecisionBy && (
                <Detail l="Решението е взето от" v={inquiry.lifecycleDecisionBy} />
              )}
              {inquiry.reviewAt && (
                <Detail l="Преразглеждане на" v={fmt(inquiry.reviewAt)} />
              )}
            </div>
            <WorkflowPanel inquiry={inquiry} onChanged={onChanged} accessRole={currentUser.accessRole} />
            <InquiryStepper inquiry={inquiry} />
            <div className="border-t pt-6">
              <Attachments inquiry={inquiry} />
            </div>
            {currentUser.accessRole === "admin" && (
              <AdminCorrectionPanel inquiry={inquiry} onChanged={onChanged} />
            )}
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Последен коментар
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {inquiry.statusComment || "Няма въведен коментар."}
              </p>
            </div>
            <History inquiryId={inquiry.id} />
            <Button variant="outline" className="w-full" onClick={onEdit}>
              Редактиране на основните данни
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
function Detail({ l, v }: { l: string; v: string }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{l}</div>
      <div className="mt-1 text-sm font-medium">{v}</div>
    </div>
  );
}

function AdminCorrectionPanel({
  inquiry,
  onChanged,
}: {
  inquiry: Inquiry;
  onChanged: () => void;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [recipient, setRecipient] = useState("unchanged");
  const [analyst, setAnalyst] = useState("unchanged");
  const [pm, setPm] = useState("unchanged");
  const [dueAt, setDueAt] = useState(inquiry.evaluationDueAt || "");
  const [reason, setReason] = useState("");
  const [returnToAnalysis, setReturnToAnalysis] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/employees")
      .then((response) => response.json())
      .then((data) =>
        setEmployees(
          (data.employees ?? []).filter((employee: Employee) => employee.active),
        ),
      );
  }, []);
  const submit = async () => {
    if (!reason.trim()) return toast.error("Въведете причина за корекцията.");
    setBusy(true);
    const response = await fetch(`/api/inquiries/${inquiry.id}/actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "admin_correct",
        reason: reason.trim(),
        ...(recipient !== "unchanged"
          ? { recipientEmployeeId: Number(recipient) }
          : {}),
        ...(analyst !== "unchanged"
          ? { analystEmployeeId: Number(analyst) }
          : {}),
        ...(pm !== "unchanged"
          ? { projectManagerEmployeeId: Number(pm) }
          : {}),
        ...(dueAt ? { evaluationDueAt: dueAt } : {}),
        returnToAnalysis,
      }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return toast.error(result.error);
    toast.success("Административната корекция е записана.");
    onChanged();
  };
  const personSelect = (
    label: string,
    value: string,
    onChange: (value: string) => void,
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full bg-white"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="unchanged">Без промяна</SelectItem>
          {employees
            .slice()
            .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "bg"))
            .map((employee) => (
              <SelectItem key={employee.id} value={String(employee.id)}>
                {employee.firstName} {employee.lastName}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
  const code = statusCode(inquiry.status);
  const canReturnToAnalysis = !["1", "2", "2.1", "6.1", "6.2", "6.3", "6.4", "10"].includes(code);
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/70 p-4">
      <div className="flex items-center gap-2 font-semibold text-amber-900">
        <Settings2 className="size-5" /> Административна корекция
      </div>
      <p className="mt-1 text-sm text-amber-800">
        Промените се записват в историята с предишните и новите стойности.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {personSelect("Получател", recipient, setRecipient)}
        {personSelect("Анализатор", analyst, setAnalyst)}
        {personSelect("Отговорен PM", pm, setPm)}
        <div className="space-y-2">
          <Label>Срок за оценка</Label>
          <Input type="date" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className="bg-white" />
        </div>
      </div>
      {canReturnToAnalysis && (
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-white p-3">
          <Checkbox checked={returnToAnalysis} onCheckedChange={(value) => setReturnToAnalysis(value === true)} />
          <span>
            <span className="block font-medium">Върни заявката в „В анализ“</span>
            <span className="text-sm text-slate-500">Изисква избран Анализатор и нов срок. Документите се запазват.</span>
          </span>
        </label>
      )}
      <div className="mt-4 space-y-2">
        <Label>Причина за промяната *</Label>
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} className="min-h-20 bg-white" placeholder="Опишете защо е необходима административната корекция." />
      </div>
      <Button onClick={submit} disabled={busy} className="mt-4 w-full bg-amber-700 text-white hover:bg-amber-800">
        {busy && <Loader2 className="size-4 animate-spin" />} Запази административната корекция
      </Button>
    </div>
  );
}

const docTypes = [
  {
    key: "client_inquiry",
    title: "Клиентско запитване",
    stage: "Стъпка 1 · Регистриране",
  },
  {
    key: "evaluation",
    title: "Оценка",
    stage: "Стъпка 3 · Анализ и оценка",
  },
  {
    key: "offer",
    title: "Съгласувана оферта",
    stage: "Стъпка 4 · Съгласуване",
  },
  {
    key: "client_feedback",
    title: "Потвърждение или отказ от клиента",
    stage: "Стъпка 6 · Обратна връзка",
  },
  {
    key: "signed_cr",
    title: "Подписана заявка за промяна",
    stage: "Стъпка 8 · Реализация",
  },
  {
    key: "signed_protocol",
    title: "Подписан протокол",
    stage: "Стъпка 9 · Приключване",
  },
];

function currentWorkflowStep(inquiry: Inquiry) {
  const code = statusCode(inquiry.pausedFromStatus || inquiry.status);
  if (code === "10") return 11;
  if (code === "9") return 10;
  if (code === "8") return 9;
  if (code === "7") return 8;
  if (["6", "6.1", "6.2", "6.3", "6.4"].includes(code)) return 7;
  if (code === "5") return 6;
  if (code === "4") return 5;
  if (code === "3") return 4;
  if (["2", "2.1"].includes(code)) return 3;
  if (code === "1") return 2;
  return 1;
}

function InquiryStepper({ inquiry }: { inquiry: Inquiry }) {
  const current = currentWorkflowStep(inquiry);
  const stopped = ["6.1", "6.2", "6.3", "6.4"].includes(statusCode(inquiry.status));
  return (
    <section>
      <div className="mb-3">
        <h3 className="font-semibold">Напредък по процедурата</h3>
        <p className="mt-1 text-sm text-slate-500">
          Работете последователно. Текущата стъпка е отворена, а приключените са
          отбелязани със зелено тикче.
        </p>
      </div>
      <ol className="space-y-2">
        {workflowSteps.map((step) => {
          const completed = step.stepNo < current || current === 11;
          const active = step.stepNo === current && !stopped;
          const stoppedHere = step.stepNo === current && stopped;
          return (
            <li
              key={step.stepNo}
              className={`flex gap-3 rounded-xl border p-3 transition-colors ${
                completed
                  ? "border-emerald-200 bg-emerald-50/70"
                  : active
                    ? "border-[#0d3b66]/40 bg-blue-50 ring-1 ring-[#0d3b66]/10"
                    : stoppedHere
                      ? "border-amber-200 bg-amber-50"
                      : "border-slate-200 bg-slate-50/60"
              }`}
            >
              <div
                className={`grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${
                  completed
                    ? "bg-emerald-600 text-white"
                    : active
                      ? "bg-[#0d3b66] text-white"
                      : stoppedHere
                        ? "bg-amber-500 text-white"
                        : "bg-slate-200 text-slate-500"
                }`}
              >
                {completed ? <CheckCircle2 className="size-5" /> : step.stepNo}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`font-medium ${!completed && !active && !stoppedHere ? "text-slate-500" : ""}`}
                  >
                    {step.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {completed
                      ? "Приключена"
                      : active
                        ? "Текуща стъпка"
                        : stoppedHere
                          ? statusCode(inquiry.status) === "6.3"
                            ? "Процесът е отложен тук"
                            : "Процесът е прекратен тук"
                          : "Предстои"}
                  </span>
                </div>
                {(active || stoppedHere) && (
                  <p className="mt-1 text-sm leading-5 text-slate-600">
                    {step.action}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Attachments({ inquiry }: { inquiry: Inquiry }) {
  const [docs, setDocs] = useState<InquiryDocument[]>([]),
    [uploading, setUploading] = useState(""),
    [notes, setNotes] = useState<Record<string, string>>({});
  const load = async () => {
    const r = await fetch(`/api/documents?inquiryId=${inquiry.id}`),
      j = await r.json();
    if (r.ok) setDocs(j.documents);
  };
  useEffect(() => {
    load();
  }, [inquiry.id]);
  const upload = async (category: string, file?: File) => {
    const note = (notes[category] || "").trim();
    if (!file && !note) {
      toast.error("Въведете бележка или прикачете файл.");
      return;
    }
    setUploading(category);
    const fd = new FormData();
    fd.set("inquiryId", String(inquiry.id));
    fd.set("category", category);
    fd.set("note", note);
    if (file) fd.set("file", file);
    try {
      const r = await fetch("/api/documents", { method: "POST", body: fd }),
        j = await r.json();
      if (!r.ok) throw new Error(j.error);
      toast.success(file ? "Документът е прикачен." : "Бележката е записана.");
      setNotes((current) => ({ ...current, [category]: "" }));
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Грешка при качване");
    } finally {
      setUploading("");
    }
  };
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 font-semibold">
        <Paperclip className="size-4" />
        Документи по заявката
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {docTypes
          .filter(
            (t) =>
              !(inquiry.requestType === "service" && t.key === "signed_cr"),
          )
          .map((t) => (
            <div key={t.key} className="rounded-xl border border-slate-200 p-4">
              <div className="text-xs text-slate-400">{t.stage}</div>
              <div className="mt-1 font-medium">{t.title}</div>
              {docs
                .filter((d) => d.category === t.key)
                .map((d) => (
                  <div
                    key={d.id}
                    className="mt-2 rounded-lg bg-slate-50 px-3 py-2"
                  >
                    {d.fileName && (
                      <a
                        href={`/api/documents/${d.id}`}
                        className="flex items-center gap-2 text-sm text-[#0d3b66]"
                      >
                        <FileText className="size-4" />
                        <span className="min-w-0 flex-1 truncate">
                          {d.fileName}
                        </span>
                        <Download className="size-4" />
                      </a>
                    )}
                    {d.note && (
                      <p className={`${d.fileName ? "mt-2 border-t pt-2" : ""} whitespace-pre-wrap text-sm leading-5 text-slate-600`}>
                        <span className="font-medium">Бележка:</span> {d.note}
                      </p>
                    )}
                  </div>
                ))}
              {docs
                .filter((d) => d.category === t.key && d.uploadedBy)
                .slice(-1)
                .map((d) => (
                  <div
                    key={`by-${d.id}`}
                    className="mt-1 text-xs text-slate-400"
                  >
                    Добавено от {d.uploadedBy}
                  </div>
                ))}
              <Textarea
                className="mt-3 min-h-20 resize-y"
                value={notes[t.key] || ""}
                onChange={(e) =>
                  setNotes((current) => ({
                    ...current,
                    [t.key]: e.target.value,
                  }))
                }
                placeholder="Бележка към документа (по желание)"
              />
              <Button
                type="button"
                variant="outline"
                className="mt-2 w-full"
                disabled={uploading === t.key || !(notes[t.key] || "").trim()}
                onClick={() => upload(t.key)}
              >
                {uploading === t.key ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FileText className="size-4" />
                )}
                Запази само бележката
              </Button>
              <Label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm">
                <input
                  type="file"
                  className="sr-only"
                  onChange={(e) => upload(t.key, e.target.files?.[0])}
                />
                {uploading === t.key ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UploadCloud className="size-4" />
                )}
                Прикачи файл
              </Label>
            </div>
          ))}
      </div>
    </div>
  );
}

function WorkflowPanel({
  inquiry,
  onChanged,
  accessRole,
}: {
  inquiry: Inquiry;
  onChanged: () => void;
  accessRole: "user" | "manager" | "admin";
}) {
  const [employees, setEmployees] = useState<Employee[]>([]),
    [analyst, setAnalyst] = useState(
      inquiry.analystEmployeeId ? String(inquiry.analystEmployeeId) : "none",
    ),
    [pm, setPm] = useState(
      inquiry.projectManagerEmployeeId
        ? String(inquiry.projectManagerEmployeeId)
        : "none",
    ),
    [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
    [comment, setComment] = useState(""),
    [channel, setChannel] = useState("email"),
    [sentBy, setSentBy] = useState(inquiry.recipient || ""),
    [invoiceNo, setInvoiceNo] = useState(""),
    [decisionOpen, setDecisionOpen] = useState(false),
    [decisionType, setDecisionType] = useState("postponed"),
    [decisionDate, setDecisionDate] = useState(
      new Date().toISOString().slice(0, 10),
    ),
    [reviewDate, setReviewDate] = useState(""),
    [decisionBy, setDecisionBy] = useState(""),
    [decisionReason, setDecisionReason] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((j) =>
        setEmployees((j.employees ?? []).filter((x: Employee) => x.active)),
      );
  }, []);
  const run = async (action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    const enteredDate =
      (document.getElementById("workflowDate") as HTMLInputElement | null)
        ?.value || date;
    const r = await fetch(`/api/inquiries/${inquiry.id}/actions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action,
          analystEmployeeId: analyst === "none" ? null : Number(analyst),
          projectManagerEmployeeId: pm === "none" ? null : Number(pm),
          evaluationDueAt: enteredDate,
          decisionAt: date,
          implementedAt: date,
          offerSentAt: date,
          offerChannel: channel,
          offerSentBy: sentBy,
          invoiceNo,
          invoiceDate: date,
          comment,
          ...extra,
        }),
      }),
      j = await r.json();
    setBusy(false);
    if (!r.ok) return toast.error(j.error);
    if (action === "stop_workflow") setDecisionOpen(false);
    toast.success("Действието е изпълнено.");
    onChanged();
  };
  const status = inquiry.status.trim();
  const code = statusCode(status);
  return (
    <div className="rounded-2xl border-2 border-[#0d3b66]/15 bg-blue-50/50 p-4">
      <div className="flex items-center gap-2 font-semibold text-[#0d3b66]">
        <CheckCircle2 className="size-5" />
        Следващо действие
      </div>
      <div className="mt-4 space-y-3">
        {!["9", "10"].includes(code) && (
          <div>
            <Label htmlFor="actionComment">Коментар към действието</Label>
            <Textarea
              id="actionComment"
              className="mt-2 min-h-24 bg-white"
              placeholder={
                code === "5"
                  ? "Добавете пояснение. При отказ коментарът е задължителен."
                  : "Добавете коментар към изпълняваното действие (по желание)"
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        )}
        {["1", "2", "2.1"].includes(code) && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <PersonSelect
                label="Анализатор"
                value={analyst}
                onChange={setAnalyst}
                employees={employees}
              />
              <Field
                name="workflowDate"
                label="Срок за оценка"
                type="date"
                value={inquiry.evaluationDueAt || date}
              />
            </div>
            {["1", "2.1"].includes(code) && accessRole !== "user" && (
              <Button
                disabled={busy}
                onClick={() => run("assign_analysis")}
                className="w-full bg-[#0d3b66]"
              >
                Разпредели за анализ
              </Button>
            )}
            {code === "2" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="outline" onClick={() => run("request_info")}>
                  Чака информация от клиента
                </Button>
                <Button onClick={() => run("submit_evaluation")}>
                  Предай оценката за съгласуване
                </Button>
              </div>
            )}
            {code === "2.1" && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => run("resume_analysis")}
              >
                Получена информация – продължи анализа
              </Button>
            )}
          </>
        )}
        {code === "3" && (
          <Button className="w-full" onClick={() => run("agree_evaluation")}>
            Потвърди съгласуваната оферта
          </Button>
        )}
        {code === "4" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Дата на изпращане</Label>
                <Input
                  className="mt-2"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Канал</Label>
                <Select value={channel} onValueChange={setChannel}>
                  <SelectTrigger className="mt-2 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Имейл</SelectItem>
                    <SelectItem value="helpdesk">Helpdesk</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Изпратил офертата</Label>
              <Input
                className="mt-2"
                value={sentBy}
                onChange={(e) => setSentBy(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={() => run("send_offer")}>
              Отбележи офертата като изпратена
            </Button>
          </>
        )}
        {code === "5" && (
          <>
            {inquiry.decisionOverdue ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
                <div className="font-semibold">Срокът за решение е изтекъл</div>
                <p className="mt-1 text-sm">
                  Изминали са три месеца от изпращането на офертата. Необходимо
                  е потребителско решение: потвърждение, отказ, приключване без
                  отговор или отлагане.
                </p>
              </div>
            ) : inquiry.decisionDueAt ? (
              <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-600">
                Тримесечният срок изтича на {fmt(inquiry.decisionDueAt)}.
              </p>
            ) : null}
            <div>
              <Label>Дата на клиентското решение</Label>
              <Input
                className="mt-2"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={() => run("confirm_offer")}>
                Потвърдена от клиента
              </Button>
              <Button variant="destructive" onClick={() => run("reject_offer")}>
                Отказана от клиента
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => run("close_no_response")}
              disabled={!inquiry.decisionOverdue}
            >
              Приключи без отговор
            </Button>
          </>
        )}
        {code === "6" && accessRole !== "user" && (
          <>
            <PersonSelect
              label="Отговорен PM"
              value={pm}
              onChange={setPm}
              employees={employees}
            />
            <Button
              className="w-full"
              onClick={() => run("assign_implementation")}
            >
              Разпредели за реализация
            </Button>
          </>
        )}
        {code === "7" && (
          <>
            <div>
              <Label>Дата на внедряване</Label>
              <Input
                className="mt-2"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={() => run("mark_implemented")}>
              Внедрена – изпрати за приемане
            </Button>
          </>
        )}
        {code === "8" && (
          <Button className="w-full" onClick={() => run("complete")}>
            Приключи с подписан протокол
          </Button>
        )}
        {code === "9" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Номер на фактура</Label>
                <Input
                  className="mt-2"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                />
              </div>
              <div>
                <Label>Дата на фактура</Label>
                <Input
                  className="mt-2"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <Button className="w-full" onClick={() => run("invoice")}>
              Отбележи като фактурирана
            </Button>
          </>
        )}
        {code === "6.3" && accessRole !== "user" && (
          <div className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
            <div className="font-semibold text-amber-900">Заявката е отложена</div>
            {inquiry.reviewAt && (
              <p className="text-sm text-amber-900">
                Дата за преразглеждане: {fmt(inquiry.reviewAt)}
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button onClick={() => run("resume_postponed")} disabled={busy}>
                Възобнови
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDecisionType("internal_stopped");
                  setDecisionOpen(true);
                }}
              >
                Прекрати окончателно
              </Button>
            </div>
          </div>
        )}
        {accessRole !== "user" && !["6.1", "6.2", "6.3", "6.4", "9", "10"].includes(code) && (
          <Button
            variant="outline"
            className="w-full border-amber-400 text-amber-800 hover:bg-amber-50"
            onClick={() => {
              setDecisionType("postponed");
              setDecisionOpen(true);
            }}
          >
            Отложи или прекрати
          </Button>
        )}
        {(["6.1", "6.2", "6.4", "10"].includes(code)) && (
          <p className="text-sm text-slate-500">
            Процесът е приключен и няма следващо действие.
          </p>
        )}
      </div>
      <Dialog open={decisionOpen} onOpenChange={setDecisionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {code === "6.3" ? "Окончателно прекратяване" : "Отлагане или прекратяване"}
            </DialogTitle>
            <DialogDescription>
              Избраното решение ще бъде записано в историята. Отложена заявка може да бъде възобновена от същия етап.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Решение *</Label>
              <Select value={decisionType} onValueChange={setDecisionType}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {code !== "6.3" && <SelectItem value="postponed">Отложена</SelectItem>}
                  <SelectItem value="client_rejected">Отказана от клиента</SelectItem>
                  <SelectItem value="internal_stopped">Прекратена по вътрешно решение</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Дата на решението *</Label>
                <Input type="date" value={decisionDate} onChange={(e) => setDecisionDate(e.target.value)} />
              </div>
              {decisionType === "postponed" && (
                <div className="space-y-2">
                  <Label>Дата за преразглеждане</Label>
                  <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Решението е взето от *</Label>
              <Input value={decisionBy} onChange={(e) => setDecisionBy(e.target.value)} placeholder="Име или орган, взел решението" />
            </div>
            <div className="space-y-2">
              <Label>Основание *</Label>
              <Textarea value={decisionReason} onChange={(e) => setDecisionReason(e.target.value)} placeholder="Опишете причината за решението" rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionOpen(false)}>Отказ</Button>
            <Button
              variant={decisionType === "postponed" ? "default" : "destructive"}
              disabled={busy || !decisionDate || !decisionBy.trim() || !decisionReason.trim()}
              onClick={() => run("stop_workflow", {
                decisionType,
                decisionAt: decisionDate,
                reviewAt: reviewDate || null,
                decisionBy,
                comment: decisionReason,
              })}
            >
              Запиши решението
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function History({ inquiryId }: { inquiryId: number }) {
  const [data, setData] = useState<{
    actions: Array<Record<string, string>>;
    notifications: Array<Record<string, string>>;
  }>({ actions: [], notifications: [] });
  useEffect(() => {
    fetch(`/api/inquiries/${inquiryId}/history`)
      .then((r) => r.json())
      .then(setData);
  }, [inquiryId]);
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="history">
        <AccordionTrigger>
          История и уведомления (
          {data.actions.length + data.notifications.length})
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-sm font-semibold">
                Потребителски действия
              </div>
              {data.actions.length ? (
                data.actions.map((x, i) => (
                  <div key={i} className="mb-2 rounded-lg border p-3 text-sm">
                    <div className="font-medium">{actionLabel(x.action)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {x.actorName || x.actorEmail || "Системен потребител"} ·{" "}
                      {x.createdAt}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">
                  Няма записани действия.
                </p>
              )}
            </div>
            <div>
              <div className="mb-2 text-sm font-semibold">Известия</div>
              {data.notifications.map((x, i) => (
                <div key={i} className="mb-2 rounded-lg border p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{x.subject}</span>
                    <Badge variant="outline">{x.deliveryStatus}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {x.recipients || "Без получатели"}
                  </div>
                  {x.errorMessage && (
                    <div className="mt-1 text-xs text-red-600">
                      {x.errorMessage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function InquiryDialog({
  open,
  inquiry,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  inquiry: Inquiry | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false),
    [clients, setClients] = useState<Client[]>([]),
    [employees, setEmployees] = useState<Employee[]>([]),
    [clientId, setClientId] = useState(""),
    [recipientId, setRecipientId] = useState("none"),
    [requestType, setRequestType] = useState("configuration_change"),
    [initialFile, setInitialFile] = useState<File | null>(null);
  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/employees").then((r) => r.json()),
    ]).then(([c, e]) => {
      const list: Client[] = c.clients ?? [];
      setClients(list);
      setEmployees(e.employees ?? []);
      const matched =
        inquiry?.clientId ?? list.find((x) => x.name === inquiry?.client)?.id;
      setClientId(matched ? String(matched) : "");
      setRecipientId(
        inquiry?.recipientEmployeeId
          ? String(inquiry.recipientEmployeeId)
          : "none",
      );
      setRequestType(inquiry?.requestType ?? "configuration_change");
      setInitialFile(null);
    });
  }, [open, inquiry]);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!clientId) {
      toast.error("Изберете клиент.");
      return;
    }
    if (recipientId === "none") {
      toast.error("Изберете кой е получил заявката.");
      return;
    }
    setSaving(true);
    const toId = (v: string) => (v === "none" ? null : Number(v));
    const payload = {
      ...Object.fromEntries(new FormData(e.currentTarget).entries()),
      clientId: Number(clientId),
      recipientEmployeeId: toId(recipientId),
      requestType,
    };
    try {
      const r = await fetch(
          inquiry ? `/api/inquiries/${inquiry.id}` : "/api/inquiries",
          {
            method: inquiry ? "PUT" : "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          },
        ),
        j = await r.json();
      if (!r.ok) throw new Error(j.error);
      let fileUploaded = false;
      if (!inquiry && initialFile && j.inquiry?.id) {
        const form = new FormData();
        form.set("inquiryId", String(j.inquiry.id));
        form.set("category", "client_inquiry");
        form.set("note", "Оригинално клиентско запитване");
        form.set("file", initialFile);
        const uploadResponse = await fetch("/api/documents", {
          method: "POST",
          body: form,
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) {
          toast.error(
            `Заявката е регистрирана, но файлът не е качен: ${uploadResult.error || "Грешка при качване"}`,
          );
        } else {
          fileUploaded = true;
        }
      }
      if (inquiry) toast.success("Запитването е актуализирано.");
      else if (!initialFile || fileUploaded)
        toast.success(
          fileUploaded
            ? "Запитването е регистрирано и файлът е прикачен."
            : "Запитването е регистрирано.",
        );
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Грешка при запис");
    } finally {
      setSaving(false);
    }
  };
  const activePeople = employees.filter((p) => p.active);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {inquiry
              ? `Редактиране на № ${inquiry.referenceNo}`
              : "Ново клиентско запитване"}
          </DialogTitle>
          <DialogDescription>
            Тук се поддържат основните данни. Анализаторът, PM и статусът се
            определят чрез действията по процеса.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Клиент *</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Изберете клиент" />
              </SelectTrigger>
              <SelectContent>
                {clients
                  .filter((c) => c.active)
                  .map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="internalNo"
              label="Вътрешен / HD номер"
              value={inquiry?.internalNo}
            />
            <Field
              name="receivedAt"
              label="Дата на получаване *"
              type="date"
              value={
                inquiry?.receivedAt ?? new Date().toISOString().slice(0, 10)
              }
            />
            <PersonSelect
              label="Получил заявката *"
              value={recipientId}
              onChange={setRecipientId}
              employees={activePeople}
            />
            <div className="space-y-2">
              <Label>Тип на заявката *</Label>
              <Select value={requestType} onValueChange={setRequestType}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="configuration_change">
                    Промяна на конфигурация
                  </SelectItem>
                  <SelectItem value="service">
                    Услуга без промяна на конфигурация
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Field
              name="folderPath"
              label="Папка / линк към документацията"
              value={inquiry?.folderPath}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">CR описание *</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={inquiry?.description}
              required
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="statusComment">Статус - коментар</Label>
            <Textarea
              id="statusComment"
              name="statusComment"
              defaultValue={inquiry?.statusComment}
              rows={3}
            />
          </div>
          {!inquiry && (
            <div className="space-y-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <div>
                <Label htmlFor="clientInquiryFile">Файл с клиентското запитване</Label>
                <p className="mt-1 text-xs text-slate-500">
                  По желание · максимален размер 15 MB
                </p>
              </div>
              <Label
                htmlFor="clientInquiryFile"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border bg-white px-3 py-3 text-sm text-[#0d3b66]"
              >
                <input
                  id="clientInquiryFile"
                  type="file"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (file && file.size > 15 * 1024 * 1024) {
                      toast.error("Максималният размер на файл е 15 MB.");
                      e.target.value = "";
                      setInitialFile(null);
                      return;
                    }
                    setInitialFile(file);
                  }}
                />
                {initialFile ? <FileText className="size-4" /> : <UploadCloud className="size-4" />}
                <span className="min-w-0 truncate">
                  {initialFile?.name ?? "Избери файл"}
                </span>
              </Label>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Отказ
            </Button>
            <Button disabled={saving} className="bg-[#0d3b66]">
              {saving && <Loader2 className="animate-spin" />}Запис
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function PersonSelect({
  label,
  value,
  onChange,
  employees,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  employees: Employee[];
}) {
  const sortedEmployees = [...employees].sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(
      `${b.firstName} ${b.lastName}`,
      "bg",
      { sensitivity: "base" },
    ),
  );
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Не е избран</SelectItem>
          {sortedEmployees.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.firstName} {p.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
function Field({
  name,
  label,
  value,
  type = "text",
}: {
  name: string;
  label: string;
  value?: string | null;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        defaultValue={value ?? ""}
        required={label.includes("*")}
      />
    </div>
  );
}

function Catalogs() {
  const [clients, setClients] = useState<Client[]>([]),
    [employees, setEmployees] = useState<Employee[]>([]),
    [clientName, setClientName] = useState(""),
    [firstName, setFirstName] = useState(""),
    [lastName, setLastName] = useState(""),
    [email, setEmail] = useState("");
  const load = async () => {
    const [c, e] = await Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/employees").then((r) => r.json()),
    ]);
    setClients(c.clients ?? []);
    setEmployees(e.employees ?? []);
  };
  useEffect(() => {
    load();
  }, []);
  const addClient = async () => {
    const r = await fetch("/api/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: clientName }),
      }),
      j = await r.json();
    if (!r.ok) return toast.error(j.error);
    setClientName("");
    toast.success("Клиентът е добавен.");
    load();
  };
  const addEmployee = async () => {
    const r = await fetch("/api/employees", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email }),
      }),
      j = await r.json();
    if (!r.ok) return toast.error(j.error);
    setFirstName("");
    setLastName("");
    setEmail("");
    toast.success("Служителят е добавен.");
    load();
  };
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Building2 className="size-5 text-[#0d3b66]" />
          <div>
            <h2 className="font-semibold">Клиенти</h2>
            <p className="text-sm text-slate-500">
              За момента се поддържа наименование.
            </p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <Input
            placeholder="Наименование на клиента"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <Button onClick={addClient}>
            <Plus />
            Добави
          </Button>
        </div>
        <div className="mt-5 max-h-[420px] overflow-y-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Наименование</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {c.active ? "Действащ" : "Неактивен"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <UserRound className="size-5 text-[#0d3b66]" />
          <div>
            <h2 className="font-semibold">Служители</h2>
            <p className="text-sm text-slate-500">
              Две имена, служебен имейл и активност.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Input
            placeholder="Име"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Input
            placeholder="Фамилия"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <Input
            className="sm:col-span-2"
            type="email"
            placeholder="Служебен имейл"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button className="sm:col-span-2" onClick={addEmployee}>
            <Plus />
            Добави служител
          </Button>
        </div>
        <div className="mt-5 max-h-[340px] overflow-y-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Служител</TableHead>
                <TableHead>Имейл</TableHead>
                <TableHead>Статус</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {p.firstName} {p.lastName}
                  </TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {p.active ? "Действащ" : "Неактивен"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  );
}

function ProcessView() {
  const [notificationTemplates, setNotificationTemplates] = useState<
    Array<{
      eventKey: string;
      recipientRoles: string[];
      enabled: boolean;
    }>
  >([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const loadTemplates = async () => {
    setTemplatesLoading(true);
    try {
      const response = await fetch("/api/settings");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setNotificationTemplates(result.templates ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Грешка при зареждане на уведомленията",
      );
    } finally {
      setTemplatesLoading(false);
    }
  };
  useEffect(() => {
    loadTemplates();
    const refresh = () => loadTemplates();
    window.addEventListener("notification-settings-updated", refresh);
    return () =>
      window.removeEventListener("notification-settings-updated", refresh);
  }, []);
  return (
    <section className="space-y-5">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">10 стъпки по процедура CON001</h2>
        <p className="mt-2 text-sm text-slate-500">
          Всяка стъпка показва отговорника, действието в приложението, резултата
          и ролите, които се информират автоматично.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {workflowSteps.map((s) => {
          const template = notificationTemplates.find(
            (item) => item.eventKey === s.eventKey,
          );
          return <article
            key={s.stepNo}
            className="rounded-2xl border bg-white p-5 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#0d3b66] font-mono text-sm font-semibold text-white">
                {String(s.stepNo).padStart(2, "0")}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold">{s.name}</h3>
                <div className="mt-1 text-sm text-[#0d3b66]">{s.actor}</div>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Потребителско действие
                </div>
                <p className="mt-2 text-sm leading-6">{s.action}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Резултат
                </div>
                <p className="mt-2 text-sm leading-6">{s.result}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Автоматично се информират
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {templatesLoading ? (
                  <span className="text-sm text-slate-400">Зареждане…</span>
                ) : !template ? (
                  <span className="text-sm text-slate-500">Няма настроен шаблон.</span>
                ) : !template.enabled ? (
                  <Badge variant="outline" className="text-slate-500">
                    Автоматичното уведомяване е изключено
                  </Badge>
                ) : template.recipientRoles.length === 0 ? (
                  <span className="text-sm text-slate-500">Няма избрани роли.</span>
                ) : template.recipientRoles.map((role) => (
                  <Badge key={role} variant="outline">
                    {roleOptions.find((x) => x.key === role)?.label ?? role}
                  </Badge>
                ))}
              </div>
            </div>
          </article>;
        })}
      </div>
    </section>
  );
}
