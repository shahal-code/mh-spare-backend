import connectDB from "./config/db.js";
import Product from "./models/productModel.js";

connectDB().then(async () => {
    await Product.updateMany({ approvalStatus: 'pending' }, { $set: { approvalStatus: 'approved' } });
    console.log('Products updated');
    process.exit(0);
}).catch(console.error);
