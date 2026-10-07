import { supabase } from '@/lib/supabase';

export type ActionType =
  | 'manual_booking_created'
  | 'payment_status_changed'
  | 'booking_status_changed'
  | 'room_updated'
  | 'price_override_created'
  | 'price_override_deleted'
  | 'photo_uploaded'
  | 'photo_deleted'
  | 'booking_deleted';

export type EntityType = 'booking' | 'room' | 'price_override' | 'photo';

export interface ActivityEntry {
  id: string;
  actor_id: string;
  actor_email: string;
  actor_role: string;
  action_type: ActionType;
  entity_type: EntityType;
  entity_id: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface Actor {
  id: string;
  email: string;
  role: string;
}

export async function logActivity(
  actor: Actor | null,
  actionType: ActionType,
  entityType: EntityType,
  description: string,
  entityId?: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!actor) return;

  await supabase.from('activity_log').insert({
    actor_id: actor.id,
    actor_email: actor.email,
    actor_role: actor.role,
    action_type: actionType,
    entity_type: entityType,
    entity_id: entityId ?? null,
    description,
    metadata: metadata ?? null,
  });
}

export async function fetchActivityLog(actorId?: string): Promise<ActivityEntry[]> {
  let query = supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (actorId) {
    query = query.eq('actor_id', actorId);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data as ActivityEntry[];
}
