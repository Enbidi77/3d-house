import { NextResponse } from 'next/server';
import { isCloudConfigured } from '@/services/supabaseClient';

export async function GET() {
  const cloudConfigured = isCloudConfigured();

  return NextResponse.json({
    status: 'ok',
    service: '3d-house-simul',
    version: 1,
    cloudConfigured,
    mode: cloudConfigured ? 'cloud' : 'local-only',
    timestamp: new Date().toISOString(),
  });
}
