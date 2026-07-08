#!/usr/bin/env python3
"""Extract providers from CPS Referral Book and merge into providers.json."""

import csv
import json
import re
from pathlib import Path

BOOK = Path("/home/ubuntu/.cursor/projects/workspace/uploads/CPS_Referral_Book_dbff.txt")
CSV = Path("/workspace/missing_providers_for_review.csv")
PROVIDERS = Path("/workspace/data/providers.json")

INSURANCE_SECTIONS = {
    "1199": "1199",
    "aetna (fordham student insurance)": "Aetna",
    "aetna": "Aetna",
    "blue cross blue shield": "Blue Cross Blue Shield",
    "cigna": "Cigna",
    "emblem": "Emblem",
    "ghi": "GHI",
    "health republic ny": "Health Republic NY",
    "healthfirst": "Healthfirst",
    "hip": "HIP",
    "homestead": "Homestead",
    "humana": "Humana",
    "management health networks": "Management Health Networks",
    "magnacare ppo": "MagnaCare",
    "medicaid": "Medicaid",
    "medicare": "Medicare",
    "oxford": "Oxford",
    "tricare": "TriCare",
    "united healthcare": "United HealthCare",
    "sliding scale providers": "Sliding Scale",
    "out of network": "Out of Network",
    "low fee clinics, programs, and institutes": "Sliding Scale",
}

INSURANCE_KEYWORDS = {
    "aetna": "Aetna",
    "blue cross": "Blue Cross Blue Shield",
    "bcbs": "Blue Cross Blue Shield",
    "cigna": "Cigna",
    "emblem": "Emblem",
    "ghi": "GHI",
    "healthfirst": "Healthfirst",
    "hip": "HIP",
    "medicaid": "Medicaid",
    "medicare": "Medicare",
    "oxford": "Oxford",
    "united health": "United HealthCare",
    "united healthcare": "United HealthCare",
    "sliding scale": "Sliding Scale",
    "out of network": "Out of Network",
    "out-of-network": "Out of Network",
    "oon": "Out of Network",
}

SPECIALTY_KEYWORDS = {
    "adhd": "ADHD",
    "eating disorder": "Eating Disorders",
    "anorexia": "Eating Disorders",
    "bulimia": "Eating Disorders",
    "lgbtq": "LGBTQ+",
    "lgbt": "LGBTQ+",
    "trauma": "Trauma",
    "ptsd": "Trauma",
    "substance": "Substance Abuse",
    "alcohol": "Substance Abuse",
    "grief": "Grief/Bereavement",
    "bereavement": "Grief/Bereavement",
    "veteran": "Veterans",
    "bilingual": "Bilingual",
    "mandarin": "Bilingual",
    "spanish": "Bilingual",
    "cantonese": "Bilingual",
    "autism": "Autism/Asperger's",
    "asperger": "Autism/Asperger's",
}

MODALITY_KEYWORDS = {
    "cbt": "CBT",
    "dbt": "DBT",
    "emdr": "EMDR",
    "psychodynamic": "Psychodynamic",
    "act": "ACT",
    "mindfulness": "Mindfulness",
    "family systems": "Family Systems",
    "ifs": "Family Systems",
}

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}")
URL_RE = re.compile(r"https?://[^\s<>\"']+|www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}[^\s<>\"']*")


def norm_name(s: str) -> str:
    return re.sub(r"\s+", " ", s.lower().strip())


def search_keys(name: str) -> list[str]:
    keys = []
    base = re.sub(r"\([^)]*\)", "", name).strip()
    base = re.sub(r"^dr\.?\s+", "", base, flags=re.I)
    keys.append(norm_name(base))
    if "," in base:
        keys.append(norm_name(base.split(",")[0]))
    parts = base.replace(",", " ").split()
    if len(parts) >= 2:
        keys.append(norm_name(f"{parts[0]} {parts[-1]}"))
    return [k for k in keys if len(k) >= 3]


