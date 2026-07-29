import mongoose from "mongoose"

const connectDB = async () => {

  try {

    mongoose.connection.on('connected', () => console.log('MongoDB connection established successfully'));
    mongoose.connection.on('error', (err) => console.error('MongoDB connection error:', err));
    mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/techkart")
    console.log("MongoDB Connected Successfully!")
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error)
    process.exit(1)    //stop the node js server 
  }

}

export default connectDB