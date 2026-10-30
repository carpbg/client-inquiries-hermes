export const roleOptions = [
  { key: "recipient", label: "Получател" },
  { key: "analyst", label: "Анализатор" },
  { key: "project_manager", label: "Отговорен PM" },
  { key: "contract_manager", label: "Мениджър договаряне с клиенти" },
  { key: "department_head", label: "Ръководител направление" },
] as const;

export const statusLabel = (status: string) =>
  status.replace(/^\d+(?:\.\d+)?\s+/, "").trim();

const actionLabels: Record<string, string> = {
  inquiry_registered: "Регистриране на запитване",
  inquiry_edited: "Редактиране на запитване",
  document_uploaded: "Качване на документ",
  document_note_added: "Добавяне на бележка към документ",
  assign_analysis: "Разпределяне за анализ",
  request_info: "Искане на информация от клиента",
  resume_analysis: "Продължаване на анализа",
  submit_evaluation: "Предаване на оценката за съгласуване",
  agree_evaluation: "Съгласуване на оценката",
  send_offer: "Изпращане на оферта",
  confirm_offer: "Потвърждение на офертата от клиента",
  reject_offer: "Отказ на офертата от клиента",
  close_no_response: "Приключване без отговор от клиента",
  postpone_no_response: "Отлагане след липса на отговор",
  stop_workflow: "Отлагане или прекратяване на заявката",
  resume_postponed: "Възобновяване на отложена заявка",
  assign_implementation: "Разпределяне за реализация",
  mark_implemented: "Отбелязване като внедрена",
  complete: "Документално приключване",
  invoice: "Фактуриране",
  admin_correct: "Административна корекция",
};

export const actionLabel = (action: string) => actionLabels[action] ?? action;

const legacyStatuses: Record<string, string> = {
  "1 Чака оценка от ТЛ": "1 Регистрирано – за разпределяне",
  "2 Чака информация от клиента": "2.1 Очаква информация от клиента",
  "3 Чака оценка от ТЛ - детайлна": "2 В анализ",
  "4 Чака потвърждение": "5 Офертата е изпратена – очаква решение",
  "5 Потвърдена оценка от клиента": "6 Потвърдена от клиента – за разпределяне",
  "5.1 Подписан CR": "7 В реализация",
  "6 Разработва се": "7 В реализация",
  "7 Внедрен / очаква се приемане": "8 Внедрена – очаква приемане",
  "8 Приключен (приет)": "9 Приета – за фактуриране",
  "9 Отменен / отложен": "6.3 Отложена",
};

export const canonicalStatus = (status: string) =>
  legacyStatuses[status.trim()] ?? status.trim();

export const statusCode = (status: string) =>
  canonicalStatus(status).match(/^\d+(?:\.\d+)?/)?.[0] ?? "";

export const workflowSteps = [
  {
    stepNo: 1,
    eventKey: "inquiry_registered",
    name: "Регистриране на запитване",
    actor: "Получател",
    action: "Създава заявката, избира клиент и Получател и описва запитването.",
    result: "Нов запис със статус „Регистрирано – за разпределяне“.",
    roles: ["analyst", "department_head"],
  },
  {
    stepNo: 2,
    eventKey: "analysis_assigned",
    name: "Разпределяне за анализ",
    actor: "Ръководител направление",
    action: "Избира Анализатор и задава срок за оценка.",
    result: "Анализатор и срок са записани.",
    roles: ["analyst", "recipient"],
  },
  {
    stepNo: 3,
    eventKey: "evaluation_uploaded",
    name: "Анализ и изготвяне на оценка",
    actor: "Анализатор",
    action:
      "Уточнява изискванията и качва оценката. При нужда избира статус „Очаква информация от клиента“.",
    result: "Качена оценка.",
    roles: ["recipient", "contract_manager"],
  },
  {
    stepNo: 4,
    eventKey: "evaluation_agreed",
    name: "Съгласуване на оценката",
    actor: "Мениджър договаряне с клиенти",
    action:
      "Проверява оценката, допълва дата, валидност, номер и цени и качва готовата оферта.",
    result: "Оферта, готова за изпращане.",
    roles: ["recipient", "analyst"],
  },
  {
    stepNo: 5,
    eventKey: "offer_sent",
    name: "Изпращане на оферта",
    actor: "Получател / Мениджър договаряне с клиенти",
    action:
      "Изпраща офертата и въвежда датата на изпращане и статус „Офертата е изпратена – очаква решение“.",
    result: "Изпратена оферта.",
    roles: ["department_head", "analyst"],
  },
  {
    stepNo: 6,
    eventKey: "client_feedback",
    name: "Обратна връзка по офертата",
    actor: "Изпращач",
    action:
      "Регистрира потвърждение, отказ или служебно затваряне при липса на отговор.",
    result: "Статус „Потвърдена от клиента – за разпределяне“, „Отказана от клиента“, „Приключена без отговор от клиента“ или „Отложена“.",
    roles: ["analyst", "department_head", "contract_manager"],
  },
  {
    stepNo: 7,
    eventKey: "implementation_assigned",
    name: "Разпределяне на потвърдена оферта",
    actor: "Ръководител направление",
    action: "Избира Отговорен PM и екип и задава статус „В реализация“.",
    result: "Определен PM и екип.",
    roles: ["project_manager", "contract_manager"],
  },
  {
    stepNo: 8,
    eventKey: "implementation_document",
    name: "Реализация на офертата",
    actor: "Отговорен PM",
    action:
      "Организира изпълнението и при промяна на конфигурация качва подписаната заявка за промяна.",
    result: "Реализирана промяна или услуга.",
    roles: ["contract_manager", "department_head", "analyst"],
  },
  {
    stepNo: 9,
    eventKey: "signed_protocol",
    name: "Документално приключване",
    actor: "Отговорен PM",
    action:
      "Качва двустранно подписания протокол, дата на внедряване и задава статус „Приета – за фактуриране“.",
    result: "Готовност за фактуриране.",
    roles: ["contract_manager"],
  },
  {
    stepNo: 10,
    eventKey: "invoice_uploaded",
    name: "Фактуриране",
    actor: "Мениджър договаряне с клиенти",
    action: "Въвежда номера и датата на издадената фактура.",
    result: "Записани номер и дата на фактурата.",
    roles: ["department_head", "project_manager", "recipient"],
  },
] as const;

