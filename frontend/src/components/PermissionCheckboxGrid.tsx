import type { ReactNode } from "react";

import { Button, Checkbox } from "antd";

import { ROLE_PERMISSIONS } from "../constants/permissions";

const PERMISSION_OPTIONS = ROLE_PERMISSIONS.map((permission) => ({
  label: permission.replaceAll(".", " · "),
  value: permission,
}));

interface PermissionCheckboxGridProps {
  value: string[];
  onChange: (value: string[]) => void;
  countLabel: ReactNode;
  headingClassName?: string;
  gridClassName?: string;
}

export function PermissionCheckboxGrid({
  value,
  onChange,
  countLabel,
  headingClassName,
  gridClassName,
}: PermissionCheckboxGridProps) {
  return (
    <>
      <div className={headingClassName}>
        <div>{countLabel}</div>

        <div>
          <Button
            type="text"
            onClick={() => onChange(ROLE_PERMISSIONS)}
          >
            Select all
          </Button>

          <Button type="text" onClick={() => onChange([])}>
            Clear
          </Button>
        </div>
      </div>

      <Checkbox.Group
        className={gridClassName}
        options={PERMISSION_OPTIONS}
        value={value}
        onChange={(checked) => onChange(checked as string[])}
      />
    </>
  );
}
