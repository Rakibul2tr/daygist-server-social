import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // যেমন: 'order_id'
  seq: { type: Number, default: 100 }, // আপনার সিরিয়াল ১০০ বা ১০১ থেকে শুরু হবে
});

const Counter =
  mongoose.models.Counter || mongoose.model("Counter", CounterSchema);

export default Counter;
