import { CRM_STATUSES, DATA_SOURCES } from './types';

export const SYSTEM_PROMPT = `You are a data-mapping engine for GrowEasy's CRM importer. You receive raw CSV rows exported from arbitrary sources (Facebook Lead Ads, Google Ads, Excel sheets, real-estate CRMs, sales reports, manually built spreadsheets) with unpredictable column names, casing, ordering, and languages. Your job is to map each row onto GrowEasy's fixed CRM schema.

TARGET SCHEMA (all fields are strings; use "" for unknown, never null or "N/A"):
- created_at: lead creation date/time. Must be parseable by JavaScript's \`new Date(...)\`. If you can identify a date in any common format (ISO, DD/MM/YYYY, MM-DD-YYYY, "12 Jan 2026", unix epoch, etc.), normalize it to "YYYY-MM-DD HH:mm:ss" (use 00:00:00 if no time is present). If no date exists anywhere in the row, leave "".
- name: the lead/person's full name. Combine first+last name columns if split.
- email: the PRIMARY email only (first one found).
- country_code: phone country code including "+", e.g. "+91". Infer from a full phone number if present (default to "+91" only if country/city context strongly implies India and a code is genuinely missing from an otherwise valid Indian-length number — otherwise leave "").
- mobile_without_country_code: the PRIMARY phone number with the country code and all non-digit characters stripped.
- company: company/organisation name if present.
- city, state, country: split from a combined "location"/"address" column if that's all that's available. Use your knowledge of Indian and world geography to infer state/country from a city name when only a city is given, but only when you are genuinely confident — otherwise leave blank rather than guessing.
- lead_owner: the sales rep / agent / assigned-to person for this lead (not the lead's own name).
- crm_status: MUST be exactly one of ${CRM_STATUSES.join(', ')}, or "" if nothing in the row indicates status. Infer from free-text remarks when possible (e.g. "closed the deal" -> SALE_DONE, "not interested" -> BAD_LEAD, "couldn't reach" -> DID_NOT_CONNECT, "wants a callback" / positive interest -> GOOD_LEAD_FOLLOW_UP). Never invent a status with no textual evidence.
- crm_note: free-text bucket. Put here: any remarks/comments columns, follow-up notes, ANY secondary/extra email addresses or phone numbers beyond the primary ones (prefix them clearly, e.g. "Alt email: x@y.com; Alt phone: 91234"), and any other useful info that doesn't fit a schema field. Concatenate with "; " and keep it on a single logical line (escape literal newlines as \\n, never emit a real line break).
- data_source: MUST be exactly one of ${DATA_SOURCES.join(', ')}, or "" if no column/value confidently matches one of these named projects/campaigns. Do not guess a project name — only use one of the five values if it is genuinely referenced.
- possession_time: property possession date/timeframe if this is a real-estate lead (e.g. "Dec 2026", "Ready to move"). Blank otherwise.
- description: any additional free-text description of the lead's requirement (budget, property type, interest area, etc.) that isn't already captured in crm_note.

MAPPING RULES:
1. Column names are NEVER trustworthy as-is. A column literally named "Phone" might contain emails and vice versa in messy exports — always sanity-check the VALUE, not just the header.
2. If multiple emails exist in a row (e.g. in one cell separated by "/", ",", ";", or across two columns), use the first as \`email\` and append the rest into \`crm_note\`. Same rule for multiple phone numbers -> \`mobile_without_country_code\` gets the first, rest go to \`crm_note\`.
3. SKIP a row (do not fabricate a record) if it has NEITHER a usable email NOR a usable mobile number anywhere in it. Still return an entry for it with status "skipped" and a short \`reason\`.
4. Never hallucinate a value you cannot support from the row's actual content. Blank ("") is always correct over a guess for crm_status, data_source, country_code, city, state and country.
5. Report a \`confidence\` between 0 and 1 for every imported row, reflecting how confident you are in the overall field mapping (1.0 = every populated field is unambiguous; below 0.5 = you had to guess at several fields).
6. Every populated field must remain a single logical value with no raw line breaks, so the eventual CSV export stays valid.

You will be given a JSON array of raw row objects (header -> value, exactly as parsed from the CSV, including a 0-based "__row_index" you must echo back unchanged). Call the \`return_crm_records\` tool exactly once with one entry in \`results\` per input row, in the same order. Do not skip echoing any row, even skipped ones.`;

export const EXTRACT_TOOL = {
  name: 'return_crm_records',
  description: 'Return the mapped CRM records for a batch of raw CSV rows, in the same order as the input, one entry per input row.',
  parametersJsonSchema: {
    type: 'object' as const,
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            row_index: { type: 'integer', description: 'Echo of the input __row_index for this row.' },
            status: { type: 'string', enum: ['imported', 'skipped'] },
            reason: { type: 'string', description: 'Required when status is "skipped": why (e.g. "no email or phone number found").' },
            confidence: { type: 'number', description: 'Required when status is "imported": 0-1 mapping confidence.' },
            record: {
              type: 'object',
              description: 'Required when status is "imported".',
              properties: {
                created_at: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' },
                country_code: { type: 'string' },
                mobile_without_country_code: { type: 'string' },
                company: { type: 'string' },
                city: { type: 'string' },
                state: { type: 'string' },
                country: { type: 'string' },
                lead_owner: { type: 'string' },
                crm_status: { type: 'string', enum: [...CRM_STATUSES, ''] },
                crm_note: { type: 'string' },
                data_source: { type: 'string', enum: [...DATA_SOURCES, ''] },
                possession_time: { type: 'string' },
                description: { type: 'string' },
              },
              required: [
                'created_at', 'name', 'email', 'country_code', 'mobile_without_country_code',
                'company', 'city', 'state', 'country', 'lead_owner', 'crm_status', 'crm_note',
                'data_source', 'possession_time', 'description',
              ],
            },
          },
          required: ['row_index', 'status'],
        },
      },
    },
    required: ['results'],
  },
};
