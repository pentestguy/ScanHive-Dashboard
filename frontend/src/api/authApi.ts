import { apiClient } from "./client";

import type {
  AcceptInvitationRequest,
  InvitationPreview,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from "../types/auth";

export async function login(
  request: LoginRequest,
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(
    "/api/v1/auth/login",
    {
      email: request.email,
      password: request.password,
    },
  );

  return response.data;
}

export async function register(
  request: RegisterRequest,
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(
    "/api/v1/auth/register",
    request,
  );

  return response.data;
}

export async function getInvitationPreview(token: string): Promise<InvitationPreview> {
  const response = await apiClient.get<InvitationPreview>(
    `/api/v1/auth/invitations/${encodeURIComponent(token)}`,
  );
  return response.data;
}

export async function acceptInvitation(
  token: string,
  request: AcceptInvitationRequest,
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(
    `/api/v1/auth/invitations/${encodeURIComponent(token)}/accept`,
    request,
  );
  return response.data;
}
