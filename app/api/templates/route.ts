import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import MessageTemplate from '@/models/MessageTemplate';

// GET — fetch all templates sorted by order
export async function GET(req: NextRequest) {
  if (!getUserFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const templates = await MessageTemplate.find().sort({ order: 1, createdAt: 1 }).lean();
  return NextResponse.json({ templates });
}

// POST — create new template
export async function POST(req: NextRequest) {
  if (!getUserFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { title, body } = await req.json();
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
  }
  // Put new template at the end
  const last = await MessageTemplate.findOne().sort({ order: -1 }).lean() as any;
  const order = last ? last.order + 1 : 0;
  const template = await MessageTemplate.create({ title: title.trim(), body: body.trim(), order });
  return NextResponse.json({ template });
}

// PUT — update a template or reorder all
export async function PUT(req: NextRequest) {
  if (!getUserFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const body = await req.json();

  // Bulk reorder: [{ _id, order }, ...]
  if (body.reorder) {
    await Promise.all(
      body.reorder.map(({ _id, order }: { _id: string; order: number }) =>
        MessageTemplate.findByIdAndUpdate(_id, { order })
      )
    );
    return NextResponse.json({ success: true });
  }

  // Single update
  const { _id, title, body: msgBody } = body;
  if (!_id) return NextResponse.json({ error: '_id required' }, { status: 400 });
  const updated = await MessageTemplate.findByIdAndUpdate(
    _id,
    { title: title?.trim(), body: msgBody?.trim() },
    { new: true }
  );
  return NextResponse.json({ template: updated });
}

// DELETE — delete a template
export async function DELETE(req: NextRequest) {
  if (!getUserFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await MessageTemplate.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
