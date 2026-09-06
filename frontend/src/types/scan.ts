export type ScanType =
  | "SAST"
  | "SCA"
  | "Secrets"
  | "Container Security"
  | "IaC"
  | "DAST";

export interface ScanHistoryItem {
  id: string;
  scan_type: ScanType;
  tool: string;
  filename: string;
  status: string;
  uploaded_at: string;
  findings: number;
}
