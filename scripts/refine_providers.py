#!/usr/bin/env python3
"""Re-align descriptions to providers by matching email/name in text."""

import json
import re
from pathlib import Path

SEED = Path(__file__).resolve().parents[1] / "data" / "providers.seed.json"
PDF_PATH = Path("/home/ubuntu/.cursor/projects/workspace/uploads/Referral_Database_-_Sheet1_0db4.pdf")

from pypdf import PdfReader


def main():
    reader = PdfReader(str(PDF_PATH))
    blocks = []
    for page in reader.pages[11:]:
        for block in page.extract_text().split("---"):
            block = block.strip()
            if len(block) > 50:
                blocks.append(block)

    with open(SEED) as f:
        providers = json.load(f)

    for p in providers:
        email = (p.get("email") or "").lower()
        name_parts = re.sub(r"[^a-z\s]", "", p["name"].lower()).split()
        best = p.get("description", "")
        best_score = 0

        for block in blocks:
            score = 0
            bl = block.lower()
            if email and email.split("@")[0] in bl:
                score += 10
            if email and email in bl:
                score += 20
            for part in name_parts:
                if len(part) > 3 and part in bl:
                    score += 3
            if p.get("phone") and p["phone"].replace("-", "") in bl.replace("-", "").replace(" ", ""):
                score += 5
            if score > best_score:
                best_score = score
                best = block

        if best_score >= 5:
            p["description"] = best[:2500]
            p["low_cost"] = any(
                x in best.lower()
                for x in ["sliding scale", "low-fee", "low fee", "pay what you can", "discounted"]
            )
            if "virtual only" in best.lower() or "telehealth only" in best.lower():
                p["session_format"] = "Virtual"
            elif "in person" in best.lower() and ("virtual" in best.lower() or "telehealth" in best.lower()):
                p["session_format"] = "Both"
            elif "in person" in best.lower() or "in-person" in best.lower():
                if p.get("session_format") == "Unknown":
                    p["session_format"] = "In-Person"
            states = []
            for st in ["NY", "NJ", "CT", "CO", "MA", "TX", "FL", "IL"]:
                if re.search(rf"\b{st}\b", best) or f" {st.lower()}" in best.lower():
                    states.append(st)
            if states:
                p["licensed_states"] = sorted(set(states))
            p["accepting_clients"] = (
                "accepting new" in best.lower()
                or "currently accepting" in best.lower()
            ) and "not accepting" not in best.lower() and "waitlist" not in best.lower()

        # Clean website from wrong extractions
        if p.get("websites", {}).get("practice", "").endswith(".pdf"):
            del p["websites"]["practice"]

    with open(SEED, "w") as f:
        json.dump(providers, f, indent=2)
    print(f"Refined {len(providers)} providers")


if __name__ == "__main__":
    main()
