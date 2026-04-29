import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Atlas MongoDB URI
const MONGODB_URI = 'mongodb+srv://Vercel-Admin-atlas-celeste-drum:Wp7zT4WwKyTsJgIG@atlas-celeste-drum.qeqss1f.mongodb.net/?retryWrites=true&w=majority';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  const email = 'admin@aws.com';
  const password = 'admin123';

  const existing = await User.findOne({ email });
  if (existing) {
    existing.password = await bcrypt.hash(password, 12);
    await existing.save();
    console.log('Admin password updated:', email);
  } else {
    const hashed = await bcrypt.hash(password, 12);
    await User.create({ email, password: hashed });
    console.log('Admin created:', email);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => { console.error(err); process.exit(1); });
