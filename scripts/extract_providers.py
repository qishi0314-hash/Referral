#!/usr/bin/env python3
"""Extract and deduplicate provider data from the referral spreadsheet PDF."""

import json
import re
from pathlib import Path

from pypdf import PdfReader

UPLOADS = Path("/home/ubuntu/.cursor/projects/workspace/uploads")
PDF_PATH = UPLOADS / "Referral_Database_-_Sheet1_0db4.pdf"
OUT_PATH = Path(__file__).resolve().parents[1] / "data" / "providers.seed.json"

# Rows that are notes, not provider names
SKIP_NAMES = {
    "monday to friday",
    "only skype and phone",
    "provides both in-person and virtual sessions.",
    "specializes in dbt, perinatal mood & anxiety disorder program (madp), emdr",
    "takes aetna, cigna, unitedhealthcare, optum, oxford health plans, oscar",
    "therapists",
    "therapy and medication management. in person and virtual.",
    "united health care",
    "east 62nd street",
    "david rust",
    "group practice of lmhcs and msws",
}

INSURANCE_ALIASES = {
    "bcbs": "Blue Cross Blue Shield",
    "uhc": "United HealthCare",
    "hip": "HIP",
    "ghi": "GHI",
    "1199": "1199",
    "out of network": "Out of Network",
    "tricare": "TriCare",
}


def normalize_insurance(raw: str) -> list[str]:
    if not raw or raw.strip() in ("", "No", "Yes"):
        return []
    parts = re.split(r",\s*", raw.strip())
    result = []
    for p in parts:
        key = p.strip().lower()
        if not key:
            continue
        result.append(INSURANCE_ALIASES.get(key, p.strip()))
    return result


def parse_in_person_address(line: str) -> tuple[list[str], str | None, str | None, str | None]:
    """Parse insurance line: insurance + Yes/No + optional address."""
    line = line.strip()
    if not line or line.startswith("Insurance"):
        return [], None, None, None

    # Split Yes/No from insurance
    m = re.match(
        r"^(.+?)\s*(Yes|No)\s*(.*)$",
        line,
        re.IGNORECASE,
    )
    if not m:
        ins = normalize_insurance(line)
        return ins, None, None, None

    ins_raw, in_person_raw, rest = m.group(1), m.group(2), m.group(3).strip()
    ins = normalize_insurance(ins_raw)
    in_person = in_person_raw.lower() == "yes"
    address = rest if rest and len(rest) > 3 else None
    return ins, in_person, address, None


def infer_type(name: str, description: str = "") -> str:
    text = (name + " " + description).lower()
    if any(x in text for x in ["psychiatr", " md", "medication management", "pnp", "skypiatrist"]):
        return "Psychiatrist / Medication"
    if "group practice" in text or "collective" in text or "center" in text or "clinic" in text:
        if "psychologist" in text or "therapy center" in text:
            return "Group Practice"
        if any(x in text for x in ["health", "lab", "institute", "recovery"]):
            return "Group Practice"
    if "lmsw" in text or "lcsw" in text or "social work" in text:
        return "Social Work"
    if "psychologist" in text or "psy.d" in text or "ph.d" in text or "phd" in text:
        return "Psychologist"
    if "lmhc" in text or "therapist" in text or "counselor" in text or "mhc" in text:
        return "Therapist"
    return "Therapist"


def infer_modalities(text: str) -> list[str]:
    t = text.lower()
    mods = []
    for label, patterns in [
        ("CBT", ["cbt", "cognitive behavioral"]),
        ("DBT", ["dbt", "dialectical"]),
        ("EMDR", ["emdr"]),
        ("Psychodynamic", ["psychodynamic", "psychoanalytic", "relational"]),
        ("ACT", [" act", "acceptance and commitment"]),
        ("IFS", [" ifs", "internal family"]),
        ("EFT", [" eft", "emotionally focused"]),
    ]:
        if any(p in t for p in patterns):
            mods.append(label)
    return mods


def infer_session_format(in_person: bool | None, text: str) -> str:
    t = text.lower()
    virtual = any(x in t for x in ["virtual", "telehealth", "remote", "online only", "skype", "video"])
    ip = in_person or any(x in t for x in ["in person", "in-person", "office"])

    if virtual and ip:
        return "Both"
    if virtual:
        return "Virtual"
    if ip:
        return "In-Person"
    if in_person is True:
        return "In-Person"
    if in_person is False:
        return "Virtual"
    return "Unknown"


def infer_low_cost(text: str) -> bool:
    t = text.lower()
    return any(
        x in t
        for x in [
            "sliding scale",
            "low-fee",
            "low fee",
            "pay what you can",
            "discounted rate",
            "$50",
            "$75",
            "$80",
            "$90",
        ]
    )


def extract_websites(text: str) -> dict[str, str]:
    urls = {}
    patterns = [
        (r"https?://[^\s,)]+", "practice"),
        (r"(?:www\.)[\w.-]+\.(?:com|org|co|us|nyc)[^\s,)]*", "practice"),
    ]
    found = re.findall(r"https?://[^\s,)\"']+", text)
    for url in found:
        url = url.rstrip(".)")
        low = url.lower()
        if "psychologytoday" in low:
            urls["psychology_today"] = url
        elif "helloalma" in low or "alma.com" in low:
            urls["alma"] = url
        elif "headway" in low:
            urls["headway"] = url
        elif "practice" not in urls:
            urls["practice"] = url
    return urls


