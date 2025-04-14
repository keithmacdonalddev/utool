// templatesConfig.js
// Configuration for dynamic form templates in the Case Wizard.
// Deeply commented for educational purposes.

/**
 * Each template object defines:
 * - id: unique string identifier
 * - title: display name
 * - description: short description
 * - category: matches Step 2 category
 * - followUp: (optional) matches Step 3 follow-up/subcategory
 * - outputMode: default output format ("email", "json", "text")
 * - fields: array of field configs
 *    - name: unique key
 *    - label: display label
 *    - type: "text" | "textarea" | "boolean" | "date" | "select"
 *    - required: boolean
 *    - options: for "select" type [{ value, label }]
 *    - placeholder: (optional)
 */

// Default template to use when no specific template is found
export const DEFAULT_TEMPLATE = {
  id: 'default-template',
  title: 'General Information Form',
  description:
    'Please provide the following information to process your request.',
  outputMode: 'text',
  fields: [
    { name: 'callerName', label: 'Caller Name', type: 'text', required: true },
    { name: 'caseNumber', label: 'Case Number', type: 'text', required: true },
    {
      name: 'COID',
      label: 'COID (if applicable)',
      type: 'text',
      required: false,
    },
    {
      name: 'issueDescription',
      label: 'Issue Description',
      type: 'textarea',
      required: true,
      placeholder: 'Please provide details about your issue...',
    },
    {
      name: 'urgency',
      label: 'Urgency',
      type: 'select',
      required: true,
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'critical', label: 'Critical' },
      ],
    },
    {
      name: 'callbackNumber',
      label: 'Callback Number',
      type: 'text',
      required: false,
    },
  ],
};

