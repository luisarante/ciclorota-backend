import { supabase } from '../config/supabase.js';

export class ProgressService {
  async getUserProgress(userId: string) {
    const { data, error } = await supabase
      .from('checkins')
      .select(`
        id,
        scanned_at,
        checkpoints (
          id,
          name,
          description,
          qr_code
        )
      `)
      .eq('user_id', userId);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}