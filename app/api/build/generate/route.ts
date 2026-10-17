import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { enforceRateLimit, getClientIdentifier } from '../../../rate-limit';

export const runtime = 'nodejs';

const safeName = (s: string) =>
  s
    .replace(/[^a-z0-9-_]/gi, '-')
    .toLowerCase()
    .slice(0, 48) || 'eyegambia-app';

export async function POST(req: Request) {
  const rl = await enforceRateLimit(
    getClientIdentifier(req),
    5
  );

  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(
            Math.max(
              1,
              Math.ceil((rl.reset - Date.now()) / 1000)
            )
          ),
        },
      }
    );
  }

  try {
    const body = await req.json();

    const title =
      typeof body?.title === 'string'
        ? body.title
        : 'eyegambia-app';

    const files = body?.files;

    const name = safeName(title);
    const zip = new JSZip();

    // package.json
    zip.file(
      `${name}/package.json`,
      JSON.stringify(
        {
          name,
          version: '0.1.0',
          private: true,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
          },
        },
        null,
        2
      )
    );

    // Add requested files
    if (files && typeof files === 'object' && !Array.isArray(files)) {
      for (const [filePath, content] of Object.entries(
        files as Record<string, unknown>
      )) {
        if (typeof content !== 'string') {
          continue;
        }

        // Prevent path traversal
        const cleanPath = filePath
          .replace(/\\/g, '/')
          .replace(/^\/+/, '');

        if (
          cleanPath.includes('../') ||
          cleanPath === '..' ||
          cleanPath.includes('/..')
        ) {
          continue;
        }

        zip.file(`${name}/${cleanPath}`, content);
      }
    }

    const data = await zip.generateAsync({ type: 'arraybuffer' });

return new NextResponse(data, {
  headers: {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${name}.zip"`,
  },
});

  } catch (e: unknown) {
    console.error('ZIP generation failed:', e);

    const message =
      e instanceof Error
        ? e.message
        : 'Failed to generate ZIP';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}