import { supabase } from '../config/supabase.js';

export class CheckpointService {
  async getAllCheckpoints() {
    const { data, error } = await supabase
      .from('checkpoints')
      .select('id, name, description, latitude, longitude')
      .order('order', { ascending: true });

    if (error) throw new Error('Erro ao buscar checkpoints.');
    return data;
  }
}