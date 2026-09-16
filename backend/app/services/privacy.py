"""Deterministic privacy scanner for community contributions and perspectives.

Flags sensitive identifiers, personal information, and raw chat dumps
WITHOUT echoing secrets into logs, reports, or model prompts.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import re
from typing import Mapping

EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
# Singapore 8-digit numbers starting with 6, 8, 9, or standard international format with plus
PHONE_PATTERN = re.compile(r"(?:\+?65[ -]?)?[689]\d{3}[ -]?\d{4}\b|\+\d{1,3}[ -]?\d{3,4}[ -]?\d{4,}")
# Student/Matric ID patterns (NUS: A0123456X, NTU: U1234567X, or labelled student ID)
STUDENT_ID_PATTERN = re.compile(
    r"\b[A-Za-z]\d{7}[A-Za-z]\b|\b(?:matric|student\s*id|admin\s*no)[:\s]+[A-Za-z0-9-]+\b",
    re.IGNORECASE,
)
# URL containing private tokens or secrets
URL_TOKEN_PATTERN = re.compile(
    r"https?://\S*(?:token|key|secret|auth|sig|api_key|access_token)=\S+",
    re.IGNORECASE,
)
# Labelled names: "Name: John Doe", "Student: Jane", "Prof: Tan", etc.
LABELLED_NAME_PATTERN = re.compile(
    r"\b(?:name|student|classmate|lecturer|professor|prof|supervisor|teammate|colleague)\s*:\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b",
    re.IGNORECASE,
)
# Specific private locations/room numbers (e.g., Blk 123 #04-56, Hall 4 Room 201)
PRIVATE_LOCATION_PATTERN = re.compile(
    r"\b(?:blk|block)\s*\d+\s*(?:#\d+-\d+)?\b|\b(?:hall|rc|residence)\s*\d+\s*(?:room|unit)\s*\d+\b",
    re.IGNORECASE,
)

MAX_FIELD_LENGTH = 1500
MAX_LINE_BREAKS = 12


@dataclass(frozen=True)
class PrivacyFlag:
    field: str
    code: str
    remediation: str


@dataclass(frozen=True)
class PrivacyReport:
    safe: bool
    flags: list[PrivacyFlag] = field(default_factory=list)


def scan_submission(fields: Mapping[str, str | None]) -> PrivacyReport:
    """Scan string fields for privacy and sensitive identifier violations.

    Does not return or log any matched secrets.
    """
    flags: list[PrivacyFlag] = []

    for field_name, value in fields.items():
        if not value or not isinstance(value, str):
            continue

        text = value.strip()
        if not text:
            continue

        # 1. Long chat paste or excessive line breaks
        if len(text) > MAX_FIELD_LENGTH or text.count("\n") >= MAX_LINE_BREAKS:
            flags.append(
                PrivacyFlag(
                    field=field_name,
                    code="long_chat_paste",
                    remediation="Please summarize the interaction in your own words rather than pasting a long chat transcript.",
                )
            )

        # 2. Email detection
        if EMAIL_PATTERN.search(text):
            flags.append(
                PrivacyFlag(
                    field=field_name,
                    code="contains_email",
                    remediation="Please remove email addresses from the submission.",
                )
            )

        # 3. Phone detection
        if PHONE_PATTERN.search(text):
            flags.append(
                PrivacyFlag(
                    field=field_name,
                    code="contains_phone",
                    remediation="Please remove phone numbers or direct contact numbers.",
                )
            )

        # 4. Student ID detection
        if STUDENT_ID_PATTERN.search(text):
            flags.append(
                PrivacyFlag(
                    field=field_name,
                    code="contains_student_id",
                    remediation="Please remove student matriculation or ID numbers.",
                )
            )

        # 5. URL with private token
        if URL_TOKEN_PATTERN.search(text):
            flags.append(
                PrivacyFlag(
                    field=field_name,
                    code="contains_private_url",
                    remediation="Please remove URLs containing access tokens or private query parameters.",
                )
            )

        # 6. Labelled name
        if LABELLED_NAME_PATTERN.search(text):
            flags.append(
                PrivacyFlag(
                    field=field_name,
                    code="contains_labelled_name",
                    remediation="Please refer to individuals by role (e.g. 'a classmate', 'the instructor') instead of using personal names.",
                )
            )

        # 7. Private location
        if PRIVATE_LOCATION_PATTERN.search(text):
            flags.append(
                PrivacyFlag(
                    field=field_name,
                    code="contains_private_location",
                    remediation="Please describe the general setting (e.g. 'in the campus canteen') rather than specific residential units or room numbers.",
                )
            )

    return PrivacyReport(safe=len(flags) == 0, flags=flags)
