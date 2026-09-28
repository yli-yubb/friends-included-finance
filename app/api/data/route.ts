import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const supabase = db();
    const { data: people, error: peopleError } = await supabase.from('employees').select('*').order('name');
    if (peopleError) throw new Error(`Unable to read employees: ${peopleError.message}`);

    const viewerId = req.nextUrl.searchParams.get('viewer_id');
    const viewer = people?.find((person) => person.id === viewerId);
    let rows: unknown[] = [];
    if (viewer) {
      let query = supabase.from('transactions').select('*,submitter:employees!transactions_submitter_id_fkey(name)').order('submitted_at');
      if (viewer.role !== 'manager') query = query.eq('submitter_id', viewer.id);
      const { data, error } = await query;
      if (error) throw new Error(`Unable to read transactions: ${error.message}`);
      rows = data ?? [];
    }

    const safePeople = viewer?.role === 'manager'
      ? people ?? []
      : (people ?? []).map(({ id, name, role }) => ({ id, name, role }));
    return NextResponse.json({ employees: safePeople, rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load data.';
    console.error('GET /api/data failed', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