def clean_provider_name(name: str) -> str:
    name = name.strip()
    # Fix known mappings
    if name.lower() == "east 62nd street":
        return "Karen Horney Clinic"
    if name.lower() == "david rust":
        return "Rust Wellness Group"
    if name.lower() == "group practice of lmhcs and msws":
        return "The Soho Center for Mental Health Counseling"
    return name


def main():
    reader = PdfReader(str(PDF_PATH))

    # Pages 1-4: provider names
    names: list[str] = []
    for page in reader.pages[:4]:
        for line in page.extract_text().split("\n"):
            line = line.strip()
            if not line or line == "Provider":
                continue
            if line.lower() in SKIP_NAMES:
                continue
            names.append(clean_provider_name(line))

    # Pages 5-8: insurance rows (0-indexed 4-7)
    insurance_rows: list[tuple] = []
    for page in reader.pages[4:8]:
        for line in page.extract_text().split("\n"):
            if line.strip().startswith("Insurance"):
                continue
            ins, ip, addr, _ = parse_in_person_address(line)
            if ins or ip is not None:
                insurance_rows.append((ins, ip, addr))

    # Page 9+: contact info (index 8)
    contact_rows: list[dict] = []
    for page in reader.pages[8:12]:
        text = page.extract_text()
        if "Email" in text and not contact_rows:
            lines = text.split("\n")[1:]
        else:
            lines = text.split("\n")
        for line in lines:
            line = line.strip()
            if not line or line.startswith("Email"):
                continue
            # Split specialties at end if present
            specialties = []
            email = phone = website = None

            if "@" in line or "http" in line or re.search(r"\d{3}[-.\s]?\d{3}", line):
                # Try to extract email
                em = re.search(r"[\w.+-]+@[\w.-]+\.\w+", line)
                if em:
                    email = em.group(0)
                ph = re.search(r"\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", line)
                if ph:
                    phone = ph.group(0)
                urls = re.findall(r"https?://[^\s]+", line)
                if urls:
                    website = urls[0]
                else:
                    wm = re.search(r"(?:www\.)?[\w.-]+\.(?:com|org|co|nyc)", line)
                    if wm and "gmail" not in wm.group(0):
                        website = wm.group(0)
                        if not website.startswith("http"):
                            website = "https://" + website

                # Specialties often after website or at end
                spec_match = re.search(
                    r"(CBT|DBT|EMDR|LGBTQ\+?|ADHD|Trauma|Substance Abuse|Eating Disorders|Grief|Bilingual|Veterans|Autism)[\w\s,/\+]*$",
                    line,
                    re.I,
                )
                if spec_match:
                    specialties = [s.strip() for s in re.split(r",\s*", spec_match.group(0)) if s.strip()]

                contact_rows.append(
                    {"email": email, "phone": phone, "website": website, "specialties": specialties, "raw": line}
                )

    # Descriptions pages 12+
    desc_rows: list[str] = []
    for page in reader.pages[11:]:
        for block in page.extract_text().split("---"):
            block = block.strip()
            if len(block) > 40:
                desc_rows.append(block)

    # Align counts — pad or trim
    n = min(len(names), len(insurance_rows), len(contact_rows))
    providers = []

    seen: dict[str, dict] = {}

    for i in range(n):
        name = names[i]
        ins, ip, addr = insurance_rows[i]
        contact = contact_rows[i]
        desc = desc_rows[i] if i < len(desc_rows) else ""

        key = re.sub(r"[^a-z0-9]", "", name.lower())
        if key in seen:
            # Merge duplicate
            existing = seen[key]
            existing["insurance"] = sorted(set(existing["insurance"] + ins))
            if ip is not None:
                existing["in_person"] = existing["in_person"] or ip
            if addr and not existing.get("address"):
                existing["address"] = addr
            if desc and len(desc) > len(existing.get("description", "")):
                existing["description"] = desc[:2000]
            if contact.get("email") and not existing.get("email"):
                existing["email"] = contact["email"]
            if contact.get("phone") and not existing.get("phone"):
                existing["phone"] = contact["phone"]
            if contact.get("website") and not existing.get("website"):
                existing["website"] = contact["website"]
            existing["specialties"] = sorted(
                set(existing.get("specialties", []) + contact.get("specialties", []))
            )
            continue

        full_text = desc + " " + contact.get("raw", "")
        websites = extract_websites(full_text)
        if contact.get("website"):
            websites.setdefault("practice", contact["website"])

        provider = {
            "name": name,
            "type": infer_type(name, desc),
            "insurance": sorted(set(ins)),
            "in_person": ip,
            "session_format": infer_session_format(ip, full_text),
            "address": addr,
            "email": contact.get("email"),
            "phone": contact.get("phone"),
            "websites": websites,
            "specialties": contact.get("specialties", []),
            "modalities": infer_modalities(full_text),
            "low_cost": infer_low_cost(full_text),
            "licensed_states": ["NY"] if "ny" in full_text.lower() or "new york" in full_text.lower() else ["NY"],
            "description": desc[:2000] if desc else contact.get("raw", "")[:500],
            "accepting_clients": "accepting" in full_text.lower() and "not accepting" not in full_text.lower(),
            "active": True,
        }
        seen[key] = provider
        providers.append(provider)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT_PATH, "w") as f:
        json.dump(providers, f, indent=2)

    print(f"Extracted {len(providers)} unique providers -> {OUT_PATH}")


if __name__ == "__main__":
  main()
