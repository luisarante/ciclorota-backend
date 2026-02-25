import { supabase } from '../config/supabase.js';

export class CheckinService {
  async createCheckins(checkins: any[]) {
    
    const qrCodes = checkins.map(c => c.checkpoint_id);

    const { data: checkpointsData, error: fetchError } = await supabase
      .from('checkpoints')
      .select('id, qr_code')
      .in('qr_code', qrCodes);

    if (fetchError) throw new Error('Erro ao buscar os pontos da trilha no banco.');

    const checkinsToInsert = checkins.map(checkin => {
      const checkpointEncontrado = checkpointsData?.find(cp => cp.qr_code === checkin.checkpoint_id);
      
      if (!checkpointEncontrado) {
        throw new Error(`QR Code não reconhecido pelo sistema: ${checkin.checkpoint_id}`);
      }

      return {
        user_id: checkin.user_id,
        checkpoint_id: checkpointEncontrado.id,
        scanned_at: checkin.scanned_at
      };
    });

    const { data, error } = await supabase
      .from('checkins')
      .insert(checkinsToInsert)
      .select();

    if (error) {
      throw error;
    }

    return data;
  }
}