import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import ChatFilter from '@/models/ChatFilter';

// GET — all filters
export async function GET(req: NextRequest) {
  if (!getUserFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const filters = await ChatFilter.find().sort({ order: 1, createdAt: 1 }).lean();
  return NextResponse.json({ filters });
}

// POST — create filter
export async function POST(req: NextRequest) {
  if (!getUserFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { name, color } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const last = await ChatFilter.findOne().sort({ order: -1 }).lean() as any;
  const order = last ? last.order + 1 : 0;
  const filter = await ChatFilter.create({ name: name.trim(), color: color || 'blue', order });
  return NextResponse.json({ filter });
}

// PUT — add/remove phone from filter OR rename
export async function PUT(req: NextRequest) {
  if (!getUserFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const body = await req.json();

  // Add phone to filter (remove from all other filters first — one filter per chat)
  if (body.action === 'add') {
    // Remove this phone from all other filters first
    await ChatFilter.updateMany(
      { _id: { $ne: body._id }, phones: body.phone },
      { $pull: { phones: body.phone } }
    );
    // Add to the selected filter
    const filter = await ChatFilter.findByIdAndUpdate(
      body._id,
      { $addToSet: { phones: body.phone } },
      { new: true }
    );
    // Return all filters so client can update state
    const allFilters = await ChatFilter.find().sort({ order: 1 }).lean();
    return NextResponse.json({ filter, allFilters });
  }

  // Remove phone from filter
  if (body.action === 'remove') {
    const filter = await ChatFilter.findByIdAndUpdate(
      body._id,
      { $pull: { phones: body.phone } },
      { new: true }
    );
    return NextResponse.json({ filter });
  }

  // Rename / recolor
  if (body.action === 'update') {
    const filter = await ChatFilter.findByIdAndUpdate(
      body._id,
      { name: body.name?.trim(), color: body.color },
      { new: true }
    );
    return NextResponse.json({ filter });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// DELETE — delete filter
export async function DELETE(req: NextRequest) {
  if (!getUserFromRequest(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await ChatFilter.findByIdAndDelete(id);
  return NextResponse.json({ success: true });
}
