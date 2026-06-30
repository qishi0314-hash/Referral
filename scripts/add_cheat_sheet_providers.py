#!/usr/bin/env python3
"""Migrate sliding scale to insurance, add cheat sheet providers, sync docs JSON."""

import json
from pathlib import Path

SEED = Path(__file__).resolve().parents[1] / "data" / "providers.seed.json"
DOCS = Path(__file__).resolve().parents[1] / "docs" / "data" / "providers.json"

SLIDING = "Sliding Scale"


def ensure_sliding_scale(provider: dict) -> None:
    ins = provider.get("insurance") or []
    if provider.get("low_cost") and SLIDING not in ins:
        ins.append(SLIDING)
    provider["insurance"] = sorted(set(ins), key=str.lower)


def update_blanton_peale(providers: list[dict]) -> None:
    for p in providers:
        if p["name"] == "The Blanton-Peale Counseling Center":
            p.update(
                {
                    "type": "Group Practice",
                    "insurance": sorted(
                        {
                            "1199",
                            "Aetna",
                            "Blue Cross Blue Shield",
                            "Emblem",
                            "GHI",
                            "Medicaid",
                            "Medicare",
                            "Oxford",
                            "United HealthCare",
                            SLIDING,
                        },
                        key=str.lower,
                    ),
                    "session_format": "Both",
                    "address": "7 West 30th Street, 9th and 10th Fls, New York, NY 10001",
                    "email": "intake@blantonpeale.org",
                    "phone": "212-725-7850",
                    "websites": {"practice": "https://www.blantonpeale.org/"},
                    "specialties": [],
                    "modalities": ["Psychodynamic"],
                    "low_cost": True,
                    "licensed_states": ["NY"],
                    "description": (
                        "To make an appointment contact Client Coordinator at 1-212-725-7850 ext. 119 "
                        "or Email: intake@blantonpeale.org (email preferred & faster). "
                        "Individual Appointment w/o insurance: $90. Sliding scale: $60-105 depending on income. "
                        "Accepts most insurances including 1199 Benefits Fund, AARP, Aetna, Affinity Health Plans, "
                        "Amida Care, Beacon, Emblem Health, Empire BCBS, Fidelis Care, GHI, Health First, Magnacare, "
                        "Metro Plus, NYS Medicaid, Optum, Oscar, Oxford Health Plans, Student Resources, UBH, UMR, "
                        "United Healthcare, Wellcare."
                    ),
                    "accepting_clients": True,
                    "active": True,
                }
            )
            ensure_sliding_scale(p)
            return


