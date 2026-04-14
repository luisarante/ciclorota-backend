import type { AdminCheckpoint, AdminCheckpointInput } from '@ciclorota/shared';
import type { CheckpointFormState, UserDraftState } from '../types/admin';

export const DEFAULT_PAGE_SIZE = 8;
export const DIRECTORY_USERS_LIMIT = 100;
export const DIRECTORY_CHECKPOINTS_LIMIT = 250;
export const OVERVIEW_CERTIFICATES_LIMIT = 5;

export function createEmptyUserDraft(): UserDraftState {
  return {
    full_name: '',
    avatar_url: '',
    role: 'user'
  };
}

export function createEmptyCheckpointForm(): CheckpointFormState {
  return {
    name: '',
    description: '',
    qr_code: '',
    latitude: '',
    longitude: '',
    order: '',
    map: ''
  };
}

export function toCheckpointForm(checkpoint: AdminCheckpoint): CheckpointFormState {
  return {
    name: checkpoint.name,
    description: checkpoint.description,
    qr_code: checkpoint.qr_code,
    latitude: String(checkpoint.latitude),
    longitude: String(checkpoint.longitude),
    order: String(checkpoint.order),
    map: checkpoint.map ?? ''
  };
}

export function toCheckpointPayload(form: CheckpointFormState): AdminCheckpointInput {
  const name = form.name.trim();
  const description = form.description.trim();
  const qrCode = form.qr_code.trim();
  const map = form.map.trim();
  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  const order = Number(form.order);

  if (!name || !description || !qrCode) {
    throw new Error('Nome, descricao e QR code sao obrigatorios.');
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error('Latitude e longitude precisam ser numericas.');
  }

  if (!Number.isInteger(order) || order <= 0) {
    throw new Error('A ordem precisa ser um numero inteiro positivo.');
  }

  return {
    name,
    description,
    qr_code: qrCode,
    latitude,
    longitude,
    order,
    map: map || null
  };
}
