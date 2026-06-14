"use client";

import { useState } from "react";
import type {
  UserListItem,
} from "@/types/user";

/**
 * UsersScreen'deki 8 modal/dialog + tetiklenen "pulse" state'lerini tek noktada toplar.
 * SRP: state container. Aç/kapa helper'ları sade — orchestrator hâlâ alanları okur,
 * sadece destructure yoğunluğu azalır.
 */
export type RoleEditorState = {
  user: UserListItem;
  draftRoles: Set<string>;
  draftPersonnelId: string;
  draftUnlinkPersonnel: boolean;
};

export type PersonnelLinkDialogState = {
  user: UserListItem;
  draftPersonnelId: string;
};

export type AccountStatusDialogState = {
  target: UserListItem;
  wantActive: boolean;
};

export type MfaToggleDialogState = {
  target: UserListItem;
  wantEnabled: boolean;
};

export type EditDialogState = {
  target: UserListItem;
  username: string;
  fullName: string;
  email: string;
  newPassword: string;
};

export function useUsersDialogs() {
  const [modalOpen, setModalOpen] = useState(false);
  const [pulseUserId, setPulseUserId] = useState<number | null>(null);
  const [permissionsModalUser, setPermissionsModalUser] = useState<UserListItem | null>(null);
  const [scopesModalUser, setScopesModalUser] = useState<UserListItem | null>(null);
  const [roleEditor, setRoleEditor] = useState<RoleEditorState | null>(null);
  const [personnelLinkDialog, setPersonnelLinkDialog] = useState<PersonnelLinkDialogState | null>(
    null
  );
  const [accountStatusDialog, setAccountStatusDialog] = useState<AccountStatusDialogState | null>(
    null
  );
  const [deleteDialog, setDeleteDialog] = useState<{ target: UserListItem } | null>(null);
  const [mfaToggleDialog, setMfaToggleDialog] = useState<MfaToggleDialogState | null>(null);
  const [editDialog, setEditDialog] = useState<EditDialogState | null>(null);

  return {
    modalOpen,
    setModalOpen,
    pulseUserId,
    setPulseUserId,
    permissionsModalUser,
    setPermissionsModalUser,
    scopesModalUser,
    setScopesModalUser,
    roleEditor,
    setRoleEditor,
    personnelLinkDialog,
    setPersonnelLinkDialog,
    accountStatusDialog,
    setAccountStatusDialog,
    deleteDialog,
    setDeleteDialog,
    mfaToggleDialog,
    setMfaToggleDialog,
    editDialog,
    setEditDialog,
  };
}
