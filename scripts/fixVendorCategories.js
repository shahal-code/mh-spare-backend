import 'dotenv/config';
import connectDB from '../config/db.js';
import Category from '../models/categoryModel.js';
import Admin from '../models/adminModel.js';

async function fixVendorCategories() {
  await connectDB();
  const vendors = await Admin.find({ role: { $ne: 'owner' } }).select('_id');
  const vendorIds = vendors.map(v => v._id);
  const result = await Category.updateMany(
    { createdBy: { $in: vendorIds } },
    { $set: { approvalStatus: 'pending' } }
  );
  console.log('Fixed vendor category statuses:', result);
  process.exit(0);
}

fixVendorCategories();
