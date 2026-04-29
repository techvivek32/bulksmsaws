import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = 'mongodb+srv://Vercel-Admin-atlas-celeste-drum:Wp7zT4WwKyTsJgIG@atlas-celeste-drum.qeqss1f.mongodb.net/?retryWrites=true&w=majority';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['master_admin', 'admin'], default: 'admin' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const users = [
  { email: 'master@aws.com', password: 'master123', role: 'master_admin' },
  { email: 'admin@aws.com',  password: 'admin123',  role: 'admin' },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 12);
    const existing = await User.findOne({ email: u.email });
    if (existing) {
      existing.password = hashed;
      existing.role = u.role;
      await existing.save();
      console.log(`Updated: ${u.email} (${u.role})`);
    } else {
      await User.create({ email: u.email, password: hashed, role: u.role });
      console.log(`Created: ${u.email} (${u.role})`);
    }
  }

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => { console.error(err); process.exit(1); });
