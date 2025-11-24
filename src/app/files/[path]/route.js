import fs from 'fs'
import { stat } from 'fs/promises';
import { NextResponse } from 'next/server';
import path from 'path';
import mime from 'mime-types';

export const GET = async(req, ctx) => {
  const { path: fileName } = await ctx.params;

  const filePath = path.join(process.env.FILE_UPLOAD_PATH, fileName);
  const stream = fs.createReadStream(filePath)

  const ext = path.extname(fileName);

  const mimeType = mime.lookup(ext);
  const { size } = await stat(filePath);

  return new NextResponse(stream, { status: 200, statusText: 'OK', headers: { 'Content-Type': mimeType, 'Content-Length': size } })
}
