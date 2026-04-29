import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import SMS from '@/models/SMS';
import * as XLSX from 'xlsx';

export async function POST(req: NextRequest) {
  if (!getUserFromRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const campaign = (formData.get('campaign') as string) || '';

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Helper: find a column value case-insensitively
    const getCol = (row: any, name: string): string => {
      const key = Object.keys(row).find((k) => k.trim().toLowerCase() === name.toLowerCase());
      return key ? String(row[key] || '').trim() : '';
    };

    // Helper: normalize phone to E.164 format (+1XXXXXXXXXX for US numbers)
    const normalizePhone = (raw: string): string => {
      // Strip everything except digits and leading +
      const digits = raw.replace(/\D/g, '');
      if (!digits) return '';
      // If 10 digits assume US number → prepend +1
      if (digits.length === 10) return `+1${digits}`;
      // If 11 digits starting with 1 → prepend +
      if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
      // Already has country code
      if (digits.length > 11) return `+${digits}`;
      return `+${digits}`;
    };

    // Parse patient-specific columns from the Excel file
    const parsed = rows
      .map((row) => {
        const firstName  = getCol(row, 'Patient First Name');
        const middleInit = getCol(row, 'Patient Middle Initial');
        const lastName   = getCol(row, 'Patient Last Name');
        const cellPhone  = getCol(row, 'Patient Cell Phone');
        const workPhone  = getCol(row, 'Patient Work Phone');
        const email      = getCol(row, 'Patient Email');

        // Merge name parts, skip empty middle initial
        const patientName = [firstName, middleInit, lastName].filter(Boolean).join(' ');

        // Prefer cell phone, fall back to work phone — normalize to E.164
        const rawPhone = cellPhone || workPhone;
        const phone = normalizePhone(rawPhone);

        return { patientName, phone, email };
      })
      .filter((r) => r.phone);

    if (!parsed.length) {
      return NextResponse.json({
        error: 'No valid rows found. Required columns: "Patient First Name", "Patient Last Name", "Patient Cell Phone" (or "Patient Work Phone")',
      }, { status: 400 });
    }

    // Deduplicate by phone number
    const seen = new Set<string>();
    const unique = parsed.filter((r) => {
      if (seen.has(r.phone)) return false;
      seen.add(r.phone);
      return true;
    });

    // Return all rows for paginated preview (don't save yet)
    return NextResponse.json({
      preview: unique,
      total: unique.length,
      duplicatesRemoved: parsed.length - unique.length,
      rows: unique,
      campaign,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
