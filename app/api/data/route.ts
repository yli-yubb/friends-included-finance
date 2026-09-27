import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

export async function GET() {
  try {
    const s = db();
    const [people, transactions] = await Promise.all([
      s.from('employees').select('*').order('name'),
      s.from('transactions').select('*,submitter:employees(name)').order('submitted_at'),
    ]);
    if (people.error) throw new Error(`Unable to read employees: ${people.error.message}`);
    if (transactions.error) throw new Error(`Unable to read transactions: ${transactions.error.message}`);
    return NextResponse.json({ employees: people.data ?? [], rows: transactions.data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load data.';
    console.error('GET /api/data failed', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