export const TEMPLATES = [
  {
    id: 'payment-failed-email',
    title: 'Failed Payment - Email Template',
    description:
      'Template for reporting a failed payment to the client via email.',
    category: 'payments',
    followUp: 'failed',
    outputMode: 'email',
    fields: [
      {
        name: 'callerName',
        label: 'Caller Name',
        type: 'text',
        required: true,
      },
      {
        name: 'caseNumber',
        label: 'Case Number',
        type: 'text',
        required: true,
      },
      { name: 'COID', label: 'COID', type: 'text', required: true },
      { name: 'MID', label: 'MID', type: 'text', required: true },
      {
        name: 'callerEmail',
        label: 'Caller Email',
        type: 'text',
        required: true,
      },
      {
        name: 'phoneNumber',
        label: 'Phone Number',
        type: 'text',
        required: true,
      },
      {
        name: 'paymentDate',
        label: 'Payment Date',
        type: 'date',
        required: true,
      },
      { name: 'amount', label: 'Amount', type: 'text', required: true },
      {
        name: 'details',
        label: 'Additional Details',
        type: 'textarea',
        required: false,
        placeholder: 'Describe the issue...',
      },
      {
        name: 'urgent',
        label: 'Mark as Urgent',
        type: 'boolean',
        required: false,
      },
    ],
  },
  {
    id: 'payroll-missing-json',
    title: 'Missing Payroll - JSON Output',
    description: 'Structured JSON for missing payroll case intake.',
    category: 'payroll',
    followUp: 'missing',
    outputMode: 'json',
    fields: [
      {
        name: 'callerName',
        label: 'Caller Name',
        type: 'text',
        required: true,
      },
      {
        name: 'caseNumber',
        label: 'Case Number',
        type: 'text',
        required: true,
      },
      { name: 'COID', label: 'COID', type: 'text', required: true },
      {
        name: 'payrollPeriod',
        label: 'Payroll Period',
        type: 'text',
        required: true,
        placeholder: 'e.g. 2025-04-01 to 2025-04-15',
      },
      {
        name: 'employeeCount',
        label: 'Number of Employees Missing Payroll',
        type: 'text',
        required: true,
      },
      { name: 'details', label: 'Details', type: 'textarea', required: false },
    ],
  },
  {
    id: 'qbo-generic-text',
    title: 'QBO Issue - Text Output',
    description: 'Plain text template for generic QBO issues.',
    category: 'qbo',
    outputMode: 'text',
    fields: [
      {
        name: 'callerName',
        label: 'Caller Name',
        type: 'text',
        required: true,
      },
      {
        name: 'caseNumber',
        label: 'Case Number',
        type: 'text',
        required: true,
      },
      {
        name: 'issueDescription',
        label: 'Issue Description',
        type: 'textarea',
        required: true,
      },
      {
        name: 'qboVersion',
        label: 'QBO Version',
        type: 'select',
        required: false,
        options: [
          { value: 'online', label: 'Online' },
          { value: 'desktop', label: 'Desktop' },
          { value: 'unknown', label: 'Unknown' },
        ],
      },
    ],
  },
  {
    id: 'transaction-risk-form',
    title: 'Transaction Risk Form',
    description: 'Form for collecting transaction risk information',
    category: 'risk',
    outputMode: 'text',
    fields: [
      {
        name: 'customerName',
        label: "Customer's Name",
        type: 'text',
        required: true,
        placeholder: 'Name from Step 1',
      },
      {
        name: 'contactPhone',
        label: 'Contact Phone Number',
        type: 'text',
        required: true,
        placeholder: 'Phone from Step 1',
      },
      {
        name: 'midUuid',
        label: 'MID or UUID',
        type: 'text',
        required: true,
        placeholder: 'MID from Step 1',
        transform: 'uppercase',
      },
      {
        name: 'realm',
        label: 'Realm',
        type: 'text',
        required: true,
        placeholder: 'COID from Step 1',
      },
      {
        name: 'midStatus',
        label: 'MID Open or Closed',
        type: 'select',
        required: true,
        options: [
          { value: 'open', label: 'Open' },
          { value: 'closed', label: 'Closed' },
          { value: 'denied', label: 'Denied' },
        ],
      },
      {
        name: 'banControlOn',
        label: 'Ban Control On',
        type: 'radio',
        required: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
        defaultValue: 'no',
      },
      {
        name: 'nachaOn',
        label: 'NACHA ON',
        type: 'radio',
        required: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
        defaultValue: 'no',
      },
      {
        name: 'bankAccountUpdated',
        label: 'Bank Account Updated?',
        type: 'text',
        required: true,
        defaultValue: 'NA',
        readOnly: true,
      },
      {
        name: 'dateUpdated',
        label: 'Date Updated',
        type: 'text',
        required: true,
        defaultValue: 'NA',
        readOnly: true,
      },
      {
        name: 'bankLetterUploaded',
        label: 'Bank Letter Uploaded',
        type: 'text',
        required: true,
        defaultValue: 'NA',
        readOnly: true,
      },
      {
        name: 'dateUploaded',
        label: 'Date Uploaded',
        type: 'text',
        required: true,
        defaultValue: 'NA',
        readOnly: true,
      },
      {
        name: 'foh',
        label: 'FOH',
        type: 'radio',
        required: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
        defaultValue: 'no',
        conditional: true,
      },
      {
        name: 'fohAmount',
        label: 'Amount',
        type: 'text',
        required: false,
        conditionalField: 'foh',
        conditionalValue: 'yes',
        placeholder: 'Enter amount',
      },
      {
        name: 'openCorrespondences',
        label: 'Any Open Correspondences',
        type: 'radio',
        required: true,
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
        defaultValue: 'no',
        conditional: true,
      },
      {
        name: 'correspondenceStatus',
        label: 'What is the status of the correspondence:',
        type: 'textarea',
        required: false,
        conditionalField: 'openCorrespondences',
        conditionalValue: 'yes',
        placeholder: 'Enter correspondence status',
      },
      {
        name: 'riskOpsCase',
        label: 'Risk Ops Case #',
        type: 'text',
        required: true,
      },
      {
        name: 'lastCaseNoteDate',
        label: 'Date of last case note',
        type: 'date',
        required: true,
      },
      {
        name: 'lastRiskAnalystNote',
        label:
          'When was the last time a Risk analyst notated the case referenced above?',
        type: 'date',
        required: true,
      },
      {
        name: 'referralReason',
        label: 'Reason for referral',
        type: 'textarea',
        required: true,
        placeholder: 'Please provide details about the referral reason',
      },
    ],
  },
];
