import mongoose from "mongoose"

const connectDB = async () => {

  try {

    await mongoose.connect(process.env.MONGO_URI ||"mongodb://127.0.0.1:27017/techkart")

    console.log("MongoDB Connected")

  } catch (error) {

    console.error(error)
    process.exit(1)    //stop the node js server 

  }

}

export default connectDB