def provider_type(name: str, category: str) -> str:
    if category == "practice/group":
        return "Group Practice"
    n = name.upper()
    if "MD" in n or "PNP" in n:
        return "Psychiatrist / Medication"
    if "PHD" in n or "PSY.D" in n or "PSYD" in n:
        return "Psychologist"
    if "LCSW" in n or "LMSW" in n:
        return "Social Work"
    return "Therapist"


def infer_session(text: str) -> str:
    t = text.lower()
    has_in = any(x in t for x in ["in person", "in-person", "in office", "in-office"])
    has_virt = any(x in t for x in ["virtual", "telehealth", "remote", "video"])
    if has_in and has_virt:
        return "Both"
    if has_virt and not has_in:
        return "Virtual"
    if has_in:
        return "In-Person"
    return "Both"


def infer_specialties(text: str) -> list[str]:
    t = text.lower()
    found = []
    for kw, label in SPECIALTY_KEYWORDS.items():
        if kw in t and label not in found:
            found.append(label)
    return found


def infer_modalities(text: str) -> list[str]:
    t = text.lower()
    found = []
    for kw, label in MODALITY_KEYWORDS.items():
        if kw in t and label not in found:
            found.append(label)
    return found


def infer_insurance(text: str, section_insurance: list[str]) -> list[str]:
    ins = list(section_insurance)
    t = text.lower()
    for kw, label in INSURANCE_KEYWORDS.items():
        if kw in t and label not in ins:
            ins.append(label)
    return sorted(set(ins), key=str.lower)


def parse_block(lines: list[str]) -> dict:
    text = "\n".join(lines).strip()
    emails = EMAIL_RE.findall(text)
    phones = PHONE_RE.findall(text)
    urls = URL_RE.findall(text)

    address = None
    for line in lines[1:8]:
        line = line.strip()
        if not line or "@" in line or line.startswith("http") or line.startswith("www."):
            continue
        if re.search(r"\d+.*(?:street|st\.|ave|avenue|blvd|broadway|road|rd\.|suite|floor|ny)\b", line, re.I):
            address = line
            break
        if re.search(r"\b\d{5}\b", line) and len(line) > 10:
            address = line
            break

    websites = {}
    for u in urls:
        url = u if u.startswith("http") else f"https://{u}"
        low = url.lower()
        if "psychologytoday" in low:
            websites["psychology_today"] = url
        elif "alma" in low:
            websites["alma"] = url
        elif "headway" in low:
            websites["headway"] = url
        else:
            websites.setdefault("practice", url)

    return {
        "email": emails[0] if emails else None,
        "phone": phones[0] if phones else None,
        "address": address,
        "websites": websites,
        "text": text,
    }


def build_sections(lines: list[str]) -> list[tuple[str, int, int]]:
    """Return (section_label, start_line, end_line) for insurance sections."""
    section_starts = []
    for i, line in enumerate(lines):
        key = line.strip().lower().rstrip(":")
        if key in INSURANCE_SECTIONS:
            section_starts.append((INSURANCE_SECTIONS[key], i))
    sections = []
    for idx, (label, start) in enumerate(section_starts):
        end = section_starts[idx + 1][1] if idx + 1 < len(section_starts) else len(lines)
        sections.append((label, start, end))
    return sections


def find_blocks(lines: list[str], name: str, category: str) -> list[tuple[list[str], str]]:
    """Find text blocks for a provider; return (lines, section_insurance)."""
    keys = search_keys(name)
    sections = build_sections(lines)
    results = []

    for i, line in enumerate(lines):
        line_norm = norm_name(line.strip().rstrip(":"))
        matched = False
        for k in keys:
            if line_norm == k or line_norm.startswith(k + ",") or k == line_norm:
                matched = True
                break
            if category == "practice/group" and k in line_norm and len(line.strip()) < 80:
                matched = True
                break
        if not matched:
            continue

        block = [line.strip()]
        j = i + 1
        while j < len(lines):
            nxt = lines[j].strip()
            if not nxt:
                if j + 1 < len(lines) and not lines[j + 1].strip():
                    break
                block.append("")
                j += 1
                continue
            # stop at next provider-like header in same style
            if j > i + 1 and re.match(r"^[A-Z][^\n]{2,60},\s*(?:Ph\.?D|Psy\.?D|LCSW|LMHC|MD|MA|MS)", nxt):
                break
            if category == "individual" and j > i + 1 and re.match(r"^[A-Z][A-Za-z '&().-]{4,70}$", nxt) and any(
                w in nxt.lower() for w in ["center", "clinic", "institute", "psychotherapy", "counseling", "therapy", "services", "group", "health"]
            ):
                break
            block.append(nxt)
            j += 1
            if len(block) > 25:
                break

        section_ins = []
        for label, start, end in sections:
            if start <= i < end:
                section_ins.append(label)
                break

        results.append((block, section_ins[0] if section_ins else ""))

    return results


