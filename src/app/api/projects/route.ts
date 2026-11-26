import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { migrateProject } from '@/domain';
import {
  isCloudConfigured,
  listProjectsCloud,
  saveProjectCloud,
} from '@/services/supabaseClient';

export async function GET() {
  const cloudConfigured = isCloudConfigured();

  if (!cloudConfigured) {
    return NextResponse.json({
      cloudConfigured: false,
      mode: 'local-only',
      projects: [],
    });
  }

  const result = await listProjectsCloud();
  if (!result.ok) {
    return NextResponse.json(
      {
        cloudConfigured: true,
        mode: 'cloud',
        projects: [],
        error: result.error,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    cloudConfigured: true,
    mode: 'cloud',
    projects: result.data,
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Malformed JSON request body.' },
      { status: 400 },
    );
  }

  try {
    const project = migrateProject(body);
    const cloudConfigured = isCloudConfigured();

    if (cloudConfigured) {
      const saved = await saveProjectCloud(project);
      if (!saved.ok) {
        return NextResponse.json(
          {
            ok: false,
            cloudConfigured: true,
            error: saved.error,
          },
          { status: 502 },
        );
      }

      return NextResponse.json({
        ok: true,
        cloudConfigured: true,
        cloudSaved: true,
        project,
      });
    }

    return NextResponse.json({
      ok: true,
      cloudConfigured: false,
      cloudSaved: false,
      project,
    });
  } catch (err) {
    const message =
      err instanceof ZodError
        ? err.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`).join('; ')
        : err instanceof Error
          ? err.message
          : 'Invalid project payload.';

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