export const defaultTemplates = workflowSteps
  .map((step) => ({
    ...step,
    recipientRoles: JSON.stringify(step.roles),
    subjectTemplate: `[CR {{referenceNo}}] ${step.name} – {{client}}`,
    bodyTemplate: `Здравейте,\n\nПо заявка CR {{referenceNo}} за {{client}} е регистрирано действие: ${step.name}.\n\nОписание: {{description}}\nТекущ статус: {{status}}\nПолучател: {{recipient}}\nАнализатор: {{analyst}}\nОтговорен PM: {{projectManager}}\nДокумент: {{documentName}}\n\nПоздрави,\nРегистър „Клиентски запитвания“`,
    enabled: true,
  }))
  .concat([
    {
      stepNo: 0,
      eventKey: "administrative_change",
      name: "Административна корекция",
      actor: "Администратор",
      action: "Коригира отговорник или връща заявката за анализ.",
      result: "Записана проследима административна промяна.",
      roles: ["recipient", "analyst", "project_manager", "department_head"],
      recipientRoles: JSON.stringify(["recipient", "analyst", "project_manager", "department_head"]),
      subjectTemplate: "[CR {{referenceNo}}] Административна корекция – {{client}}",
      bodyTemplate: "Здравейте,\n\nПо заявка CR {{referenceNo}} – {{client}} е извършена административна корекция.\n\nТекущ статус: {{status}}\nПолучател: {{recipient}}\nАнализатор: {{analyst}}\nОтговорен PM: {{projectManager}}",
      enabled: true,
    },
    {
      stepNo: 6,
      eventKey: "client_confirmed",
      name: "Клиентът потвърди офертата",
      actor: "Изпращач",
      action: "",
      result: "",
      roles: ["analyst", "department_head", "contract_manager"],
      recipientRoles: JSON.stringify([
        "analyst",
        "department_head",
        "contract_manager",
      ]),
      subjectTemplate: "[CR {{referenceNo}}] Потвърдена оферта – {{client}}",
      bodyTemplate:
        "Здравейте,\n\nКлиентът потвърди офертата по CR {{referenceNo}} – {{client}}.\nДата/статус: {{status}}\n\nОписание: {{description}}",
      enabled: true,
    },
    {
      stepNo: 6,
      eventKey: "client_rejected",
      name: "Клиентът отказа офертата",
      actor: "Изпращач",
      action: "",
      result: "",
      roles: ["analyst", "department_head", "contract_manager"],
      recipientRoles: JSON.stringify([
        "analyst",
        "department_head",
        "contract_manager",
      ]),
      subjectTemplate: "[CR {{referenceNo}}] Отказана оферта – {{client}}",
      bodyTemplate:
        "Здравейте,\n\nКлиентът отказа офертата по CR {{referenceNo}} – {{client}}.\nСтатус: {{status}}\n\nОписание: {{description}}",
      enabled: true,
    },
    {
      stepNo: 6,
      eventKey: "no_response_due",
      name: "Липса на отговор от клиента – 3 месеца",
      actor: "Ръководител направление",
      action: "",
      result: "",
      roles: ["department_head", "recipient", "contract_manager"],
      recipientRoles: JSON.stringify([
        "department_head",
        "recipient",
        "contract_manager",
      ]),
      subjectTemplate:
        "[CR {{referenceNo}}] Изтекли 3 месеца без отговор – {{client}}",
      bodyTemplate:
        "Здравейте,\n\nИзтекоха три месеца от изпращането на офертата по CR {{referenceNo}} – {{client}}. Необходимо е решение за служебно затваряне.",
      enabled: true,
    },
  ]);

export const allowedStatuses = [
  "1 Регистрирано – за разпределяне",
  "2 В анализ",
  "2.1 Очаква информация от клиента",
  "3 Оценка за съгласуване",
  "4 Офертата е съгласувана",
  "5 Офертата е изпратена – очаква решение",
  "6 Потвърдена от клиента – за разпределяне",
  "6.1 Отказана от клиента",
  "6.2 Приключена без отговор от клиента",
  "6.3 Отложена",
  "6.4 Прекратена по вътрешно решение",
  "7 В реализация",
  "8 Внедрена – очаква приемане",
  "9 Приета – за фактуриране",
  "10 Фактурирана",
];
