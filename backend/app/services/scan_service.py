import os
import uuid

from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session
from uuid import UUID

from app.models.scan import Scan
from app.schemas.scan import ScanType

from app.repositories.scan_repository import ScanRepository
from app.repositories.finding_repository import FindingRepository

from app.services.sarif_parser import SarifParser
from app.services.sarif_validator import SarifValidator


UPLOAD_DIR = "app/uploads"


class ScanService:

    def __init__(self, db: Session):

        self.db = db
        self.scan_repo = ScanRepository(db)
        self.finding_repo = FindingRepository(db)

    def upload(
        self,
        project_id: UUID,
        filename: str,
        content: bytes,
        scan_type: ScanType,
    ):

        sarif = SarifValidator.validate(content)

        tool = SarifValidator.detect_tool(sarif)

        os.makedirs(UPLOAD_DIR, exist_ok=True)

        safe_filename = os.path.basename(filename or "scan.sarif")
        unique_name = f"{uuid.uuid4()}_{safe_filename}"
        stored_file = os.path.join(UPLOAD_DIR, unique_name)

        with open(stored_file, "xb") as f:
            f.write(content)

        try:
            lock_key = (
                f"scan-upload:{project_id}:"
                f"{tool.strip().lower()}:{scan_type.value}"
            )
            self.db.execute(
                sql_text(
                    "SELECT pg_advisory_xact_lock("
                    "hashtextextended(:lock_key, 0))"
                ),
                {"lock_key": lock_key},
            )

            scan = Scan(
                tool=tool,
                scan_type=scan_type.value,
                filename=unique_name,
                project_id=project_id,
                status="Processing",
            )
            self.db.add(scan)
            self.db.flush()

            findings = SarifParser.parse(scan.id, sarif)
            findings = self.finding_repo.classify_and_deduplicate(
                findings,
                project_id,
                tool,
                scan_type.value,
            )
            self.db.add_all(findings)
            scan.status = "Completed"
            self.db.commit()
            self.db.refresh(scan)

            return scan, len(findings)
        except Exception:
            self.db.rollback()
            try:
                os.remove(stored_file)
            except FileNotFoundError:
                pass
            raise

    def delete(self, scan: Scan) -> None:
        stored_file = os.path.join(
            UPLOAD_DIR,
            os.path.basename(scan.filename),
        )
        self.scan_repo.delete(scan)

        try:
            os.remove(stored_file)
        except FileNotFoundError:
            pass
