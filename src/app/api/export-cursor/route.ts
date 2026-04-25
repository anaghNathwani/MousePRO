import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import {
  exportToCSS,
  exportToMousecape,
  exportToWindowsCur,
  exportToX11Info,
  exportToSVGCursor,
  generateReadme,
} from '@/lib/cursorFormats';
import type { CursorProject } from '@/lib/store';

type ExportFormat = 'zip' | 'cape' | 'cur' | 'css' | 'svg';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { project: CursorProject; format: ExportFormat };
    const { project, format } = body;

    if (!project || !format) {
      return NextResponse.json({ error: 'Missing project or format' }, { status: 400 });
    }

    const safeName = project.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();

    if (format === 'css') {
      const css = exportToCSS(project);
      return new NextResponse(css, {
        headers: {
          'Content-Type': 'text/css',
          'Content-Disposition': `attachment; filename="${safeName}.css"`,
        },
      });
    }

    if (format === 'cape') {
      const cape = exportToMousecape(project);
      return new NextResponse(cape, {
        headers: {
          'Content-Type': 'application/xml',
          'Content-Disposition': `attachment; filename="${safeName}.cape"`,
        },
      });
    }

    if (format === 'cur') {
      const cur = exportToWindowsCur(project);
      return new NextResponse(new Uint8Array(cur), {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${safeName}.cur"`,
        },
      });
    }

    if (format === 'svg') {
      const svg = exportToSVGCursor(project);
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `attachment; filename="${safeName}.svg"`,
        },
      });
    }

    // format === 'zip' — complete package
    const zip = new JSZip();
    const folder = zip.folder(safeName)!;

    // Add all PNG sizes
    for (const sz of project.sizes) {
      const buf = Buffer.from(sz.data, 'base64');
      folder.file(`cursor-${sz.size}.png`, buf);
    }

    // Add animation frames
    if (project.isAnimated && project.frames.length > 0) {
      const framesFolder = folder.folder('frames')!;
      project.frames.forEach((frame, i) => {
        framesFolder.file(`frame-${String(i).padStart(3, '0')}.png`, Buffer.from(frame, 'base64'));
      });
    }

    // Add Windows .cur
    folder.file(`${safeName}.cur`, exportToWindowsCur(project));

    // Add macOS .cape
    folder.file(`${safeName}.cape`, exportToMousecape(project));

    // Add CSS
    folder.file(`${safeName}.css`, exportToCSS(project));

    // Add SVG
    folder.file(`${safeName}.svg`, exportToSVGCursor(project));

    // Add X11 info
    folder.file('x11-info.txt', exportToX11Info(project));

    // Add README
    folder.file('README.md', generateReadme(project));

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 },
    });

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${safeName}-cursor-pack.zip"`,
      },
    });
  } catch (err) {
    console.error('export-cursor error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
