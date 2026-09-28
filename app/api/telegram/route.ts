import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

async function reply(chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text }),
  });
}

export async function POST(req: NextRequest) {
  if (req.nextUrl.searchParams.get('secret') !== process.env.TELEGRAM_WEBHOOK_SECRET) return new NextResponse('forbidden', { status: 403 });
  const update = await req.json();
  const message = update.message;
  if (!message?.from) return NextResponse.json({ ok: true });
  const telegramId = String(message.from.id);
  const chatId = String(message.chat.id);
  const supabase = db();
  const { data: employee } = await supabase.from('employees').select('*').eq('telegram_user_id', telegramId).maybeSingle();
  if (message.text === '/start') {
    const text = employee ? 'Connected. Submit a sale with /sale REF | CUSTOMER | A|B | DESCRIPTION | AMOUNT | RICHARD | ANASTASIA | JEAN-CLAUDE or an expense with /expense REF | DESCRIPTION | CATEGORY | AMOUNT | A|B|Company overhead.' : `Your Telegram ID is ${telegramId}. Ask Svetlana to link it in Manager setup.`;
    await reply(chatId, text);
    return NextResponse.json({ ok: true });
  }
  if (!employee) return NextResponse.json({ ok: true });
  const [command, ...bits] = String(message.text || '').split(' ');
  const values = bits.join(' ').split('|').map((value: string) => value.trim());
  let payload: any = { submitter_id: employee.id, chat_id: chatId };
  if (command === '/sale' && values.length === 8) payload = { ...payload, kind: 'sale', reference: values[0], customer: values[1], project: values[2], description: values[3], amount: values[4], richard: values[5], anastasia: values[6], jean_claude: values[7] };
  else if (command === '/expense' && values.length === 5) payload = { ...payload, kind: 'expense', reference: values[0], description: values[1], category: values[2], amount: values[3], allocation: values[4] };
  else return NextResponse.json({ ok: true });
  const result = await fetch(new URL('/api/transactions', req.url), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await result.json();
  await reply(chatId, data.error ? `Not recorded: ${data.error}` : `Recorded ${data.reference}: €${data.amount}; ${data.kind === 'sale' ? 'Pending approval' : data.status === 'recorded_overhead' ? 'Company overhead recorded' : 'Awaiting allocation'}.`);
  return NextResponse.json({ ok: true });
}
