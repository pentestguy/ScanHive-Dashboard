import { useEffect, useState } from "react";

import { Form, Input, Modal } from "antd";

import type {
  IamRole,
  RoleRequest,
} from "../types/iam";
import { PermissionCheckboxGrid } from "./PermissionCheckboxGrid";

interface RoleModalProps {
  isOpen: boolean;
  role: IamRole | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (request: RoleRequest) => Promise<void>;
}

const REQUIRED_MESSAGE = "Role name and description are required.";

export function RoleModal({
  isOpen,
  role,
  isSubmitting,
  onClose,
  onSubmit,
}: RoleModalProps) {
  const [form] = Form.useForm<{ name: string; description: string }>();
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    form.setFieldsValue({
      name: role?.name ?? "",
      description: role?.description ?? "",
    });
    setPermissions(role?.permissions ?? []);
  }, [form, isOpen, role]);

  async function handleFinish(values: {
    name: string;
    description: string;
  }): Promise<void> {
    await onSubmit({
      name: values.name.trim(),
      description: values.description.trim(),
      permissions,
    });
  }

  return (
    <Modal
      open={isOpen}
      title={role ? "Edit role" : "Create custom role"}
      onCancel={onClose}
      confirmLoading={isSubmitting}
      okText={isSubmitting ? "Saving..." : role ? "Save role" : "Create role"}
      cancelButtonProps={{ disabled: isSubmitting }}
      onOk={() => form.submit()}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          label="Role name"
          name="name"
          rules={[
            {
              required: true,
              message: REQUIRED_MESSAGE,
              whitespace: true,
            },
          ]}
        >
          <Input
            maxLength={100}
            autoFocus
            placeholder="Release Security Reviewer"
          />
        </Form.Item>

        <Form.Item
          label="Description"
          name="description"
          rules={[
            {
              required: true,
              message: REQUIRED_MESSAGE,
              whitespace: true,
            },
          ]}
        >
          <Input.TextArea maxLength={500} rows={3} />
        </Form.Item>
      </Form>

      <PermissionCheckboxGrid
        value={permissions}
        onChange={setPermissions}
        countLabel={
          <>
            <strong>Permissions</strong>
            <span>{permissions.length} selected</span>
          </>
        }
        headingClassName="role-permissions-heading"
        gridClassName="role-permission-options"
      />
    </Modal>
  );
}