NEW_PROVIDERS = [
    {
        "name": "Hillary Lewin Tuvia, PhD",
        "type": "Psychologist",
        "insurance": ["Blue Cross Blue Shield", "Cigna", "GHI", SLIDING],
        "session_format": "Both",
        "address": "110 West 96th Street",
        "email": "Hillary.lewin@gmail.com",
        "phone": "(646) 415-1405",
        "websites": {"practice": "https://www.uwstherapygroup.com"},
        "specialties": [],
        "modalities": ["Psychodynamic"],
        "low_cost": True,
        "licensed_states": ["NY"],
        "description": (
            "Interpersonal psychodynamic, emerging adults (college students, grad students). "
            "Sliding scale $45-$175. Offers online therapy and in person."
        ),
        "accepting_clients": True,
        "active": True,
    },
    {
        "name": "Campus Care Collective",
        "type": "Group Practice",
        "insurance": ["Aetna"],
        "session_format": "Both",
        "address": "343 West 58th Street, suite 11B, first floor",
        "email": "info@campuscarecollective.com",
        "phone": "212-477-5342",
        "websites": {},
        "specialties": [],
        "modalities": [],
        "low_cost": False,
        "licensed_states": ["NY"],
        "description": (
            "Dr. Victor Mensah. In-person and remote services. Specializes in student care. Accepts Aetna."
        ),
        "accepting_clients": True,
        "active": True,
    },
    {
        "name": "The Dean Hope Center for Educational and Psychological Services (DHCEPS)",
        "type": "Group Practice",
        "insurance": [SLIDING],
        "session_format": "Both",
        "address": "525 West 120th Street, Thorndike Hall 6th Floor, New York, NY 10027",
        "email": "dhceps@tc.columbia.edu",
        "phone": "212-678-3262",
        "websites": {"practice": "https://www.tc.columbia.edu/deanhope/services/"},
        "specialties": [],
        "modalities": [],
        "low_cost": True,
        "licensed_states": ["NY"],
        "description": (
            "Individual, group, couples therapy, learning disabilities and testing. "
            "Practicum site for TC doctoral students. Sliding scale $7-40/session (full), "
            "$100-1000 for assessments. Testing Library: 212-678-3881."
        ),
        "accepting_clients": True,
        "active": True,
    },
    {
        "name": "Rose Hill Psychological Services",
        "type": "Group Practice",
        "insurance": [
            "Aetna",
            "Blue Cross Blue Shield",
            "Cigna",
            "GHI",
            "Oxford",
            "Out of Network",
            "United HealthCare",
            "UMR",
            SLIDING,
        ],
        "session_format": "Both",
        "address": (
            "330 West 58th Street, Suite #409, New York, NY 10019; "
            "696 East 187th Street, Suite #205, Bronx, NY 10458; "
            "80 Central Park West, Suite #1A&B, New York, NY 10023"
        ),
        "email": None,
        "phone": None,
        "websites": {"practice": "http://www.rosehillpsychological.com/"},
        "specialties": [],
        "modalities": [],
        "low_cost": True,
        "licensed_states": ["NY"],
        "description": (
            "Manhattan & Bronx locations. $100 deductible for Fordham insurance, coinsurance $40. "
            "Wiggle room with fees for out of network. Offering video and phone sessions."
        ),
        "accepting_clients": True,
        "active": True,
    },
    {
        "name": "Jessica Del Vita, Ph.D.",
        "type": "Psychologist",
        "insurance": ["Aetna", SLIDING],
        "session_format": "Unknown",
        "address": None,
        "email": None,
        "phone": None,
        "websites": {"alma": "https://secure.helloalma.com/providers/jessica-vita/"},
        "specialties": [],
        "modalities": [],
        "low_cost": True,
        "licensed_states": ["NY"],
        "description": "In-network with Aetna. See provider website for other insurance plans.",
        "accepting_clients": True,
        "active": True,
    },
    {
        "name": "Jung Eun Kim, Ph.D.",
        "type": "Psychologist",
        "insurance": ["Aetna", SLIDING],
        "session_format": "Unknown",
        "address": None,
        "email": None,
        "phone": None,
        "websites": {"alma": "https://secure.helloalma.com/providers/jung-eun-kim/"},
        "specialties": [],
        "modalities": [],
        "low_cost": True,
        "licensed_states": ["NY"],
        "description": "In-network with Aetna. See provider website for other insurance plans.",
        "accepting_clients": True,
        "active": True,
    },
    {
        "name": "Robert (Bobby) Cox, Jr., Ph.D.",
        "type": "Psychologist",
        "insurance": ["Aetna", SLIDING],
        "session_format": "Unknown",
        "address": None,
        "email": None,
        "phone": None,
        "websites": {"alma": "https://secure.helloalma.com/providers/robert-cox/"},
        "specialties": [],
        "modalities": [],
        "low_cost": True,
        "licensed_states": ["NY"],
        "description": "In-network with Aetna. See provider website for other insurance plans.",
        "accepting_clients": True,
        "active": True,
    },
    {
        "name": "Narolyn Mendez, Ph.D.",
        "type": "Psychologist",
        "insurance": ["Aetna", SLIDING],
        "session_format": "Unknown",
        "address": None,
        "email": None,
        "phone": None,
        "websites": {"headway": "https://care.headway.co/providers/narolyn-mendez"},
        "specialties": [],
        "modalities": [],
        "low_cost": True,
        "licensed_states": ["NY"],
        "description": "In-network with Aetna. See provider website for other insurance plans.",
        "accepting_clients": True,
        "active": True,
    },
]


def main():
    providers = json.loads(SEED.read_text())

    for p in providers:
        ensure_sliding_scale(p)

    update_blanton_peale(providers)

    existing_names = {p["name"].lower() for p in providers}
    for np in NEW_PROVIDERS:
        ensure_sliding_scale(np)
        if np["name"].lower() not in existing_names:
            providers.append(np)
            existing_names.add(np["name"].lower())

    providers.sort(key=lambda p: p["name"].lower())

    SEED.write_text(json.dumps(providers, indent=2) + "\n")

    for i, p in enumerate(providers, 1):
        p["id"] = i
    DOCS.write_text(json.dumps(providers, indent=2) + "\n")

    print(f"Updated {len(providers)} providers")


if __name__ == "__main__":
    main()
