// src/app/api/update-password/route.ts

import { NextRequest, NextResponse } from 'next/server';
import supadata from '@/app/lib/supabaseclient';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { newPassword, userId } = body;

  if (!newPassword || !userId) {
    return NextResponse.json({ error: 'Missing newPassword or userId' }, { status: 400 });
  }

  const { error } = await supadata
    .from('Users_Accounts')
    .update({ password: newPassword }) // Plaintext for testing only
    .eq('userId', userId);

  if (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Password updated successfully' }, { status: 200 });
}
