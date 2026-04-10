import { supabaseAdmin } from '../config/supabase.js';
import { HttpError } from '../utils/httpError.js';

interface CheckinInput {
  user_id: string;
  checkpoint_id: string;
  scanned_at: string;
}

interface UserCheckinInput {
  checkpoint_id: string;
  scanned_at: string;
}

export class CheckinService {
  async createCheckins(checkins: CheckinInput[]) {
    for (const checkin of checkins) {
      if (!checkin.user_id || !checkin.checkpoint_id || !checkin.scanned_at) {
        throw new Error('Todos os check-ins precisam informar checkpoint_id e scanned_at válidos.');
      }
    }

    const checkpointReferences = checkins.map((checkin) => checkin.checkpoint_id);

    const { data: checkpointsData, error: fetchError } = await supabaseAdmin
      .from('checkpoints')
      .select('id, qr_code')
      .or(buildCheckpointLookupFilter(checkpointReferences));

    if (fetchError) {
      throw new Error('Erro ao buscar os pontos da trilha no banco.');
    }

    const checkinsToInsert = checkins.map((checkin) => {
      const checkpointFound = checkpointsData?.find(
        (checkpoint) => checkpoint.id === checkin.checkpoint_id || checkpoint.qr_code === checkin.checkpoint_id
      );

      if (!checkpointFound) {
        throw new Error(`Checkpoint não reconhecido pelo sistema: ${checkin.checkpoint_id}`);
      }

      return {
        user_id: checkin.user_id,
        checkpoint_id: checkpointFound.id,
        scanned_at: checkin.scanned_at
      };
    });

    const repeatedCheckpointIds = findRepeatedCheckpointIds(checkinsToInsert.map((checkin) => checkin.checkpoint_id));

    if (repeatedCheckpointIds.length > 0) {
      throw new HttpError(409, 'O mesmo checkpoint foi enviado mais de uma vez na mesma sincronização.');
    }

    const { data, error } = await supabaseAdmin
      .from('checkins')
      .insert(checkinsToInsert)
      .select();

    if (error) {
      throw error;
    }

    return data;
  }

  async createCheckinsForUser(userId: string, checkins: UserCheckinInput[]) {
    return this.createCheckins(
      checkins.map((checkin) => ({
        user_id: userId,
        checkpoint_id: checkin.checkpoint_id,
        scanned_at: checkin.scanned_at
      }))
    );
  }
}

function buildCheckpointLookupFilter(references: string[]) {
  const escapedReferences = references
    .filter((reference) => typeof reference === 'string' && reference.length > 0)
    .map((reference) => reference.replace(/,/g, '\\,'));

  return [
    `id.in.(${escapedReferences.join(',')})`,
    `qr_code.in.(${escapedReferences.join(',')})`
  ].join(',');
}

function findRepeatedCheckpointIds(checkpointIds: string[]) {
  const seenIds = new Set<string>();
  const repeatedIds = new Set<string>();

  for (const checkpointId of checkpointIds) {
    if (seenIds.has(checkpointId)) {
      repeatedIds.add(checkpointId);
      continue;
    }

    seenIds.add(checkpointId);
  }

  return [...repeatedIds];
}
