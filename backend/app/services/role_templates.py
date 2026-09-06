DEFAULT_ROLE_TEMPLATES = [
    {
        "name": "Platform Administrator",
        "description": "Full control over ScanHive, including IAM, projects, scans, findings, and platform settings.",
        "permissions": [
            "iam.users.manage", "iam.roles.manage", "iam.groups.manage",
            "projects.manage", "scans.manage", "findings.manage",
            "findings.triage", "settings.manage",
        ],
    },
    {
        "name": "Security Administrator",
        "description": "Leads the security program and manages scanners, findings, triage workflows, and projects.",
        "permissions": [
            "projects.manage", "scans.manage", "findings.manage",
            "findings.triage", "security.reports.manage",
        ],
    },
    {
        "name": "Security Analyst",
        "description": "Investigates scan results, reviews vulnerabilities, and performs finding triage and documentation.",
        "permissions": [
            "projects.read", "scans.read", "findings.read",
            "findings.triage", "security.reports.read",
        ],
    },
    {
        "name": "DevSecOps Engineer",
        "description": "Integrates security tooling, uploads scans, manages project security data, and supports remediation workflows.",
        "permissions": [
            "projects.manage", "scans.manage", "findings.read",
            "findings.triage",
        ],
    },
    {
        "name": "Developer",
        "description": "Views assigned project findings, uploads relevant scan results, and works on vulnerability remediation.",
        "permissions": ["projects.read", "scans.read", "scans.upload", "findings.read"],
    },
    {
        "name": "Project Owner",
        "description": "Manages assigned projects, monitors their security posture, and coordinates remediation.",
        "permissions": ["projects.manage_assigned", "scans.read", "findings.read", "security.reports.read"],
    },
    {
        "name": "Auditor",
        "description": "Read-only access to security posture, scan history, findings, triage decisions, and reports.",
        "permissions": ["projects.read", "scans.read", "findings.read", "security.reports.read", "audit.read"],
    },
]
