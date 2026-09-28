import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';
import { syncRow } from '@/lib/sheets';
import { notify } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  try {
    const { id, kind } = await req.json();
    const supabase = db();
    const { data: transaction, error } = await supabase.from('transactions').select('*,submitter:employees!transactions_submitter_id_fkey(name)').eq('id', id).single();
    if (error) throw error;
    if (kind === 'sync') {
      await syncRow(transaction);
      await supabase.from('transactions').update({ sync_status: 'synced' }).eq('id', id);
    } else {
      await notify(transaction);
      await supabase.from('transactions').update({ notification_status: 'sent' }).eq('id', id);
    }
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
