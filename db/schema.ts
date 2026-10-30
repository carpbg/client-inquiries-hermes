import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const clients = sqliteTable(
  "clients",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_clients_name").on(table.name)],
);

export const employees = sqliteTable(
  "employees",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    systemRole: text("system_role").notNull().default(""),
    accessRole: text("access_role").notNull().default("user"),
    notificationsEnabled: integer("notifications_enabled", { mode: "boolean" }).notNull().default(true),
  },
  (table) => [
    index("idx_employees_active_name").on(
      table.active,
      table.lastName,
      table.firstName,
    ),
  ],
);

export const inquiries = sqliteTable(
  "inquiries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    referenceNo: integer("reference_no").notNull(),
    year: integer("year").notNull(),
    client: text("client").notNull(),
    internalNo: text("internal_no").notNull().default(""),
    receivedAt: text("received_at").notNull(),
    clientId: integer("client_id").references(() => clients.id),
    recipientEmployeeId: integer("recipient_employee_id").references(
      () => employees.id,
    ),
    analystEmployeeId: integer("analyst_employee_id").references(
      () => employees.id,
    ),
    projectManagerEmployeeId: integer("project_manager_employee_id").references(
      () => employees.id,
    ),
    offerSentAt: text("offer_sent_at"),
    confirmedAt: text("confirmed_at"),
    description: text("description").notNull(),
    status: text("status").notNull(),
    recipient: text("recipient").notNull().default(""),
    analyst: text("analyst").notNull().default(""),
    evaluationDueAt: text("evaluation_due_at"),
    projectManager: text("project_manager").notNull().default(""),
    statusComment: text("status_comment").notNull().default(""),
    implementedAt: text("implemented_at"),
    folderPath: text("folder_path").notNull().default(""),
    stakeholderEmails: text("stakeholder_emails").notNull().default(""),
    requestType: text("request_type").notNull().default("configuration_change"),
    offerChannel: text("offer_channel").notNull().default(""),
    offerSentBy: text("offer_sent_by").notNull().default(""),
    clientDecision: text("client_decision").notNull().default(""),
    pausedFromStatus: text("paused_from_status"),
    lifecycleDecisionAt: text("lifecycle_decision_at"),
    lifecycleDecisionBy: text("lifecycle_decision_by").notNull().default(""),
    reviewAt: text("review_at"),
    invoiceNo: text("invoice_no").notNull().default(""),
    invoiceDate: text("invoice_date"),
    invoiceSentAt: text("invoice_sent_at"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_inquiries_status").on(table.status),
    index("idx_inquiries_client").on(table.client),
    index("idx_inquiries_year_status").on(table.year, table.status),
  ],
);

export type Inquiry = typeof inquiries.$inferSelect;
export type NewInquiry = typeof inquiries.$inferInsert;

export const inquiryEmployees = sqliteTable(
  "inquiry_employees",
  {
    inquiryId: integer("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    employeeId: integer("employee_id")
      .notNull()
      .references(() => employees.id),
  },
  (table) => [
    index("idx_inquiry_employees_inquiry").on(table.inquiryId),
    index("idx_inquiry_employees_employee").on(table.employeeId),
  ],
);

export const documents = sqliteTable(
  "documents",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    inquiryId: integer("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    fileName: text("file_name").notNull(),
    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: text("uploaded_by").notNull().default(""),
    note: text("note").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_documents_inquiry_category").on(table.inquiryId, table.category),
  ],
);

export const notificationLog = sqliteTable("notification_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  inquiryId: integer("inquiry_id")
    .notNull()
    .references(() => inquiries.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  recipients: text("recipients").notNull(),
  subject: text("subject").notNull(),
  deliveryStatus: text("delivery_status").notNull(),
  errorMessage: text("error_message").notNull().default(""),
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export const actionLog = sqliteTable(
  "action_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    inquiryId: integer("inquiry_id")
      .notNull()
      .references(() => inquiries.id, { onDelete: "cascade" }),
    action: text("action").notNull(),
    details: text("details").notNull().default(""),
    actorId: text("actor_id").notNull().default(""),
    actorEmail: text("actor_email").notNull().default(""),
    actorName: text("actor_name").notNull().default(""),
    createdAt: text("created_at")
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("idx_action_log_inquiry_created").on(
      table.inquiryId,
      table.createdAt,
    ),
  ],
);

export const notificationTemplates = sqliteTable("notification_templates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventKey: text("event_key").notNull().unique(),
  stepNo: integer("step_no").notNull(),
  name: text("name").notNull(),
  recipientRoles: text("recipient_roles").notNull(),
  subjectTemplate: text("subject_template").notNull(),
  bodyTemplate: text("body_template").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

// Kept for compatibility with the already-applied email settings migration.
export const emailSettings = sqliteTable("email_settings", {
  id: integer("id").primaryKey(),
  provider: text("provider").notNull().default("resend"),
  apiKey: text("api_key").notNull().default(""),
  fromName: text("from_name").notNull().default("HeRMeS Notifications"),
  fromEmail: text("from_email").notNull().default(""),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(false),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
