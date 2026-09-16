export interface PrivacyFlag {
  field: string;
  code: string;
  remediation: string;
}

export interface PrivacyReport {
  safe: boolean;
  flags: PrivacyFlag[];
}

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_PATTERN = /(?:\+?65[ -]?)?[689]\d{3}[ -]?\d{4}\b|\+\d{1,3}[ -]?\d{3,4}[ -]?\d{4,}/;
const STUDENT_ID_PATTERN = /\b[A-Za-z]\d{7}[A-Za-z]\b|\b(?:matric|student\s*id|admin\s*no)[:\s]+[A-Za-z0-9-]+\b/i;
const URL_TOKEN_PATTERN = /https?:\/\/\S*(?:token|key|secret|auth|sig|api_key|access_token)=\S+/i;
const LABELLED_NAME_PATTERN = /\b(?:name|student|classmate|lecturer|professor|prof|supervisor|teammate|colleague)\s*:\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/i;
const PRIVATE_LOCATION_PATTERN = /\b(?:blk|block)\s*\d+\s*(?:#\d+-\d+)?\b|\b(?:hall|rc|residence)\s*\d+\s*(?:room|unit)\s*\d+\b/i;

const MAX_FIELD_LENGTH = 1500;
const MAX_LINE_BREAKS = 12;

export function scanSubmissionClient(fields: Record<string, string | undefined>): PrivacyReport {
  const flags: PrivacyFlag[] = [];

  for (const [field, val] of Object.entries(fields)) {
    if (!val || typeof val !== "string") continue;
    const text = val.trim();
    if (!text) continue;

    if (text.length > MAX_FIELD_LENGTH || (text.match(/\n/g) || []).length >= MAX_LINE_BREAKS) {
      flags.push({
        field,
        code: "long_chat_paste",
        remediation: "Please summarize the interaction in your own words rather than pasting a long chat transcript.",
      });
    }

    if (EMAIL_PATTERN.test(text)) {
      flags.push({
        field,
        code: "contains_email",
        remediation: "Please remove email addresses from the submission.",
      });
    }

    if (PHONE_PATTERN.test(text)) {
      flags.push({
        field,
        code: "contains_phone",
        remediation: "Please remove phone numbers or direct contact numbers.",
      });
    }

    if (STUDENT_ID_PATTERN.test(text)) {
      flags.push({
        field,
        code: "contains_student_id",
        remediation: "Please remove student matriculation or ID numbers.",
      });
    }

    if (URL_TOKEN_PATTERN.test(text)) {
      flags.push({
        field,
        code: "contains_private_url",
        remediation: "Please remove URLs containing access tokens or private query parameters.",
      });
    }

    if (LABELLED_NAME_PATTERN.test(text)) {
      flags.push({
        field,
        code: "contains_labelled_name",
        remediation: "Please refer to individuals by role (e.g. 'a classmate', 'the instructor') instead of using personal names.",
      });
    }

    if (PRIVATE_LOCATION_PATTERN.test(text)) {
      flags.push({
        field,
        code: "contains_private_location",
        remediation: "Please describe the general setting (e.g. 'in the campus canteen') rather than specific residential units or room numbers.",
      });
    }
  }

  return { safe: flags.length === 0, flags };
}
