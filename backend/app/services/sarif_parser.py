from app.models.finding import Finding
from app.utils.severity import SeverityNormalizer
from uuid import UUID
from urllib.parse import unquote
from hashlib import md5


def text(value: dict | None) -> str:
    value = value or {}
    return value.get("text") or value.get("markdown") or ""


def severity_value(result: dict, rule: dict) -> str:
    result_properties = result.get("properties", {}) or {}
    rule_properties = rule.get("properties", {}) or {}
    value = (
        result_properties.get("severity")
        or result_properties.get("problem.severity")
        or rule_properties.get("severity")
        or rule_properties.get("problem.severity")
    )
    if value:
        return str(value)
    score = result_properties.get("security-severity", rule_properties.get("security-severity"))
    try:
        score = float(score)
        if score >= 9: return "critical"
        if score >= 7: return "high"
        if score >= 4: return "medium"
        if score > 0: return "low"
    except (TypeError, ValueError):
        pass
    return result.get("level") or rule.get("defaultConfiguration", {}).get("level") or "warning"


def result_identity(
    rule_id: str,
    fingerprint: str | None,
    file_path: str,
    line_number: int | None,
    message: str,
) -> str:
    if fingerprint and fingerprint.strip():
        identity = f"{rule_id.strip().lower()}|fp|{fingerprint.strip().lower()}"
    else:
        identity = (
            f"{rule_id.strip().lower()}|src|{file_path.strip().lower()}|"
            f"{line_number or ''}|{message.strip().lower()}"
        )

    return md5(identity.encode("utf-8"), usedforsecurity=False).hexdigest()


class SarifParser:

    @staticmethod
    def parse(scan_id: UUID, sarif: dict) -> list[Finding]:

        findings = []

        runs = sarif.get("runs", [])

        for run in runs:

            rules = {}

            tool = run.get("tool", {})
            driver = tool.get("driver", {})

            tool_name = driver.get("name", "")

            rule_list = list(driver.get("rules", []))
            for extension in tool.get("extensions", []):
                rule_list.extend(extension.get("rules", []))
            for rule in rule_list:
                rules[rule.get("id")] = rule

            for result in run.get("results", []):

                rule_index = result.get("ruleIndex")
                indexed_rule = rule_list[rule_index] if isinstance(rule_index, int) and 0 <= rule_index < len(rule_list) else {}
                rule_id = result.get("ruleId") or indexed_rule.get("id") or "Unknown"

                rule = rules.get(rule_id, indexed_rule)

                title = (
                    text(rule.get("shortDescription"))
                    or text(rule.get("fullDescription"))
                    or rule.get("name")
                    or rule_id
                )

                message = (
                    text(result.get("message"))
                    or ""
                )

                level = (
                    severity_value(result, rule)
                )

                severity = SeverityNormalizer.normalize(
                    tool=tool_name,
                    level=level,
                    message=message
                )

                file_path = ""
                line_number = None

                try:
                    location = result["locations"][0]["physicalLocation"]

                    file_path = unquote(location["artifactLocation"].get("uri", ""))

                    line_number = location["region"].get("startLine")

                except Exception:
                    pass

                fingerprint = None

                try:
                    values = list((result.get("partialFingerprints") or result.get("fingerprints") or {}).values())
                    fingerprint = str(values[0]) if values else None
                except Exception:
                    pass

                findings.append(
                    Finding(
                        scan_id=scan_id,
                        rule_id=rule_id,
                        title=title,
                        severity=severity,
                        message=message,
                        file_path=file_path,
                        line_number=line_number,
                        fingerprint=fingerprint,
                        dedup_key=result_identity(
                            rule_id,
                            fingerprint,
                            file_path,
                            line_number,
                            message,
                        ),
                    )
                )

        return findings