def make_provider(name: str, category: str, parsed_blocks: list[tuple[list[str], str]], next_id: int) -> dict:
    all_text = []
    section_ins = []
    email = phone = address = None
    websites = {}

    for block, sec in parsed_blocks:
        info = parse_block(block)
        all_text.append(info["text"])
        if sec:
            section_ins.append(sec)
        email = email or info["email"]
        phone = phone or info["phone"]
        address = address or info["address"]
        websites.update(info["websites"])

    combined = "\n\n".join(all_text)
    insurance = infer_insurance(combined, section_ins)
    specialties = infer_specialties(combined)
    modalities = infer_modalities(combined)
    session_format = infer_session(combined)
    in_person = session_format in ("In-Person", "Both")
    low_cost = "Sliding Scale" in insurance or "sliding scale" in combined.lower() or "low fee" in combined.lower() or "low-fee" in combined.lower()

    accepting = "accepting" in combined.lower() and "not accepting" not in combined.lower()

    return {
        "name": name if category == "individual" else name,
        "type": provider_type(name, category),
        "insurance": insurance,
        "in_person": in_person,
        "session_format": session_format,
        "address": address,
        "email": email,
        "phone": phone,
        "websites": websites,
        "specialties": specialties,
        "modalities": modalities,
        "low_cost": low_cost,
        "licensed_states": ["NY"],
        "description": combined[:4000] if combined else f"Listed in CPS Referral Book. Contact for current availability.",
        "accepting_clients": accepting,
        "active": True,
        "id": next_id,
    }


def main():
    book_lines = BOOK.read_text(encoding="utf-8", errors="replace").splitlines()
    with open(PROVIDERS) as f:
        existing = json.load(f)

    existing_names = {norm_name(p["name"].split(",")[0]) for p in existing}
    max_id = max(p.get("id", 0) for p in existing)

    to_add = []
    with open(CSV, newline="") as f:
        for row in csv.DictReader(f):
            if row["in_search_tool"] == "yes":
                continue
            to_add.append((row["category"], row["name"]))

    # Normalize practice names
    practice_aliases = {
        "Ackerman Institute": "Ackerman Institute for the Family",
        "Yiwen Fan & Associates": "Yiwen Fan & Associates Psychotherapy",
    }

    added = []
    skipped = []
    next_id = max_id + 1

    for category, name in to_add:
        lookup = practice_aliases.get(name, name)
        key = norm_name(name.split(",")[0])
        if key in existing_names:
            skipped.append(name)
            continue

        blocks = find_blocks(book_lines, lookup, category)
        if not blocks and category == "practice/group":
            blocks = find_blocks(book_lines, name, category)

        if not blocks:
            # minimal entry
            prov = make_provider(name, category, [([name], "")], next_id)
            prov["description"] = f"Listed in CPS Referral Book as {name}. See referral book for contact details."
        else:
            prov = make_provider(name, category, blocks, next_id)

        added.append(prov)
        existing_names.add(key)
        next_id += 1

    merged = existing + added
    with open(PROVIDERS, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2, ensure_ascii=False)
        f.write("\n")

    print(f"Existing: {len(existing)}")
    print(f"Added: {len(added)}")
    print(f"Skipped (duplicate): {len(skipped)}")
    print(f"Total: {len(merged)}")
    if skipped:
        print("Skipped:", skipped)


if __name__ == "__main__":
    main()
